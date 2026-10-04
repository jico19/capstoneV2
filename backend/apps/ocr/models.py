from django.db import models
from django.utils import timezone


class DailyOCRUsage(models.Model):
    """Tracks daily API call count per OCR provider for quota enforcement.

    Used by the provider chain in tasks.py to skip providers that have
    exhausted their daily limit and fall back to the next in the chain.
    """
    date = models.DateField(default=timezone.localdate, db_index=True)
    provider = models.CharField(max_length=30, db_index=True)  # 'paddleocr' | 'ocrspace'
    call_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [('date', 'provider')]
        verbose_name = "Daily OCR Usage"
        verbose_name_plural = "Daily OCR Usage"

    def __str__(self):
        return f"{self.provider} — {self.date} — {self.call_count} calls"

    @classmethod
    def increment(cls, provider: str) -> int:
        """Atomically increment today's call count and return the new value."""
        from django.db.models import F
        obj, created = cls.objects.get_or_create(
            date=timezone.localdate(),
            provider=provider,
            defaults={'call_count': 1},
        )
        if not created:
            cls.objects.filter(pk=obj.pk).update(call_count=F('call_count') + 1)
            obj.refresh_from_db()
        return obj.call_count

    @classmethod
    def remaining(cls, provider: str, daily_limit: int) -> int:
        """Return how many calls are left today for this provider."""
        try:
            obj = cls.objects.get(date=timezone.localdate(), provider=provider)
            return max(0, daily_limit - obj.call_count)
        except cls.DoesNotExist:
            return daily_limit
