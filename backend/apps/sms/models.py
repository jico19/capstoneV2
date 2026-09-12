from django.db import models



class SMSLog(models.Model):
    class Type(models.TextChoices):
        OTP = "OTP", "Otp"
        NOTIFICATION = "NOTIFICATION", "Notification"

    application = models.ForeignKey(
        'permits.PermitApplication',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sms_logs'
    )
    phone_number = models.CharField(max_length=20)
    send_at = models.DateTimeField(auto_now_add=True)
    message_type = models.CharField(choices=Type.choices, max_length=50)
    status_captured = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"SMSLog -> {self.pk}# | {self.phone_number} | {self.message_type} | {self.status_captured}"