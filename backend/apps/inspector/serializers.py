from rest_framework import serializers
from . import models

class InspectorLogsSerializer(serializers.ModelSerializer):
    application_id_code = serializers.CharField(source='application.application_id', read_only=True)
    farmer_name = serializers.CharField(source='application.farmer.get_full_name', read_only=True)
    destination = serializers.CharField(source='application.destination', read_only=True)
    scanned_at_display = serializers.DateTimeField(source='scanned_at', format='%Y-%m-%d %H:%M:%S', read_only=True)

    class Meta:
        model = models.InspectorLogs
        fields = [
            'id', 'inspector', 'application', 'application_id_code', 
            'farmer_name', 'destination', 'notes', 'scanned_at', 
            'scanned_at_display', 'lat', 'longi'
        ]
        read_only_fields = ['inspector', 'scanned_at']