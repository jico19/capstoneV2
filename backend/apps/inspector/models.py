from django.db import models
from apps.api.models import User
from apps.permits.models import PermitApplication

class InspectorLogs(models.Model):
    inspector = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="inspector")
    application = models.OneToOneField(PermitApplication, on_delete=models.CASCADE, related_name="inspector_application")
    notes = models.TextField()
    scanned_at = models.DateTimeField(auto_now_add=True)

    # location
    lat = models.FloatField(default=0)
    longi = models.FloatField(default=0)


    def __str__(self):
        inspector_name = self.inspector.username if self.inspector else "System"
        date_str = self.scanned_at.strftime('%d/%m/%Y') if self.scanned_at else "N/A"
        return f"Log #{self.pk} -> {inspector_name} | {date_str}"
    