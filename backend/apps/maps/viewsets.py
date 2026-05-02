from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from . import serializers
from . import models
from django.db.models import Avg

from rest_framework.permissions import IsAuthenticated

from django.db.models import Sum, Q

class BarangayViewSets(viewsets.ModelViewSet):
    queryset = models.Barangay.objects.all()
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return [IsAuthenticated()]
    

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return serializers.BarangayListDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.BarangayWriteSerializer
        else:
            return  serializers.BarangayListSerializer
    
    @action(detail=False, methods=['get'])
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
                PermitApplication.Status.RELEASED
            ]
        )

        volume_data = active_permits.values('origin_barangay__name').annotate(
            total_transported=Sum('number_of_pigs')
        )

        volume_payload = []
        # Get all barangays to ensure we return 0 for those with no transport activity
        all_barangays = models.Barangay.objects.all()
        
        for b in all_barangays:
            match = next((v for v in volume_data if v['origin_barangay__name'] == b.name), None)
            total = match['total_transported'] if match else 0
            
            # Classification for Transport Volume
            if total == 0: level = "Stable"
            elif total < 20: level = "Light"
            elif total < 100: level = "Moderate"
            elif total < 300: level = "Heavy"
            else: level = "Congested"

            volume_payload.append({
                "barangay": b.name,
                "total_transported": total,
                "volume_level": level,
                "latitude": b.latitude,
                "longitude": b.longitude
            })
            
        return Response(volume_payload)

import csv
from django.http import HttpResponse

class HogSurveyViewSets(viewsets.ModelViewSet):
    queryset = models.HogSurvey.objects.all()
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action in  ['list', 'retrieve']:
            return serializers.HogSurveyListDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.HogSurveyWriteSerializer
        return serializers.HogSurveyListSerializer  # safe fallback
    
    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """
        API Endpoint: GET /api/hog-survey/export_csv/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
        Exports survey data to a CSV file for official reporting with date range.
        """
        if request.user.role != 'Agri':
            return Response({"error": "Unauthorized"}, status=403)

        from datetime import datetime
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        queryset = models.HogSurvey.objects.all().order_by('-survey_date')
        
        try:
            if start_date_str:
                queryset = queryset.filter(survey_date__gte=datetime.strptime(start_date_str, '%Y-%m-%d').date())
            if end_date_str:
                queryset = queryset.filter(survey_date__lte=datetime.strptime(end_date_str, '%Y-%m-%d').date())
        except ValueError:
            return Response({"error": "Invalid date format"}, status=400)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="Sariaya_Hog_Population_Report.csv"'

        writer = csv.writer(response)
        writer.writerow(['Barangay', 'Date', 'Inahin', 'Barako', 'Fattener', 'Grower', 'Bulaw', 'Starter', 'Total'])

        for s in queryset:
            writer.writerow([
                s.barangay.name,
                s.survey_date,
                s.inahin,
                s.barako,
                s.fattener,
                s.grower,
                s.bulaw,
                s.starter,
                s.total_pigs
            ])

        return response
    

    @action(detail=False, methods=['get'])
    def survey_data(self, request):
        """
        API Endpoint: GET /api/current-density/?month={n}&season={wet|dry}
        Returns aggregated pig density per barangay for the Leaflet heatmap,
        including type breakdown and historical trends.
        """
        target_month = request.query_params.get('month')
        target_season = request.query_params.get('season')
        
        # Start with all survey records
        queryset = self.get_queryset()

        # 1. Filter current period
        current_queryset = queryset
        if target_month:
            current_queryset = current_queryset.filter(survey_date__month=int(target_month))
        elif target_season:
            season = target_season.lower()
            if season == 'wet':
                current_queryset = current_queryset.filter(survey_date__month__in=[6, 7, 8, 9, 10, 11])
            elif season == 'dry':
                current_queryset = current_queryset.filter(survey_date__month__in=[12, 1, 2, 3, 4, 5])

        # 2. Aggregate current data (BREAKDOWN included)
        aggregated_data = current_queryset.values(
            'barangay__name', 
            'barangay__latitude', 
            'barangay__longitude'
        ).annotate(
            avg_pigs=Avg('total_pigs'),
            avg_inahin=Avg('inahin'),
            avg_barako=Avg('barako'),
            avg_fattener=Avg('fattener'),
            avg_grower=Avg('grower'),
            avg_bulaw=Avg('bulaw'),
            avg_starter=Avg('starter')
        )

        # 3. Handle Historical Trends (Space for ML placeholder)
        # For simplicity, we compare to the previous month's total average across the same queryset
        # In a real ML scenario, this 'trend' would be replaced by a prediction model output.
        
        heatmap_payload = []
        for entry in aggregated_data:
            pigs = int(entry['avg_pigs'] or 0)
            
            # Density Classification
            if pigs == 0: density = "None"
            elif pigs < 50: density = "Low"
            elif pigs < 200: density = "Medium"
            elif pigs < 500: density = "High"
            else: density = "Very High"
                
            heatmap_payload.append({
                "barangay": entry['barangay__name'],
                "latitude": entry['barangay__latitude'],
                "longitude": entry['barangay__longitude'],
                "total_pigs": pigs,
                "density_level": density,
                "breakdown": {
                    "inahin": int(entry['avg_inahin'] or 0),
                    "barako": int(entry['avg_barako'] or 0),
                    "fattener": int(entry['avg_fattener'] or 0),
                    "grower": int(entry['avg_grower'] or 0),
                    "bulaw": int(entry['avg_bulaw'] or 0),
                    "starter": int(entry['avg_starter'] or 0),
                },
                # Placeholder for Trend / Future ML Forecast
                "trend": "stable", # Default to stable; logic for 'up'/'down' can be added here
                "is_prediction": False # Flag to distinguish between real data and ML forecast later
            })

        return Response(heatmap_payload)