from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from . import serializers
from . import models
from .services import HogSurveyService
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError


class BarangayViewSets(viewsets.ModelViewSet):
    queryset = models.Barangay.objects.all()
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return serializers.BarangayListDetailSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return serializers.BarangayWriteSerializer
        else:
            return serializers.BarangayListSerializer

    @action(detail=False, methods=["get"])
    def transport_volume(self, request):
        """
        Calculates the total number of pigs being transported out of each barangay
        based on active/released permits.
        """
        volume_payload = HogSurveyService.calculate_transport_volume()
        return Response(volume_payload)



import csv
from django.http import HttpResponse


class HogSurveyViewSets(viewsets.ModelViewSet):
    queryset = models.HogSurvey.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return serializers.HogSurveyListDetailSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return serializers.HogSurveyWriteSerializer
        return serializers.HogSurveyListSerializer  # safe fallback

    @action(detail=False, methods=["get"])
    def export_csv(self, request):
        """
        API Endpoint: GET /api/hog-survey/export_csv/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
        Exports survey data to a CSV file for official reporting with date range.
        """
        if request.user.role != "Agri":
            return Response({"error": "Unauthorized"}, status=403)

        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        try:
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
        years = (
            models.HogSurvey.objects.filter(survey_date__isnull=False)
            .values_list("survey_date__year", flat=True)
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
        return Response(heatmap_payload)


    @action(detail=False, methods=["post"])
    def upload_csv(self, request):
        """
        API Endpoint: POST /api/hog-survey/upload_csv/
        Uploads a CSV file and imports hog survey data.
        """
        if request.user.role != "Agri":
            return Response({"error": "Unauthorized"}, status=403)

        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=400)

        if not file_obj.name.endswith(".csv"):
            return Response({"error": "File is not a CSV"}, status=400)

        try:
            created_count, errors = HogSurveyService.import_csv(file_obj)
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
