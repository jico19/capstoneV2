from django.db import models



class SMSLog(models.Model):
    class Type(models.TextChoices):
        OTP = "OTP", "Otp"
        NOTIFICATION = "NOTIFICATION", "Notification"


    phone_number = models.CharField(max_length=20)
    send_at = models.DateTimeField(auto_now_add=True)
    message_type = models.CharField(choices=Type, max_length=50)


    def __str__(self):
        return f"SMSLog -> {self.pk}# | {self.phone_number} | {self.message_type}"