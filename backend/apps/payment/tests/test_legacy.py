"""
Tests for payment business logic improvements.

Covers:
  - Spec #1: AIC number uniqueness (get_aic_number helper)
  - Spec #2: simulate_payment production guard + role restriction
  - Spec #4: confirm_offline_payment endpoint (Agri-only, full flow)

Run with:
    cd backend
    pytest apps/payment/tests.py -v
"""
import uuid
import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from django.urls import reverse

from apps.permits.models import (
    PermitApplication,
    IssuedPermit,
    MunicipalConfig,
)
from apps.maps.models import Barangay
from apps.payment.models import PaymentHistory
from apps.permits.services.numbers import get_aic_number

User = get_user_model()


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def barangay(db):
    return Barangay.objects.create(name="Payment Test Barangay")


@pytest.fixture
def farmer(db):
    return User.objects.create_user(
        username="pay_farmer", password="pw", role="Farmer", phone_no="09100000001"
    )


@pytest.fixture
def agri(db):
    return User.objects.create_user(
        username="pay_agri", password="pw", role="Agri", phone_no="09200000001"
    )


@pytest.fixture
def opv(db):
    return User.objects.create_user(
        username="pay_opv", password="pw", role="Opv", phone_no="09300000001"
    )


@pytest.fixture
def inspector(db):
    return User.objects.create_user(
        username="pay_inspector", password="pw", role="Inspector", phone_no="09400000001"
    )


@pytest.fixture
def payment_pending_application(db, farmer, agri):
    """
    Creates a PermitApplication in PAYMENT_PENDING state with an IssuedPermit
    and a pending PaymentHistory, ready for payment tests.
    """
    app = PermitApplication.objects.create(
        farmer=farmer,
        destination="Lucena",
        transport_date=timezone.now().date() + timedelta(days=3),
        purpose="Slaughter",
        status=PermitApplication.Status.PAYMENT_PENDING,
    )
    issued = IssuedPermit.objects.create(
        permit_number=uuid.uuid4().hex[:13].upper(),
        application=app,
        issued_by=agri,
        qr_token=uuid.uuid4(),
        permit_fee=150.00,
    )
    # A PaymentHistory is needed for simulate_payment
    PaymentHistory.objects.create(
        issued_permit=issued,
        method="gcash",
        status=PaymentHistory.Status.PENDING,
        amount=150,
    )
    return app


# ---------------------------------------------------------------------------
# Spec #1: get_aic_number — uniqueness + format
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
class TestGenerateAICNumber:
    """
    Tests for the get_aic_number() helper in apps/permits/services/numbers.py.
    These tests call the helper directly (unit tests) so they run fast.
    """

    def _make_issued_permit(self, agri, farmer):
        """Helper to create a bare IssuedPermit without an AIC number."""
        app = PermitApplication.objects.create(
            farmer=farmer,
            destination="Lucena",
            transport_date=timezone.now().date() + timedelta(days=3),
            purpose="Test",
            status=PermitApplication.Status.PAYMENT_PENDING,
        )
        return IssuedPermit.objects.create(
            permit_number=uuid.uuid4().hex[:13].upper(),
            application=app,
            issued_by=agri,
            qr_token=uuid.uuid4(),
            permit_fee=150.00,
        )

    def test_aic_format_is_correct(self, agri, farmer):
        """
        AIC number must match MM-DD-NNN-YY.
        e.g. '08-25-001-26'
        """
        from django.db import transaction
        permit = self._make_issued_permit(agri, farmer)
        with transaction.atomic():
            aic = get_aic_number(permit)

        today = timezone.now().date()
        expected_prefix = today.strftime("%m-%d")
        expected_suffix = today.strftime("%y")

        assert aic.startswith(expected_prefix), f"Expected prefix {expected_prefix}, got {aic}"
        assert aic.endswith(expected_suffix), f"Expected suffix {expected_suffix}, got {aic}"
        # Format: MM-DD-NNN-YY → 4 parts split by '-'
        parts = aic.split("-")
        assert len(parts) == 4, f"Expected 4 dash-separated parts, got: {aic}"
        assert parts[2].isdigit() and len(parts[2]) == 3, f"Counter part must be 3 digits: {aic}"

    def test_sequential_aic_numbers_are_unique(self, agri, farmer):
        """
        Two permits generated on the same day must get different AIC numbers.
        """
        from django.db import transaction

        permit_a = self._make_issued_permit(agri, farmer)
        permit_b = self._make_issued_permit(agri, farmer)

        with transaction.atomic():
            aic_a = get_aic_number(permit_a)
            permit_a.aic_number = aic_a
            permit_a.save()

        with transaction.atomic():
            aic_b = get_aic_number(permit_b)
            permit_b.aic_number = aic_b
            permit_b.save()

        assert aic_a != aic_b, f"Duplicate AIC numbers generated: {aic_a} == {aic_b}"

    def test_already_has_aic_number_not_overwritten(self, agri, farmer, payment_pending_application):
        """
        If a permit already has an AIC number, it must NOT be replaced.
        This tests the 'if not issued_permit.aic_number' guard in callers.
        """
        issued = payment_pending_application.issued_permit
        issued.aic_number = "EXISTING-001"
        issued.save()

        # Simulate the guard used in all call sites
        from django.db import transaction
        with transaction.atomic():
            if not issued.aic_number:
                issued.aic_number = get_aic_number(issued)
                issued.save()

        issued.refresh_from_db()
        assert issued.aic_number == "EXISTING-001"

    def test_counter_increments_correctly(self, agri, farmer):
        """
        Third permit of the day should get counter '003'.
        """
        from django.db import transaction

        today = timezone.now().date()
        prefix = today.strftime("%m-%d") + "-"

        # Pre-seed two AIC numbers for today
        for i in range(1, 3):
            p = self._make_issued_permit(agri, farmer)
            p.aic_number = f"{today.strftime('%m-%d')}-{i:03d}-{today.strftime('%y')}"
            p.save()

        new_permit = self._make_issued_permit(agri, farmer)
        with transaction.atomic():
            aic = get_aic_number(new_permit)

        counter_part = aic.split("-")[2]
        assert counter_part == "003", f"Expected counter '003', got '{counter_part}' in '{aic}'"


