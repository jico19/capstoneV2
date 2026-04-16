from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from . import serializers
from . import models
from django.db.models import Avg

class BarangayViewSets(viewsets.ModelViewSet):
    queryset = models.Barangay.objects.all()
    

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return serializers.BarangayListDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.BarangayWriteSerializer
        else:
            return  serializers.BarangayListSerializer

class HogSurveyViewSets(viewsets.ModelViewSet):
    queryset = models.HogSurvey.objects.all()

    def get_serializer_class(self):
        if self.action in  ['list', 'retrieve']:
            return serializers.HogSurveyListDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.HogSurveyWriteSerializer
        return serializers.HogSurveyListSerializer  # safe fallback
    

    @action(detail=False, methods=['get'])
    def survey_data(self, request):
        """
            API Endpoint: GET /api/current-density/?month={n}&season={wet|dry}
            Returns aggregated pig density per barangay for the Leaflet heatmap.
        """
        # 1. Get query parameters
        target_month = request.query_params.get('month')
        target_season = request.query_params.get('season')
        # Start with all survey records
        queryset = self.get_queryset()

        # 2. Filter by month OR by Philippine season
        if target_month:
            # Filter for a specific month (e.g., ?month=8 for August)
            queryset = queryset.filter(survey_date__month=int(target_month))
            
        elif target_season:
            # Filter based on the Philippine seasons
            season = target_season.lower()
            
            if season == 'wet':
                # Wet Season: June (6) to November (11)
                queryset = queryset.filter(survey_date__month__in=[6, 7, 8, 9, 10, 11])
                
            elif season == 'dry':
                # Dry Season: December (12) to May (5)
                queryset = queryset.filter(survey_date__month__in=[12, 1, 2, 3, 4, 5])

        # 3. Aggregate the data directly in the database (GROUP BY barangay)
        aggregated_data = queryset.values(
            'barangay__name', 
            'barangay__latitude', 
            'barangay__longitude'
        ).annotate(
            avg_pigs=Avg('total_pigs')
        )

        # 4. Format the payload and apply Density Classification Rules
        heatmap_payload = []
        
        for entry in aggregated_data:
            # Handle cases where avg_pigs might be None, and convert to integer
            pigs = int(entry['avg_pigs'] or 0)
            
            # Apply Capstone Classification Rules
            if pigs == 0:
                density = "None"
            elif pigs < 50:
                density = "Low"
            elif pigs < 200:
                density = "Medium"
            elif pigs < 500:
                density = "High"
            else:
                density = "Very High"
                
            # Build the JSON object for React
            heatmap_payload.append({
                "barangay": entry['barangay__name'],
                "latitude": entry['barangay__latitude'],
                "longitude": entry['barangay__longitude'],
                "total_pigs": pigs,
                "density_level": density
            })

        # 5. Return as a JSON array
        return Response(heatmap_payload)