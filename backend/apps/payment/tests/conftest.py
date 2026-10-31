"""Fixtures shared by the payment endpoint tests."""
import uuid
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.payment.models import PaymentHistory
from apps.permits.models import IssuedPermit, PermitApplication

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()



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
