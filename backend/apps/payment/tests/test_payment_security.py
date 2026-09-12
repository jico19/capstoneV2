from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.payment import models as payment_models
from apps.payment import services
from apps.payment.serializers import PaymentWriteAndDetailSerializer
from apps.permits.models import PermitApplication

from .test_payment_workflow import FakePaymongoResponse, make_releasable_application

User = get_user_model()


@pytest.fixture
def farmer_user(db):
    return User.objects.create_user(
        username="sec-farmer",
        password="password",
        role="Farmer",
        phone_no="09111111111",
        verification_status="VERIFIED",
    )


@pytest.fixture
def agri_user(db):
    return User.objects.create_user(
        username="sec-agri",
        password="password",
        role="Agri",
        phone_no="09222222222",
    )


@pytest.mark.django_db
class TestPaymentSecurityBaseline:
    def test_payment_history_detail_is_not_writable(self, agri_user, farmer_user):
        application, issued_permit = make_releasable_application(agri_user, farmer_user)
        history = payment_models.PaymentHistory.objects.create(
            issued_permit=issued_permit,
            status=payment_models.PaymentHistory.Status.PENDING,
            method="ONLINE",
            amount=int(issued_permit.permit_fee),
            paymongo_session_id="cs_test_123",
        )
        client = APIClient()
        client.force_authenticate(user=agri_user)
        url = reverse("payment-detail", kwargs={"pk": history.pk})

        assert client.post(url, {}, format="json").status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        assert client.put(url, {}, format="json").status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        assert client.patch(url, {}, format="json").status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        assert client.delete(url).status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_write_serializer_has_no_writable_money_or_lifecycle_fields(self):
        immutable_fields = [
            "status",
            "amount",
            "method",
            "or_number",
            "confirmed_by",
            "confirmed_at",
            "paymongo_payment_id",
            "paymongo_session_id",
            "paymongo_payment_intent_id",
        ]
        fields = PaymentWriteAndDetailSerializer().fields
        for field_name in immutable_fields:
            assert fields[field_name].read_only is True

    @pytest.mark.xfail(strict=True, reason="fixed by plan 002/003")
    def test_gateway_amount_mismatch_does_not_release(self, agri_user, farmer_user):
        application, issued_permit = make_releasable_application(agri_user, farmer_user)
        payment_models.PaymentHistory.objects.create(
            issued_permit=issued_permit,
            status=payment_models.PaymentHistory.Status.PENDING,
            method="ONLINE",
            amount=int(issued_permit.permit_fee),
            paymongo_session_id="cs_test_123",
        )

        gateway_amount = int(issued_permit.permit_fee) * 100 + 9999
        with mock.patch("apps.payment.services.requests.get") as mock_get:
            mock_get.return_value = FakePaymongoResponse(
                {"data": {"attributes": {"status": "paid", "amount": gateway_amount}}}
            )
            services.verify_paymongo_session(application.pk, farmer_user)

        application.refresh_from_db()
        assert application.status != PermitApplication.Status.RELEASED

    @pytest.mark.xfail(strict=True, reason="fixed by plan 002/003")
    def test_checkout_amount_is_always_the_permit_fee(self, agri_user, farmer_user):
        application, issued_permit = make_releasable_application(agri_user, farmer_user)
        fee = int(issued_permit.permit_fee)

        with mock.patch("apps.payment.services.requests.post") as mock_post:
            mock_post.return_value = FakePaymongoResponse(
                {
                    "data": {
                        "id": "cs_test_456",
                        "attributes": {"checkout_url": "https://checkout.paymongo.com/test"},
                    }
                }
            )
            services.create_checkout_session(application.pk, total_price=0.01)

        sent_json = mock_post.call_args.kwargs["json"]
        assert sent_json["data"]["attributes"]["line_items"][0]["amount"] == fee * 100

        history = payment_models.PaymentHistory.objects.get(issued_permit=issued_permit)
        assert history.amount == fee