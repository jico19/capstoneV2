from django.db import models
from apps.permits.models import IssuedPermit
from apps.api.models import User
from django.utils import timezone
from nanoid import generate

def reference_num():
    return f"PAY-{timezone.now().year}-{generate(size=6, alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')}"

class PaymentHistory(models.Model):
    class Method(models.TextChoices):
        PAYMAYA = 'paymaya', 'Paymaya'
        OFFLINE = 'gcash', 'Gcash'
        CARD = 'card', 'Card'

    class Status(models.TextChoices):
        PENDING     = 'PENDING',    'Pending'
        CONFIRMED   = 'CONFIRMED',  'Confirmed'
        SUCCESS   = 'SUCCESS',  'success'
        FAILED      = 'FAILED',     'Failed'

    issued_permit = models.OneToOneField(IssuedPermit, on_delete=models.CASCADE, related_name="payment_history")
    method = models.CharField(max_length=10, choices=Method.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    amount = models.PositiveIntegerField()
    paymongo_payment_id = models.CharField(max_length=100, blank=True)
    paymongo_session_id = models.CharField(max_length=100, blank=True)
    confirmed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="agri_officer")
    confirmed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment #{self.pk} — {self.issued_permit.permit_number} ({self.status})"