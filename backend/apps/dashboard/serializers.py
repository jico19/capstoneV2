from rest_framework import serializers
from .models import CachedInsight


class CachedInsightSerializer(serializers.ModelSerializer):
    chart_insights = serializers.SerializerMethodField()

    class Meta:
        model = CachedInsight
        fields = [
            'id',
            'role',
            'scope_key',
            'summary',
            'trends',
            'actions',
            'chart_insights',
            'generated_at',
            'expires_at',
        ]

    def get_chart_insights(self, obj):
        if isinstance(obj.raw_metrics_snapshot, dict):
            return obj.raw_metrics_snapshot.get('chart_insights', {})
        return {}
