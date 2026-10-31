"""Offline payment endpoint release, validation, and authorization."""
from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.api.models import AuditTrail
from apps.payment.models import PaymentHistory
from apps.permits.models import IssuedPermit, PermitApplication


@pytest.mark.django_db
class TestConfirmOfflinePayment:
    """
    Tests for the confirm_offline_payment action on PaymentViewSets.
    Endpoint: POST /payment/{application_pk}/confirm_offline_payment/
    """

    def _url(self, pk):
        return reverse("payment-confirm-offline-payment", kwargs={"pk": pk})

    # ---- Happy path ----

    def test_agri_confirms_offline_payment_success(self, api_client, agri, payment_pending_application):
        """Agri can confirm an offline payment with a valid OR number."""
        api_client.force_authenticate(user=agri)
        response = api_client.post(
            self._url(payment_pending_application.pk),
            {"or_number": "1234567"},
        )
        assert response.status_code == 200
        assert response.data["or_number"] == "1234567"
        assert response.data["confirmed_at"] is not None
        payment_pending_application.refresh_from_db()
        assert payment_pending_application.status == PermitApplication.Status.RELEASED
        issued = payment_pending_application.issued_permit
        issued.refresh_from_db()
        assert issued.is_paid is True
        assert issued.payment_method == IssuedPermit.PaymentMethodChoices.OFFLINE
        assert issued.aic_number
        trail = AuditTrail.objects.filter(
            what_performed__contains="OFFLINE PAYMENT CONFIRMED"
        ).last()
        assert trail is not None
        assert "1234567" in trail.what_performed


    def test_payment_history_created_with_correct_fields(self, api_client, agri, payment_pending_application):
        """PaymentHistory must be SUCCESS, method OFFLINE, with OR number and confirmed_by."""
        issued = payment_pending_application.issued_permit
        # Remove the pre-existing PaymentHistory so update_or_create creates fresh
        issued.payment_history.delete()

        api_client.force_authenticate(user=agri)
        api_client.post(
            self._url(payment_pending_application.pk),
            {"or_number": "9876543"},
        )

        ph = PaymentHistory.objects.get(issued_permit=issued)
        assert ph.status == PaymentHistory.Status.SUCCESS
        assert ph.method == PaymentHistory.Method.OFFLINE
        assert ph.or_number == "9876543"
        assert ph.confirmed_by == agri
        assert ph.confirmed_at is not None


    # ---- OR number validation ----

    def test_missing_or_number_returns_400(self, api_client, agri, payment_pending_application):
        """Missing OR number must return 400."""
        api_client.force_authenticate(user=agri)
        response = api_client.post(
            self._url(payment_pending_application.pk),
            {},
        )
        assert response.status_code == 400

    def test_blank_or_number_returns_400(self, api_client, agri, payment_pending_application):
        """Blank OR number must return 400."""
        api_client.force_authenticate(user=agri)
        response = api_client.post(
            self._url(payment_pending_application.pk),
            {"or_number": "   "},
        )
        assert response.status_code == 400

    # ---- Role checks ----

    def test_farmer_cannot_confirm_offline_payment(self, api_client, farmer, payment_pending_application):
        """Farmer must get 403."""
        api_client.force_authenticate(user=farmer)
        response = api_client.post(
            self._url(payment_pending_application.pk),
            {"or_number": "1234567"},
        )
        assert response.status_code == 403

    def test_opv_cannot_confirm_offline_payment(self, api_client, opv, payment_pending_application):
        """OPV staff must get 403."""
        api_client.force_authenticate(user=opv)
        response = api_client.post(
            self._url(payment_pending_application.pk),
            {"or_number": "1234567"},
        )
        assert response.status_code == 403

    def test_unauthenticated_gets_401(self, api_client, payment_pending_application):
        """Unauthenticated requests get 401."""
        response = api_client.post(
            self._url(payment_pending_application.pk),
            {"or_number": "1234567"},
        )
        assert response.status_code == 401

    # ---- Idempotency / guard checks ----

    def test_already_paid_returns_400(self, api_client, agri, payment_pending_application):
        """Calling confirm_offline_payment on an already-paid permit returns 400."""
        issued = payment_pending_application.issued_permit
        issued.is_paid = True
        issued.save()

        api_client.force_authenticate(user=agri)
        response = api_client.post(
            self._url(payment_pending_application.pk),
            {"or_number": "1234567"},
        )
        assert response.status_code == 400
        assert "already been paid" in str(response.data["error"]).lower()

    def test_wrong_application_status_returns_400(self, api_client, agri, farmer):
        """Application not in PAYMENT_PENDING state must return 400."""
        app = PermitApplication.objects.create(
            farmer=farmer,
            destination="Manila",
            transport_date=timezone.now().date() + timedelta(days=3),
            status=PermitApplication.Status.OPV_VALIDATED,  # Wrong status
        )
        api_client.force_authenticate(user=agri)
        response = api_client.post(
            self._url(app.pk),
            {"or_number": "1234567"},
        )
        assert response.status_code == 400
