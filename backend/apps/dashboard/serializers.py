from rest_framework import serializers
from .models import CachedInsight


class CachedInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = CachedInsight
        fields = [
            'id',
            'role',
            'scope_key',
            'summary',
            'trends',
            'actions',
            'generated_at',
            'expires_at',
        ]
