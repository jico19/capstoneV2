import pytest
from django.utils import timezone
from datetime import timedelta
from apps.payment import models as payment_models
from apps.payment.services import check_and_handle_payment_expiration
from apps.permits.models import PermitApplication, IssuedPermit
from apps.api.models import User

@pytest.mark.django_db
class TestPaymentExpiration:

    def test_payment_deadline_auto_initialization(self, db):
        farmer = User.objects.create_user(username="farmer_test", role="Farmer")
        application = PermitApplication.objects.create(
            farmer=farmer,
            destination="Lucena",
            transport_date=timezone.now().date() + timedelta(days=2),
            status=PermitApplication.Status.PAYMENT_PENDING
        )
        issued_permit = IssuedPermit.objects.create(
            permit_number="PMT-EXP-00001",
            application=application,
            qr_token="qr-token-test-1",
            permit_fee=150.00
        )
        assert issued_permit.payment_deadline is not None
        assert issued_permit.payment_deadline > timezone.now()

    def test_check_expiration_active_payment(self, db):
        farmer = User.objects.create_user(username="farmer_test2", role="Farmer")
        application = PermitApplication.objects.create(
            farmer=farmer,
            destination="Lucena",
            transport_date=timezone.now().date() + timedelta(days=2),
            status=PermitApplication.Status.PAYMENT_PENDING
        )
        issued_permit = IssuedPermit.objects.create(
            permit_number="PMT-EXP-00002",
            application=application,
            qr_token="qr-token-test-2",
            permit_fee=150.00,
            payment_deadline=timezone.now() + timedelta(hours=10)
        )
        result = check_and_handle_payment_expiration(issued_permit)
        assert result["is_expired"] is False
        assert result["time_remaining_seconds"] > 0

    def test_check_expiration_expired_payment(self, db):
        farmer = User.objects.create_user(username="farmer_test3", role="Farmer")
        application = PermitApplication.objects.create(
            farmer=farmer,
            destination="Lucena",
            transport_date=timezone.now().date() + timedelta(days=2),
            status=PermitApplication.Status.PAYMENT_PENDING
        )
        issued_permit = IssuedPermit.objects.create(
            permit_number="PMT-EXP-00003",
            application=application,
            qr_token="qr-token-test-3",
            permit_fee=150.00,
            payment_deadline=timezone.now() - timedelta(minutes=10)
        )
        payment_history = payment_models.PaymentHistory.objects.create(
            issued_permit=issued_permit,
            amount=150,
            method="ONLINE",
            status=payment_models.PaymentHistory.Status.PENDING
        )
        result = check_and_handle_payment_expiration(issued_permit)
        assert result["is_expired"] is True
        assert result["time_remaining_seconds"] == 0
        payment_history.refresh_from_db()
        assert payment_history.status == payment_models.PaymentHistory.Status.FAILED