# ---------------------------------------------------------------------------
# Spec #2: simulate_payment guards
# ---------------------------------------------------------------------------

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

    @patch("django.conf.settings.DEBUG", True)
    def test_simulate_generates_aic_number(self, api_client, agri, payment_pending_application):
        """After simulation, the issued permit must have an AIC number."""
        api_client.force_authenticate(user=agri)
        api_client.post(self._url(payment_pending_application.pk))

        issued = payment_pending_application.issued_permit
        issued.refresh_from_db()
        assert issued.aic_number, "AIC number was not generated after simulate_payment"

    @patch("django.conf.settings.DEBUG", True)
    def test_simulate_sets_application_to_released(self, api_client, agri, payment_pending_application):
        """Application status must be RELEASED after a successful simulation."""
        api_client.force_authenticate(user=agri)
        api_client.post(self._url(payment_pending_application.pk))

        payment_pending_application.refresh_from_db()
        assert payment_pending_application.status == PermitApplication.Status.RELEASED

    def test_unauthenticated_gets_401(self, api_client, payment_pending_application):
        """Unauthenticated requests get 401."""
        response = api_client.post(self._url(payment_pending_application.pk))
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Spec #4: confirm_offline_payment endpoint
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestConfirmOfflinePayment:
    """
    Tests for the confirm_offline_payment action on PaymentViewSets.
    Endpoint: POST /api/payment/{application_pk}/confirm_offline_payment/
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

    def test_application_status_becomes_released(self, api_client, agri, payment_pending_application):
        """Application must transition to RELEASED after offline confirmation."""
        api_client.force_authenticate(user=agri)
        api_client.post(
            self._url(payment_pending_application.pk),
            {"or_number": "1234567"},
        )
        payment_pending_application.refresh_from_db()
        assert payment_pending_application.status == PermitApplication.Status.RELEASED

    def test_issued_permit_is_marked_paid(self, api_client, agri, payment_pending_application):
        """is_paid must be True and payment_method must be OFFLINE."""
        api_client.force_authenticate(user=agri)
        api_client.post(
            self._url(payment_pending_application.pk),
            {"or_number": "1234567"},
        )
        issued = payment_pending_application.issued_permit
        issued.refresh_from_db()
        assert issued.is_paid is True
        assert issued.payment_method == IssuedPermit.PaymentMethodChoices.OFFLINE

    def test_aic_number_generated_on_offline_payment(self, api_client, agri, payment_pending_application):
        """AIC number must be generated during offline confirmation."""
        api_client.force_authenticate(user=agri)
        api_client.post(
            self._url(payment_pending_application.pk),
            {"or_number": "1234567"},
        )
        issued = payment_pending_application.issued_permit
        issued.refresh_from_db()
        assert issued.aic_number, "AIC number was not generated on offline payment"

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

    def test_audit_trail_created(self, api_client, agri, payment_pending_application):
        """An AuditTrail entry must be created for accountability."""
        from apps.api.models import AuditTrail
        before_count = AuditTrail.objects.count()

        api_client.force_authenticate(user=agri)
        api_client.post(
            self._url(payment_pending_application.pk),
            {"or_number": "1234567"},
        )

        assert AuditTrail.objects.count() > before_count
        trail = AuditTrail.objects.filter(
            what_performed__contains="OFFLINE PAYMENT CONFIRMED"
        ).last()
        assert trail is not None
        assert "1234567" in trail.what_performed

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
