import csv
import io
from datetime import datetime
from django.db import transaction
from django.db.models import Sum, Q
from rest_framework.exceptions import ValidationError
from apps.api.utils import parse_date_range_strings
from apps.permits.models import PermitApplication, TransportOrigin
from .models import Barangay, HogSurvey

class HogSurveyService:
    # Returns a tuple: (number of records created, list of error messages).
    @staticmethod
    def import_csv(file_obj, barangay_restriction=None):
        try:
            # Reset pointer first in case it was already read
            file_obj.seek(0)
            # Handle Django uploaded file which might be open in binary mode
            content = file_obj.read()
            if isinstance(content, bytes):
                content = content.decode('utf-8')
            file_obj.seek(0)  # Reset pointer just in case
        except Exception as e:
            raise ValueError(f"Failed to read file: {str(e)}")

        reader = csv.DictReader(io.StringIO(content))
        if not reader.fieldnames:
            raise ValueError("CSV file is empty or headers are missing")

        # Strip spaces from column names to avoid key mismatch
        reader.fieldnames = [name.strip() for name in reader.fieldnames]

        required_columns = [
            'barangay', 'survey_date', 'inahin', 'barako', 
            'fattener', 'grower', 'starter', 'bulaw', 'total_pigs'
        ]
        
        if not all(col in reader.fieldnames for col in required_columns):
            missing = [col for col in required_columns if col not in reader.fieldnames]
            raise ValueError(f"Missing columns: {', '.join(missing)}")

        records_to_create = []
        records_to_update = []
        errors = []

        barangay_map = {b.name.lower(): b for b in Barangay.objects.all()}

        parsed_rows = []
        dates_in_csv = set()
        barangays_in_csv = set()

        for index, row in enumerate(reader):
            row_num = index + 2
            try:
                barangay_name = str(row.get('barangay', '')).strip()
                barangay = barangay_map.get(barangay_name.lower())
                
                if not barangay:
                    errors.append(f"Row {row_num}: Barangay '{barangay_name}' not found.")
                    continue

                if barangay_restriction and barangay != barangay_restriction:
                    errors.append(f"Row {row_num}: Barangay '{barangay_name}' is not your assigned barangay ({barangay_restriction.name}).")
                    continue

                date_str = str(row.get('survey_date', '')).strip()
                try:
                    # Handle full ISO timestamps (like 2024-01-01 00:00:00) by splitting
                    clean_date_str = date_str.split(' ')[0]
                    survey_date = datetime.strptime(clean_date_str, "%Y-%m-%d").date()
                except (ValueError, TypeError):
                    errors.append(f"Row {row_num}: Invalid date '{date_str}'.")
                    continue

                def safe_int(val):
                    if val is None or str(val).strip() == '':
                        return 0
                    try:
                        return int(float(val))  # handle float strings like "5.0"
                    except ValueError:
                        return 0

                def get_field(row_dict, *keys):
                    for k in keys:
                        if k in row_dict and row_dict[k] is not None:
                            return row_dict[k]
                    lower_dict = {str(k).lower().strip(): v for k, v in row_dict.items() if k}
                    for k in keys:
                        if k.lower() in lower_dict and lower_dict[k.lower()] is not None:
                            return lower_dict[k.lower()]
                    return ''

                farmer_name = str(get_field(row, 'farmer_name', 'farmer', 'owner_name', 'owner', 'Farmer Name', 'Farmer / Owner Name')).strip()
                contact_number = str(get_field(row, 'contact_number', 'contact_no', 'phone_no', 'cellphone_number', 'contact', 'Cellphone Number', 'Contact Number')).strip()

                inahin = safe_int(row.get('inahin'))
                barako = safe_int(row.get('barako'))
                fattener = safe_int(row.get('fattener'))
                grower = safe_int(row.get('grower'))
                starter = safe_int(row.get('starter'))
                bulaw = safe_int(row.get('bulaw'))

                total_pigs = safe_int(row.get('total_pigs'))
                calculated_total = inahin + barako + fattener + grower + starter + bulaw
                if total_pigs == 0 or total_pigs != calculated_total:
                    total_pigs = calculated_total

                parsed_rows.append({
                    'barangay': barangay,
                    'farmer_name': farmer_name,
                    'contact_number': contact_number,
                    'survey_date': survey_date,
                    'inahin': inahin,
                    'barako': barako,
                    'fattener': fattener,
                    'grower': grower,
                    'starter': starter,
                    'bulaw': bulaw,
                    'total_pigs': total_pigs,
                })
                dates_in_csv.add(survey_date)
                barangays_in_csv.add(barangay)
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")

        existing_surveys = HogSurvey.objects.filter(
            barangay__in=list(barangays_in_csv),
            survey_date__in=list(dates_in_csv)
        )
        existing_map = {
            (s.barangay_id, s.survey_date, (s.farmer_name or "").strip().lower()): s 
            for s in existing_surveys
        }

        for row in parsed_rows:
            key = (row['barangay'].id, row['survey_date'], row['farmer_name'].strip().lower())
            if key in existing_map:
                existing = existing_map[key]
                if row['farmer_name']:
                    existing.inahin = row['inahin']
                    existing.barako = row['barako']
                    existing.fattener = row['fattener']
                    existing.grower = row['grower']
                    existing.starter = row['starter']
                    existing.bulaw = row['bulaw']
                    existing.total_pigs = row['total_pigs']
                    if row['contact_number']:
                        existing.contact_number = row['contact_number']
                else:
                    existing.inahin += row['inahin']
                    existing.barako += row['barako']
                    existing.fattener += row['fattener']
                    existing.grower += row['grower']
                    existing.starter += row['starter']
                    existing.bulaw += row['bulaw']
                    existing.total_pigs += row['total_pigs']
                
                if existing not in records_to_update:
                    records_to_update.append(existing)
            else:
                new_record = HogSurvey(
                    barangay=row['barangay'],
                    farmer_name=row['farmer_name'],
                    contact_number=row['contact_number'],
                    survey_date=row['survey_date'],
                    inahin=row['inahin'],
                    barako=row['barako'],
                    fattener=row['fattener'],
                    grower=row['grower'],
                    starter=row['starter'],
                    bulaw=row['bulaw'],
                    total_pigs=row['total_pigs']
                )
                records_to_create.append(new_record)
                existing_map[key] = new_record  # Prevent adding duplicate new records in same file

        # Save to database
        if records_to_create or records_to_update:
            with transaction.atomic():
                if records_to_update:
                    HogSurvey.objects.bulk_update(
                        records_to_update, 
                        fields=['farmer_name', 'contact_number', 'inahin', 'barako', 'fattener', 'grower', 'starter', 'bulaw', 'total_pigs']
                    )
                if records_to_create:
                    HogSurvey.objects.bulk_create(records_to_create)

        return len(records_to_create) + len(records_to_update), errors

    @staticmethod
    def calculate_transport_volume():
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
    def get_aggregated_survey_data(target_month, start_month, end_month, target_season, target_year):
        """
        Aggregates pig population per barangay for heatmap.
        """
        queryset = HogSurvey.objects.all()

        # If no specific filters, we default to the latest year available
        if not any([target_month, start_month, target_season, target_year]):
            latest_survey = queryset.order_by("-survey_date").first()
            if latest_survey:
                target_year = latest_survey.survey_date.year

        current_queryset = queryset

        if target_year:
            current_queryset = current_queryset.filter(
                survey_date__year=int(target_year)
            )

        if target_month:
            current_queryset = current_queryset.filter(
                survey_date__month=int(target_month)
            )
        elif start_month and end_month:
            sm, em = int(start_month), int(end_month)
            if sm <= em:
                current_queryset = current_queryset.filter(
                    survey_date__month__range=(sm, em)
                )
            else:
                # Wrap around logic (e.g. Nov to Feb)
                current_queryset = current_queryset.filter(
                    Q(survey_date__month__gte=sm) | Q(survey_date__month__lte=em)
                )
        elif target_season:
            season = target_season.lower()
            if season == "wet":
                current_queryset = current_queryset.filter(
                    survey_date__month__in=[6, 7, 8, 9, 10, 11]
                )
            elif season == "dry":
                current_queryset = current_queryset.filter(
                    survey_date__month__in=[12, 1, 2, 3, 4, 5]
                )

        aggregated_data = current_queryset.values(
            "barangay__name", "barangay__latitude", "barangay__longitude"
        ).annotate(
            total_pigs_sum=Sum("total_pigs"),
            inahin_sum=Sum("inahin"),
            barako_sum=Sum("barako"),
            fattener_sum=Sum("fattener"),
            grower_sum=Sum("grower"),
            bulaw_sum=Sum("bulaw"),
            starter_sum=Sum("starter"),
        )

        heatmap_payload = []
        for entry in aggregated_data:
            pigs = int(entry["total_pigs_sum"] or 0)

            # Density Classification
            if pigs == 0:
                density = "None"
            elif pigs < 100:
                density = "Low"
            elif pigs < 500:
                density = "Medium"
            elif pigs < 1500:
                density = "High"
            else:
                density = "Very High"

            heatmap_payload.append(
                {
                    "barangay": entry["barangay__name"],
                    "latitude": entry["barangay__latitude"],
                    "longitude": entry["barangay__longitude"],
                    "total_pigs": pigs,
                    "density_level": density,
                    "breakdown": {
                        "inahin": int(entry["inahin_sum"] or 0),
                        "barako": int(entry["barako_sum"] or 0),
                        "fattener": int(entry["fattener_sum"] or 0),
                        "grower": int(entry["grower_sum"] or 0),
                        "bulaw": int(entry["bulaw_sum"] or 0),
                        "starter": int(entry["starter_sum"] or 0),
                    },
                    "trend": "stable",
                    "is_prediction": False,
                }
            )

        return heatmap_payload

