from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from apps.maps.models import Barangay

class User(AbstractUser):
    role = models.CharField(max_length=20, default="Farmer", choices=(
        ('Admin', 'Admin'),
        ('Farmer', 'Farmer'),
        ('Inspector', 'Inspector'),
        ('Opv', 'Opv'),
        ('Agri', 'Agri'),
    ), null=False, help_text="User role")
    phone_no = models.CharField(max_length=11, validators=[
        RegexValidator(
            regex=r'^(?:\+639|639|09)\d{9}$',
            message='Enter a valid mobile number.'
        )
    ])
    address = models.CharField(max_length=255, blank=True)
    barangay = models.ForeignKey(Barangay, help_text="User barangay.", on_delete=models.CASCADE, null=True, blank=True)
    receive_sms = models.BooleanField(default=True, help_text="Whether the user wants to receive SMS notifications.")

    def __str__(self):
        return f"{self.username} | {self.role}"


class Notification(models.Model):
    class Type(models.TextChoices):
        WARNING = 'WARNING', 'Warning'
        INFO = 'INFO', 'Info'
        SUCCESS = 'SUCCESS', 'Success'

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=Type.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notif → {self.recipient} | {self.title}"

    class Meta:
        ordering = ['-sent_at']



class AuditTrail(models.Model):
    who_performed = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    what_performed = models.TextField()
    when_performed = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"AuditTrails -> #{self.pk} - {self.who_performed.get_full_name() or self.who_performed.username}"