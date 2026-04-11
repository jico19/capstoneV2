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

def create_checkout_session(issued_permit_pk: int):
    """"
        TODO: FIX THE USAGE OF ISSUED_PERMIT_ID LOGIC IS OFF USE PERMIT APPLICATION.
    """

    issued_permit = get_object_or_404(
        models.IssuedPermit,
        pk=issued_permit_pk
    )
    permit_application = issued_permit.application

    if issued_permit.is_paid:
        raise ValidationError('Already paid.')
    
    farmer = permit_application.farmer
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
                        "amount": 50000,
                        "name": f"Livestock Transport Permit — {issued_permit.permit_number}",
                        "quantity": 1,
                    }
                ],
                "payment_method_types": ["gcash", "card", "paymaya"],
                "success_url": f"{settings.FRONTEND_URL}/farmer/payment/success/{permit_application.pk}",
                "cancel_url": f"{settings.FRONTEND_URL}/farmer/payment/cancel?issued_permit_id={permit_application.pk}",
                "description": f"Permit fee for application #{issued_permit.application.application_id}",
                "metadata": {
                    "permit_id": str(issued_permit.pk),
                    "permit_number": issued_permit.permit_number,
                    "farmer_id": str(farmer.id),
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


    # create one to one relations to  issued id
    models.PaymentHistory.objects.create(
        issued_permit= issued_permit,
        status=models.PaymentHistory.Status.PENDING,
        method='ONLINE',
        amount=50000 / 10,
        paymongo_session_id=data["id"],
    )

    return {
        "checkout_url": data["attributes"]["checkout_url"],
    }