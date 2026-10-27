from django.db.models import Sum, Q
from apps.api.utils import parse_date_range_strings
from apps.permits.models import PermitApplication, TransportOrigin
from .models import Barangay, HogSurvey
from apps.api.cache_utils import get_or_set_cached_data

class HogSurveyService:
    @staticmethod
    def import_csv(file_obj, barangay_restriction=None):
        from .survey_import import import_surveys
        report = import_surveys(file_obj, barangay_restriction)
        return report["imported"], report["errors"]

    @staticmethod
    def _compute_transport_volume():
        """
        Calculates the total number of pigs being transported out of each barangay
        based on active/released permits.
        """
        # We only count origins of permits that have been issued and released
        # (PAYMENT_PENDING == issued but unpaid; RELEASED == fully cleared).
        active_origins = TransportOrigin.objects.filter(
            application__status__in=[
                PermitApplication.Status.PAYMENT_PENDING,
                PermitApplication.Status.RELEASED,
            ]
        ).values("barangay__name").annotate(
            total_transported=Sum("number_of_pigs")
        )

        # Convert volume_data to a dictionary for faster lookups
        volume_map = {
            v["barangay__name"]: v["total_transported"] for v in active_origins
        }

        volume_payload = []
        # Get all barangays to ensure we return 0 for those with no transport activity
        all_barangays = Barangay.objects.all()

        for b in all_barangays:
            total = volume_map.get(b.name, 0)

            # Classification for Transport Volume
            if total == 0:
                level = "Stable"
            elif total < 20:
                level = "Light"
            elif total < 100:
                level = "Moderate"
            elif total < 300:
                level = "Heavy"
            else:
                level = "Congested"

            volume_payload.append(
                {
                    "barangay": b.name,
                    "total_transported": total,
                    "volume_level": level,
                    "latitude": b.latitude,
                    "longitude": b.longitude,
                }
            )

        return volume_payload

    @staticmethod
    def calculate_transport_volume():
        return get_or_set_cached_data(
            "maps:transport_volume",
            HogSurveyService._compute_transport_volume,
            timeout=120,
        )

    @staticmethod
    def generate_export_csv_data(start_date_str, end_date_str):
        """
        Retrieves survey data and builds CSV rows list.
        """
        queryset = HogSurvey.objects.all().order_by("-survey_date")

        start_date, end_date = parse_date_range_strings(
            start_date_str, end_date_str, default_to_today=False
        )

        if start_date:
            queryset = queryset.filter(survey_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(survey_date__lte=end_date)

        rows = []
        for s in queryset:
            rows.append([
                s.barangay.name,
                s.survey_date,
                s.farmer_name or "",
                s.contact_number or "",
                s.inahin,
                s.barako,
                s.fattener,
                s.grower,
                s.bulaw,
                s.starter,
                s.total_pigs,
            ])
        return rows

    @staticmethod
    def get_aggregated_survey_data(target_month=None, start_month=None, end_month=None,
                                   target_season=None, target_year=None, compare_year=None,
                                   barangay_ids=None):
        from .census import census_rows, quarter_of
        from rest_framework.exceptions import ValidationError
        queryset = HogSurvey.objects.filter(survey_date__isnull=False)
        barangays = Barangay.objects.all()
        if barangay_ids is not None:
            barangays = barangays.filter(pk__in=barangay_ids)
        try:
            if target_month:
                month = int(target_month)
                if not 1 <= month <= 12:
                    raise ValueError
                queryset = queryset.filter(survey_date__month=month)
            elif start_month or end_month:
                sm, em = int(start_month), int(end_month)
                if not (1 <= sm <= 12 and 1 <= em <= 12):
                    raise ValueError
                queryset = queryset.filter(survey_date__month__range=(sm, em)) if sm <= em else queryset.filter(
                    Q(survey_date__month__gte=sm) | Q(survey_date__month__lte=em))
            elif target_season in ['wet', 'dry']:
                months = [6, 7, 8, 9, 10, 11] if target_season == 'wet' else [12, 1, 2, 3, 4, 5]
                queryset = queryset.filter(survey_date__month__in=months)
            elif target_season not in [None, '', 'all']:
                raise ValueError
            year = int(target_year) if target_year else None
            if year is not None and not 1 <= year <= 9999:
                raise ValueError
            if compare_year:
                other_year = int(compare_year)
                if not year or not 1 <= other_year <= 9999:
                    raise ValueError
                quarters = set(queryset.filter(survey_date__year=year).values_list('survey_date__quarter', flat=True))
                other = set(queryset.filter(survey_date__year=other_year).values_list('survey_date__quarter', flat=True))
                common = quarters & other
                period = (year, max(common)) if common else None
            else:
                selected = queryset.filter(survey_date__year=year) if year else queryset
                latest = selected.order_by('-survey_date').values_list('survey_date', flat=True).first()
                period = quarter_of(latest) if latest else None
        except (ValueError, TypeError):
            raise ValidationError('Invalid census calendar filters.') from None
        # Calendar filters select a quarter. All observations in that quarter count.
        observations = HogSurvey.objects.filter(survey_date__year=period[0], survey_date__quarter=period[1]) if period else []
        if period and barangay_ids is not None:
            observations = observations.filter(barangay_id__in=barangay_ids)
        return census_rows(observations, period, barangays)
