from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from . import serializers
from . import models
from .services import HogSurveyService
from django.db.models import Avg

from rest_framework.permissions import IsAuthenticated

from django.db.models import Sum, Q


class BarangayViewSets(viewsets.ModelViewSet):
    queryset = models.Barangay.objects.all()
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

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
        from apps.permits.models import PermitApplication

        # We only count permits that have reached 'Permit Issued' or later
        active_permits = PermitApplication.objects.filter(
            status__in=[
                PermitApplication.Status.PERMIT_ISSUED,
                PermitApplication.Status.PAYMENT_PENDING,
                PermitApplication.Status.RELEASED,
            ]
        )

        volume_data = active_permits.values("origin_barangay__name").annotate(
            total_transported=Sum("number_of_pigs")
        )

        # Convert volume_data to a dictionary for faster lookups
        volume_map = {
            v["origin_barangay__name"]: v["total_transported"] for v in volume_data
        }

        volume_payload = []
        # Get all barangays to ensure we return 0 for those with no transport activity
        all_barangays = models.Barangay.objects.all()

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

        return Response(volume_payload)


import csv
from django.http import HttpResponse


class HogSurveyViewSets(viewsets.ModelViewSet):
    queryset = models.HogSurvey.objects.all()
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

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

        from datetime import datetime

        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        queryset = models.HogSurvey.objects.all().order_by("-survey_date")

        try:
            if start_date_str:
                queryset = queryset.filter(
                    survey_date__gte=datetime.strptime(
                        start_date_str, "%Y-%m-%d"
                    ).date()
                )
            if end_date_str:
                queryset = queryset.filter(
                    survey_date__lte=datetime.strptime(end_date_str, "%Y-%m-%d").date()
                )
        except ValueError:
            return Response({"error": "Invalid date format"}, status=400)

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

        for s in queryset:
            writer.writerow(
                [
                    s.barangay.name,
                    s.survey_date,
                    s.inahin,
                    s.barako,
                    s.fattener,
                    s.grower,
                    s.bulaw,
                    s.starter,
                    s.total_pigs,
                ]
            )

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

        # Start with all survey records
        queryset = self.get_queryset()

        # If no specific filters, we default to the latest year available
        if not any([target_month, start_month, target_season, target_year]):
            latest_survey = queryset.order_by("-survey_date").first()
            if latest_survey:
                target_year = latest_survey.survey_date.year

        # 1. Filter current period
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

        # 2. Aggregate current data (SUM for total population)
        # Using Sum instead of Avg because "At a Glance" needs the total population
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

            # Density Classification (Thresholds can be adjusted for Sum)
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
