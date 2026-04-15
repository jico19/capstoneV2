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
        return f"Log #{self.pk} -> {self.inspector.username} | {self.scanned_at.strftime('%d/%m/%Y')}"
    