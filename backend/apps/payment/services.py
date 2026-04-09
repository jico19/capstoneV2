import base64
import requests
from django.conf import settings
from apps.permits import models as permits
from . import models
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from django.tasks import task


def get_auth_header():
    key = settings.PAYMONGO_SECRET_KEY
    encoded = base64.b64encode(f"{key}:".encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Content-Type": "application/json"}

def create_checkout_session(issued_permit_id: int, staff):
    try:
        permit = permits.IssuedPermit.objects.select_related(
            'application',
            'application__farmer'
        ).get(id=issued_permit_id)
    except permits.IssuedPermit.DoesNotExist:
        raise ValidationError('Permit not found.')

    if permit.application.farmer != staff:
        raise ValidationError('Unauthorized.')

    if permit.is_paid:
        raise ValidationError('Already paid.')

    if permit.application.status != permits.PermitApplication.Status.PAYMENT_PENDING:
        raise ValidationError('Application is not ready for payment.')

    farmer = permit.application.farmer
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
                        "name": f"Livestock Transport Permit — {permit.permit_number}",
                        "quantity": 1,
                    }
                ],
                "payment_method_types": ["gcash", "card", "paymaya"],
                "success_url": f"{settings.FRONTEND_URL}/farmer/payment/success?issed_permit_id={issued_permit_id}",
                "cancel_url": f"{settings.FRONTEND_URL}/farmer/payment/cancel?issued_permit_id={issued_permit_id}",
                "description": f"Permit fee for application #{permit.application.application_id}",
                "metadata": {
                    "application_id": str(issued_permit_id),
                    "permit_number": permit.permit_number,
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

    models.PaymentHistory.objects.create(
        issued_permit=permit,
        method='ONLINE',
        amount=50000 / 10,
        paymongo_session_id=data["id"],
    )

    return {
        "checkout_url": data["attributes"]["checkout_url"],
    }