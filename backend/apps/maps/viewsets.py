from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from datetime import timedelta
from . import serializers
from . import models
from .services import HogSurveyService
from rest_framework.exceptions import ValidationError, PermissionDenied
import csv
from django.http import HttpResponse
from django.utils import timezone
from apps.api.models import AuditTrail
from apps.api.base import BaseModelViewSet


ACTIVE_THRESHOLD_DAYS = 180


class BarangayViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = models.Barangay.objects.all()
    pagination_class = None
    http_method_names = ["get", "head", "options"]

    def get_serializer_class(self):
        return serializers.BarangayListDetailSerializer

    @action(detail=False, methods=["get"])
    def transport_volume(self, request):
        """
        Calculates the total number of pigs being transported out of each barangay
        based on active/released permits.
        """
        volume_payload = HogSurveyService.calculate_transport_volume()
        return Response(volume_payload)



class HogSurveyViewSet(BaseModelViewSet):
    queryset = models.HogSurvey.objects.all()

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.user.role not in ["Admin", "Agri", "Barangay"]:
            raise PermissionDenied("Only survey staff can access hog surveys.")
        if request.user.role == "Barangay" and not request.user.barangay_id:
            raise PermissionDenied("A barangay assignment is required.")

    def get_queryset(self):
        user = self.request.user
        if user.role in ["Admin", "Agri"]:
            queryset = models.HogSurvey.objects.all()
        elif user.role == "Barangay":
            queryset = models.HogSurvey.objects.filter(barangay=user.barangay)
        else:
            # Farmers, Inspectors, and third parties cannot view citizen hog survey PII
            return models.HogSurvey.objects.none()

        farmer_name = self.request.query_params.get("farmer_name")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if farmer_name:
            from .census import normalize
            matching = [s.pk for s in queryset if normalize(farmer_name) in normalize(s.farmer_name)]
            queryset = queryset.filter(pk__in=matching)
        if date_from:
            queryset = queryset.filter(survey_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(survey_date__lte=date_to)

        return queryset

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return serializers.HogSurveyListDetailSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return serializers.HogSurveyWriteSerializer
        return serializers.HogSurveyListDetailSerializer  # safe fallback

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ["Admin", "Agri", "Barangay"]:
            raise PermissionDenied("Only Admin, Agri, and Barangay officials can submit hog surveys.")
        if user.role == "Barangay":
            barangay = serializer.validated_data.get('barangay')
            if barangay != user.barangay:
                raise ValidationError({"barangay": "You can only submit surveys for your own barangay."})
        survey = serializer.save()
        
        # Audit Log
        AuditTrail.objects.create(
            who_performed=user,
            what_performed=f"[HOG SURVEY ADDED] - Survey for Barangay {survey.barangay.name} (Total: {survey.total_pigs} pigs) submitted successfully.",
            when_performed=timezone.now()
        )

    def perform_update(self, serializer):
        user = self.request.user
        if user.role not in ["Admin", "Agri", "Barangay"]:
            raise PermissionDenied("Only Admin, Agri, and Barangay officials can edit hog surveys.")
        if user.role == "Barangay":
            barangay = serializer.validated_data.get('barangay')
            if barangay and barangay != user.barangay:
                raise ValidationError({"barangay": "You cannot change the barangay to another barangay."})
        survey = serializer.save()
        
        # Audit Log
        AuditTrail.objects.create(
            who_performed=user,
            what_performed=f"[HOG SURVEY UPDATED] - Survey for Barangay {survey.barangay.name} (Total: {survey.total_pigs} pigs) updated successfully.",
            when_performed=timezone.now()
        )

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role not in ["Admin", "Agri", "Barangay"]:
            raise PermissionDenied("Only Admin, Agri, and Barangay officials can delete hog surveys.")
        if user.role == "Barangay" and instance.barangay != user.barangay:
            raise PermissionDenied("You do not have permission to delete this survey.")
            
        barangay_name = instance.barangay.name
        total_pigs = instance.total_pigs
        instance.delete()
        
        # Audit Log
        AuditTrail.objects.create(
            who_performed=user,
            what_performed=f"[HOG SURVEY DELETED] - Survey for Barangay {barangay_name} (Total: {total_pigs} pigs) deleted successfully.",
            when_performed=timezone.now()
        )

    @action(detail=False, methods=["post"])
    def batch_create(self, request):
        """
        API Endpoint: POST /api/hog-survey/batch_create/
        Accepts a list of survey dictionaries for rapid multi-row batch manual encoding.
        """
        user = request.user
        if not user.is_authenticated or user.role not in ["Agri", "Barangay"]:
            return Response({"error": "Unauthorized"}, status=403)

        items = request.data.get("surveys")
        if items is None and isinstance(request.data, list):
            items = request.data
        if not isinstance(items, list) or len(items) == 0:
            return Response({"error": "A non-empty list of survey entries is required."}, status=400)

        target_barangay = user.barangay if user.role == "Barangay" else None
        records_to_create = []

        for idx, item in enumerate(items):
            row_num = idx + 1
            b_id = target_barangay.id if target_barangay else item.get("barangay")
            if not b_id:
                return Response({"error": f"Row {row_num}: Barangay is required."}, status=400)

            barangay_obj = target_barangay if target_barangay else models.Barangay.objects.filter(id=b_id).first()
            if not barangay_obj:
                return Response({"error": f"Row {row_num}: Barangay not found."}, status=400)

            s_date = item.get("survey_date")
            if not s_date:
                return Response({"error": f"Row {row_num}: Survey collection date is required."}, status=400)

            def safe_num(v):
                try:
                    return max(0, int(v or 0))
                except (ValueError, TypeError):
                    return 0

            values = {f: safe_num(item.get(f)) for f in models.HogSurvey.PIG_FIELDS}
            total_pigs = sum(values.values())

            farmer_name = str(item.get("farmer_name") or "").strip()
            contact_number = str(item.get("contact_number") or "").strip()

            if not farmer_name:
                return Response({"error": f"Row {row_num}: Farmer / Hog Owner name is required."}, status=400)

            if total_pigs <= 0:
                return Response({"error": f"Row {row_num} ({farmer_name}): Total pigs must be at least 1 across all categories."}, status=400)

            records_to_create.append(models.HogSurvey(
                barangay=barangay_obj,
                farmer_name=farmer_name,
                contact_number=contact_number,
                survey_date=s_date,
                **values,
                total_pigs=total_pigs,
            ))

        with transaction.atomic():
            created = models.HogSurvey.objects.bulk_create(records_to_create)
            from .survey_import import invalidate_surveys
            invalidate_surveys()

        b_name = target_barangay.name if target_barangay else "Assigned Barangay"
        AuditTrail.objects.create(
            who_performed=user,
            what_performed=f"[HOG SURVEY BATCH ENCODED] - Encoded {len(created)} surveys for Barangay {b_name}.",
            when_performed=timezone.now()
        )

        return Response(
            {
                "message": f"Successfully encoded {len(created)} survey records.",
                "count": len(created),
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"])
    def export_csv(self, request):
        """
        API Endpoint: GET /api/hog-survey/export_csv/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
        Exports survey data to a CSV file for official reporting with date range.
        """
        if request.user.role not in ["Admin", "Agri", "Barangay"]:
            return Response({"error": "Unauthorized"}, status=403)

        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        try:
            if request.user.role == "Barangay":
                # Only let them export their own barangay
                rows = HogSurveyService.generate_export_csv_data(start_date_str, end_date_str)
                # Filter rows to only matching barangay
                rows = [row for row in rows if row[0].lower() == request.user.barangay.name.lower()]
            else:
                rows = HogSurveyService.generate_export_csv_data(start_date_str, end_date_str)
        except ValidationError as e:
            return Response({"error": e.detail[0] if isinstance(e.detail, list) else e.detail}, status=400)

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="Sariaya_Hog_Population_Report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(
            [
                "Barangay",
                "Date",
                "Farmer Name",
                "Contact Number",
                "Inahin",
                "Barako",
                "Fattener",
                "Grower",
                "Bulaw",
                "Starter",
                "Total",
            ]
        )
        writer.writerows(rows)
        return response

    @action(detail=False, methods=["get"])
    def years(self, request):
        """
        API Endpoint: GET /api/hog-survey/years/
        Returns a list of unique years present in the survey data.
        """
        user = request.user
        queryset = self.get_queryset().filter(survey_date__isnull=False)
        if user.role == "Barangay":
            queryset = queryset.filter(barangay=user.barangay)
            
        years = (
            queryset.values_list("survey_date__year", flat=True)
            .distinct()
            .order_by("-survey_date__year")
        )
        return Response(list(years))

    def _farmer_distinct_queryset(self, request):
        user = request.user
        qs = models.HogSurvey.objects.filter(barangay=user.barangay) \
            if user.role == "Barangay" \
            else models.HogSurvey.objects.all()

        barangay_id = request.query_params.get("barangay")
        if user.role != "Barangay" and barangay_id:
            qs = qs.filter(barangay_id=barangay_id)

        return qs

    @action(detail=False, methods=["get"])
    def farmer_lookup(self, request):
        """
        API Endpoint: GET /api/hog-survey/farmer_lookup/?q=carlos
        Returns distinct farmers matching the query for autocomplete.
        """
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response([])

        cutoff = timezone.now().date() - timedelta(days=ACTIVE_THRESHOLD_DAYS)

        results = self._roster_rows(request, cutoff)
        from .census import normalize
        return Response(sorted(
            [row for row in results if normalize(q) in normalize(row["farmer_name"])],
            key=lambda row: row["last_survey_date"] or "", reverse=True,
        )[:10])

    def _roster_rows(self, request, cutoff):
        from .census import normalize
        groups = {}
        for survey in self._farmer_distinct_queryset(request).order_by("survey_date", "pk"):
            if not normalize(survey.farmer_name):
                continue
            key = (survey.barangay_id, normalize(survey.farmer_name))
            old = groups.get(key)
            count = old["survey_count"] + 1 if old else 1
            groups[key] = {
                "farmer_name": survey.farmer_name,
                "contact_number": survey.contact_number,
                "last_survey_date": survey.survey_date.isoformat() if survey.survey_date else None,
                "survey_count": count,
                "is_active": survey.survey_date is not None and survey.survey_date >= cutoff,
            }
        return sorted(groups.values(), key=lambda row: normalize(row["farmer_name"]))

    @action(detail=False, methods=["get"])
    def farmer_roster(self, request):
        cutoff = timezone.now().date() - timedelta(days=ACTIVE_THRESHOLD_DAYS)
        return Response(self._roster_rows(request, cutoff))

    @action(detail=False, methods=["get"])
    def survey_data(self, request):
        """
        API Endpoint: GET /api/current-density/?month={n}&season={wet|dry}&year={YYYY}
        Returns aggregated pig population per barangay for the Leaflet heatmap,
        including type breakdown and historical trends.
        """
        target_month = request.query_params.get("month")
        start_month = request.query_params.get("start_month")
        end_month = request.query_params.get("end_month")
        target_season = request.query_params.get("season")
        target_year = request.query_params.get("year")

        barangay_ids = [request.user.barangay_id] if request.user.role == "Barangay" else None
        # Calendar selection is municipal so a missing local quarter stays missing.
        payload = HogSurveyService.get_aggregated_survey_data(
            target_month=target_month, start_month=start_month, end_month=end_month,
            target_season=target_season, target_year=target_year,
            compare_year=request.query_params.get("compare_year"),
            barangay_ids=barangay_ids,
        )
        return Response(payload)

    @action(detail=False, methods=["get"])
    def census_history(self, request):
        from .census import census_history
        barangays = models.Barangay.objects.all()
        if request.user.role == "Barangay":
            barangays = barangays.filter(pk=request.user.barangay_id)
        elif request.query_params.get("barangay"):
            try:
                barangays = barangays.filter(pk=int(request.query_params["barangay"]))
            except ValueError:
                raise ValidationError("Invalid barangay.") from None
        # Municipal quarters also provide explicit gaps in a barangay's history.
        return Response(census_history(models.HogSurvey.objects.all(), barangays))

    @action(detail=False, methods=["post"])
    def upload_csv(self, request):
        """
        API Endpoint: POST /api/hog-survey/upload_csv/
        Uploads a CSV file and imports hog survey data.
        """
        if request.user.role not in ["Admin", "Agri", "Barangay"]:
            return Response({"error": "Unauthorized"}, status=403)

        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=400)

        if not file_obj.name.endswith(".csv"):
            return Response({"error": "File is not a CSV"}, status=400)

        barangay_restriction = None
        if request.user.role == "Barangay":
            barangay_restriction = request.user.barangay

        try:
            from .survey_import import import_surveys
            mode = request.data.get("mode", "apply")
            replace = str(request.data.get("replace", "false")).lower() == "true"
            if replace and request.user.role not in ["Admin", "Agri"]:
                raise PermissionDenied("Only municipal staff can replace surveys.")
            report = import_surveys(file_obj, barangay_restriction, mode=mode, replace=replace)
            if mode == "preview":
                return Response(report, status=200)
            created_count, errors = report["imported"], report["errors"]
            
            # Audit Log on success
            if created_count > 0:
                restriction_msg = f" for assigned Barangay {barangay_restriction.name}" if barangay_restriction else ""
                AuditTrail.objects.create(
                    who_performed=request.user,
                    what_performed=f"[HOG SURVEY CSV IMPORT] - CSV file '{file_obj.name}' imported successfully{restriction_msg}. Imported {created_count} records.",
                    when_performed=timezone.now()
                )
                
            return Response(
                {
                    "message": f"Successfully imported {created_count} records.",
                    "errors": errors,
                },
                status=(
                    status.HTTP_201_CREATED
                    if created_count > 0
                    else status.HTTP_400_BAD_REQUEST
                ),
            )
        except PermissionDenied:
            raise
        except Exception as e:
            return Response({"error": str(e)}, status=400)
