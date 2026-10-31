"""Staff payment simulation authorization and release behavior."""
from unittest.mock import patch

import pytest
from django.urls import reverse

from apps.payment.models import PaymentHistory
from apps.permits.models import PermitApplication


@pytest.mark.django_db
class TestSimulatePaymentGuards:
    """
    Tests for the DEBUG + role guards added to simulate_payment.
    """

    def _url(self, pk):
        return reverse("payment-simulate-payment", kwargs={"pk": pk})

    # ---- Production block (DEBUG=False) ----

    @patch("django.conf.settings.DEBUG", False)
    def test_blocked_in_production_for_agri(self, api_client, agri, payment_pending_application):
        """Agri gets 403 when DEBUG is False (production mode)."""
        api_client.force_authenticate(user=agri)
        response = api_client.post(self._url(payment_pending_application.pk))
        assert response.status_code == 403
        assert "not available in production" in response.data["error"]

    @patch("django.conf.settings.DEBUG", False)
    def test_blocked_in_production_for_farmer(self, api_client, farmer, payment_pending_application):
        """Farmer also gets 403 in production."""
        api_client.force_authenticate(user=farmer)
        response = api_client.post(self._url(payment_pending_application.pk))
        assert response.status_code == 403

    # ---- Role check (DEBUG=True) ----

    @patch("django.conf.settings.DEBUG", True)
    def test_farmer_cannot_simulate_in_debug(self, api_client, farmer, payment_pending_application):
        """Farmer gets 403 even in DEBUG mode (role check)."""
        api_client.force_authenticate(user=farmer)
        response = api_client.post(self._url(payment_pending_application.pk))
        assert response.status_code == 403
        assert "Agri officers" in response.data["error"]

    @patch("django.conf.settings.DEBUG", True)
    def test_inspector_cannot_simulate_in_debug(self, api_client, inspector, payment_pending_application):
        """Inspector also cannot simulate."""
        api_client.force_authenticate(user=inspector)
        response = api_client.post(self._url(payment_pending_application.pk))
        assert response.status_code == 403

    @patch("django.conf.settings.DEBUG", True)
    def test_agri_can_simulate_in_debug(self, api_client, agri, payment_pending_application):
        """Agri succeeds when DEBUG=True."""
        api_client.force_authenticate(user=agri)
        response = api_client.post(self._url(payment_pending_application.pk))
        assert response.status_code == 200
        assert response.data["verified"] is True
        issued = payment_pending_application.issued_permit
        issued.refresh_from_db()
        payment_pending_application.refresh_from_db()
        assert issued.aic_number
        assert payment_pending_application.status == PermitApplication.Status.RELEASED

    @patch("django.conf.settings.DEBUG", True)
    def test_simulate_already_paid_returns_200(self, api_client, agri, payment_pending_application):
        """Calling simulate_payment twice returns 200 with 'Already paid' message."""
        issued = payment_pending_application.issued_permit
        ph = issued.payment_history
        ph.status = PaymentHistory.Status.SUCCESS
        ph.save()

        api_client.force_authenticate(user=agri)
        response = api_client.post(self._url(payment_pending_application.pk))
        assert response.status_code == 200
        assert "Already paid" in response.data["msg"]


    def test_unauthenticated_gets_401(self, api_client, payment_pending_application):
        """Unauthenticated requests get 401."""
        response = api_client.post(self._url(payment_pending_application.pk))
        assert response.status_code == 401
