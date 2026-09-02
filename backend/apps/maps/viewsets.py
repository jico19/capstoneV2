from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from . import serializers
from . import models
from .services import HogSurveyService
from rest_framework.exceptions import ValidationError
import csv
from django.http import HttpResponse
from django.utils import timezone
from apps.api.models import AuditTrail
from apps.api.base import BaseModelViewSet


class BarangayViewSet(BaseModelViewSet):
    queryset = models.Barangay.objects.all()
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return serializers.BarangayListDetailSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return serializers.BarangayWriteSerializer
        else:
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

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.HogSurvey.objects.none()
        if user.role == "Barangay":
            return models.HogSurvey.objects.filter(barangay=user.barangay)
        return models.HogSurvey.objects.all()

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return serializers.HogSurveyListDetailSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return serializers.HogSurveyWriteSerializer
        return serializers.HogSurveyListDetailSerializer  # safe fallback

    def perform_create(self, serializer):
        user = self.request.user
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
        if user.role == "Barangay" and instance.barangay != user.barangay:
            raise ValidationError({"error": "You do not have permission to delete this survey."})
            
        barangay_name = instance.barangay.name
        total_pigs = instance.total_pigs
        instance.delete()
        
        # Audit Log
        AuditTrail.objects.create(
            who_performed=user,
            what_performed=f"[HOG SURVEY DELETED] - Survey for Barangay {barangay_name} (Total: {total_pigs} pigs) deleted successfully.",
            when_performed=timezone.now()
        )

    @action(detail=False, methods=["get"])
    def export_csv(self, request):
        """
        API Endpoint: GET /api/hog-survey/export_csv/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
        Exports survey data to a CSV file for official reporting with date range.
        """
        if request.user.role not in ["Agri", "Barangay"]:
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
        queryset = models.HogSurvey.objects.filter(survey_date__isnull=False)
        if user.role == "Barangay":
            queryset = queryset.filter(barangay=user.barangay)
            
        years = (
            queryset.values_list("survey_date__year", flat=True)
            .distinct()
            .order_by("-survey_date__year")
        )
        return Response(list(years))

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

        heatmap_payload = HogSurveyService.get_aggregated_survey_data(
            target_month=target_month,
            start_month=start_month,
            end_month=end_month,
            target_season=target_season,
            target_year=target_year
        )
        
        # If user is a Barangay Official, we only return data for their barangay
        if request.user.role == "Barangay" and request.user.barangay:
            user_b = request.user.barangay.name.lower()
            if isinstance(heatmap_payload, dict):
                # Filter components if it's a dict
                if "density_data" in heatmap_payload:
                    heatmap_payload["density_data"] = [
                        d for d in heatmap_payload["density_data"] if d.get("barangay", "").lower() == user_b
                    ]
                if "historical_trends" in heatmap_payload:
                    heatmap_payload["historical_trends"] = [
                        t for t in heatmap_payload["historical_trends"] if t.get("barangay", "").lower() == user_b
                    ]
            elif isinstance(heatmap_payload, list):
                heatmap_payload = [
                    d for d in heatmap_payload if d.get("barangay", "").lower() == user_b
                ]
                
        return Response(heatmap_payload)

    @action(detail=False, methods=["post"])
    def upload_csv(self, request):
        """
        API Endpoint: POST /api/hog-survey/upload_csv/
        Uploads a CSV file and imports hog survey data.
        """
        if request.user.role not in ["Agri", "Barangay"]:
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
            created_count, errors = HogSurveyService.import_csv(file_obj, barangay_restriction=barangay_restriction)
            
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
        except Exception as e:
            return Response({"error": str(e)}, status=400)
