import uuid
from decimal import Decimal
from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.test import APIClient

from apps.api.models import AuditTrail
from apps.payment import models as payment_models
from apps.payment import services
from apps.permits.models import IssuedPermit, PermitApplication

User = get_user_model()


class FakePaymongoResponse:
    def __init__(self, payload, status_code=200):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def make_releasable_application(agri_user, farmer_user, fee=150.00):
    application = PermitApplication.objects.create(
        farmer=farmer_user,
        status=PermitApplication.Status.PAYMENT_PENDING,
        destination="Lucena",
        transport_date=timezone.now().date(),
        purpose="Slaughter",
    )
    issued_permit = IssuedPermit.objects.create(
        permit_number=uuid.uuid4().hex[:13].upper(),
        application=application,
        issued_by=agri_user,
        qr_token=str(uuid.uuid4()),
        permit_fee=Decimal(str(fee)),
    )
    return application, issued_permit


@pytest.fixture
def farmer_user(db):
    return User.objects.create_user(
        username="pay-farmer",
        password="password",
        role="Farmer",
        phone_no="09111111111",
        verification_status="VERIFIED",
    )


@pytest.fixture
def agri_user(db):
    return User.objects.create_user(
        username="pay-agri",
        password="password",
        role="Agri",
        phone_no="09222222222",
    )


@pytest.mark.django_db
class TestPaymentWorkflowCharacterization:
    def test_offline_confirm_releases_application_and_audits(self, farmer_user, agri_user):
        application, issued_permit = make_releasable_application(agri_user, farmer_user)
        fee = int(issued_permit.permit_fee)

        payment_history = services.confirm_offline_payment(application.pk, agri_user, "OR123")

        payment_history.refresh_from_db()
        assert payment_history.status == payment_models.PaymentHistory.Status.SUCCESS
        assert payment_history.amount == fee
        assert payment_history.or_number == "OR123"
        assert payment_history.confirmed_by == agri_user

        application.refresh_from_db()
        assert application.status == PermitApplication.Status.RELEASED
        issued_permit.refresh_from_db()
        assert issued_permit.is_paid is True

        assert AuditTrail.objects.filter(what_performed__contains="OR123").exists()

    def test_checkout_uses_issued_permit_fee_in_gateway_payload(
        self, farmer_user, agri_user
    ):
        application, issued_permit = make_releasable_application(agri_user, farmer_user)
        fee = int(issued_permit.permit_fee)

        payload = {
            "data": {
                "id": "cs_test_123",
                "attributes": {"checkout_url": "https://checkout.paymongo.com/test"},
            }
        }
        with mock.patch("apps.payment.services.requests.post") as mock_post:
            mock_post.return_value = FakePaymongoResponse(payload)
            services.create_checkout_session(application.pk)

        mock_post.assert_called_once()
        sent_json = mock_post.call_args.kwargs["json"]
        assert sent_json["data"]["attributes"]["line_items"][0]["amount"] == fee * 100

        history = payment_models.PaymentHistory.objects.get(issued_permit=issued_permit)
        assert history.status == payment_models.PaymentHistory.Status.PENDING
        assert history.method == "ONLINE"
        assert history.amount == fee

    def test_gateway_short_circuits_when_payment_already_success(
        self, farmer_user, agri_user
    ):
        application, issued_permit = make_releasable_application(agri_user, farmer_user)
        payment_models.PaymentHistory.objects.create(
            issued_permit=issued_permit,
            status=payment_models.PaymentHistory.Status.SUCCESS,
            method=payment_models.PaymentHistory.Method.OFFLINE,
            amount=int(issued_permit.permit_fee),
            or_number="OR-ABC-111",
        )

        with mock.patch(
            "apps.payment.services.requests.get",
            side_effect=AssertionError("gateway must not be called"),
        ):
            is_success, history = services.verify_paymongo_session(application.pk, farmer_user)

        assert is_success is True
        assert history.status == payment_models.PaymentHistory.Status.SUCCESS

    def test_debug_guard_refuses_simulation_when_debug_off(self, farmer_user, agri_user):
        application, _ = make_releasable_application(agri_user, farmer_user)

        with override_settings(DEBUG=False):
            with pytest.raises(PermissionDenied):
                services.farmer_simulate_payment(application.pk, farmer_user, "gcash")

    def test_viewset_simulate_payment_refused_when_debug_off(self, agri_user, farmer_user):
        application, _ = make_releasable_application(agri_user, farmer_user)
        client = APIClient()
        client.force_authenticate(user=agri_user)

        url = reverse("payment-simulate-payment", kwargs={"pk": application.pk})
        with override_settings(DEBUG=False):
            response = client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_checkout_session_rejects_already_paid(self, farmer_user, agri_user):
        application, issued_permit = make_releasable_application(agri_user, farmer_user)
        issued_permit.is_paid = True
        issued_permit.save()

        with pytest.raises(ValidationError) as exc_info:
            services.create_checkout_session(application.pk)
        assert "already been paid" in str(exc_info.value.detail)

    def test_create_checkout_session_rejects_when_not_payment_pending(
        self, farmer_user, agri_user
    ):
        application, issued_permit = make_releasable_application(agri_user, farmer_user)
        application.status = PermitApplication.Status.RELEASED
        application.save()
        issued_permit.is_paid = True
        issued_permit.save()

        with pytest.raises(ValidationError) as exc_info:
            services.create_checkout_session(application.pk)
        assert str(exc_info.value.detail[0]) == "Already paid."