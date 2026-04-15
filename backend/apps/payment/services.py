import base64
import requests
from django.conf import settings
from apps.permits import models as permits
from . import models
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.tasks import task


def get_auth_header():
    key = settings.PAYMONGO_SECRET_KEY
    encoded = base64.b64encode(f"{key}:".encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Content-Type": "application/json"}

def create_checkout_session(application_pk: int):
    application = get_object_or_404(permits.PermitApplication, pk=application_pk)
    issued_permit_instance = get_object_or_404(permits.IssuedPermit, application=application)

    if issued_permit_instance.is_paid:
        raise ValidationError('Already paid.')

    farmer = application.farmer

    payload = {
        "data": {
            "attributes": {
                "billing": {
                    "name": farmer.get_full_name(),
                    "email": farmer.email,
                },
                "line_items": [
                    {
                        "currency": "PHP",
                        "amount": int(settings.PERMIT_AMOUNT),
                        "name": f"Livestock Transport Permit — {issued_permit_instance.permit_number}",
                        "quantity": 1,
                    }
                ],
                "payment_method_types": ["gcash", "card", "paymaya"],
                "success_url": f"{settings.FRONTEND_URL}/farmer/payment/success/{application.pk}",
                "cancel_url": f"{settings.FRONTEND_URL}/farmer/payment/cancel?application_id={application.pk}",
                "description": f"Permit fee for application #{application.application_id}",
                "metadata": {
                    "permit_id": str(issued_permit_instance.pk),
                    "permit_number": issued_permit_instance.permit_number,
                    "farmer_id": str(farmer.pk),
                }
            }
        }
    }

    res = requests.post(
        f"{settings.PAYMONGO_URL}/checkout_sessions",
        json=payload,
        headers=get_auth_header(),
    )

    if res.status_code != 200:
        raise ValidationError(res.json())

    data = res.json()["data"]

    models.PaymentHistory.objects.create(
        issued_permit=issued_permit_instance,
        status=models.PaymentHistory.Status.PENDING,
        method='ONLINE',
        amount=int(settings.PERMIT_AMOUNT) / 100,
        paymongo_session_id=data["id"],
    )

    return {
        "checkout_url": data["attributes"]["checkout_url"],
    }