from rest_framework import serializers
from . import models



class InspectorLogsSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.InspectorLogs
        fields = '__all__'