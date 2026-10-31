"""AIC and MAO certificate number format, sequence, and uniqueness."""
import uuid
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.permits.models import IssuedPermit, PermitApplication
from apps.permits.services.numbers import get_aic_number, get_mao_cert_number

User = get_user_model()


@pytest.fixture
def farmer(db):
    return User.objects.create_user(username="number_farmer", password="pw", role="Farmer")


@pytest.fixture
def agri(db):
    return User.objects.create_user(username="number_agri", password="pw", role="Agri")


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
            transport_date=timezone.localdate() + timedelta(days=3),
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

        today = timezone.localdate()
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


    def test_counter_increments_correctly(self, agri, farmer):
        """
        Third permit of the day should get counter '003'.
        """
        from django.db import transaction

        today = timezone.localdate()

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


@pytest.mark.django_db
def test_get_mao_cert_number():
    today = timezone.localdate()
    date_str = today.strftime("%Y%m%d")
    cert_num_1 = get_mao_cert_number()
    assert cert_num_1 == f"OMA-ANN-ASFCert-{date_str}-01"
    cert_num_2 = get_mao_cert_number()
    assert cert_num_2 == f"OMA-ANN-ASFCert-{date_str}-02"
