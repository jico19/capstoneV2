from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class CachedInsight(models.Model):
    """
    Caches AI-generated and metric-driven insights to prevent redundant API calls
    and deliver instant dashboard load times.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="cached_insights")
    role = models.CharField(max_length=30)
    scope_key = models.CharField(max_length=120, db_index=True, help_text="Unique scope key e.g. user_12, barangay_1, municipal_agri")
    
    summary = models.TextField(help_text="Plain English executive summary of what is happening.")
    trends = models.JSONField(
        default=list, 
        help_text="List of trend objects with {text: str, severity: 'positive'|'warning'|'critical'|'neutral'}"
    )
    actions = models.JSONField(
        default=list, 
        help_text="List of recommended actionable next steps."
    )
    
    raw_metrics_snapshot = models.JSONField(
        default=dict, 
        blank=True, 
        help_text="Snapshot of the period-over-period numbers used to generate this insight."
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-generated_at']
        indexes = [
            models.Index(fields=['role', 'scope_key']),
        ]

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Insight for {self.role} ({self.scope_key}) - {self.generated_at.strftime('%Y-%m-%d %H:%M')}"
