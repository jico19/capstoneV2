from django.test import TestCase
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from apps.permits.models import PermitApplication
from apps.sms.models import SMSLog
from apps.sms.services import send_sms
from apps.sms.task import (
    send_via_status,
    send_scan_notification_sms,
    send_source_farmer_scan_sms,
)

User = get_user_model()


class TestSourceFarmerScanSMS(TestCase):
    @patch('apps.sms.task.send_sms')
    def test_send_source_farmer_scan_sms(self, mock_send_sms):
        mock_send_sms.return_value = True

        send_source_farmer_scan_sms.func(
            phone_number="09123456789",
            application_id="LP-2026-TEST01",
            source_farmer_name="Mang Ambo",
            timestamp_str="2026-09-07 10:00"
        )

        mock_send_sms.assert_called_once()
        args, kwargs = mock_send_sms.call_args
        assert kwargs['phone_number'] == "09123456789"
        assert "Mang Ambo" in kwargs['message']
        assert "LP-2026-TEST01" in kwargs['message']


class TestSendViaStatus(TestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            username='farmer_sms',
            password='password123',
            role='Farmer',
            phone_no='09123456789',
            receive_sms=True,
        )
        self.application = PermitApplication.objects.create(
            farmer=self.farmer,
            destination="Lucena City",
            transport_date=timezone.now().date(),
            purpose="Slaughter",
            status=PermitApplication.Status.FORWARDED_TO_OPV,
            aic_number="09-09-001-26"
        )

    @patch('apps.sms.task.send_sms')
    def test_send_via_status_opt_out(self, mock_send_sms):
        self.farmer.receive_sms = False
        self.farmer.save()

        send_via_status.func(self.application.id)
        mock_send_sms.assert_not_called()

    @patch('apps.sms.task.send_sms')
    def test_send_via_status_success_and_logging(self, mock_send_sms):
        mock_send_sms.return_value = True

        send_via_status.func(self.application.id)

        mock_send_sms.assert_called_once()
        _, kwargs = mock_send_sms.call_args
        assert kwargs['phone_number'] == "09123456789"
        assert "09-09-001-26" in kwargs['message']
        assert len(kwargs['message']) <= 160

        log = SMSLog.objects.filter(application=self.application).first()
        assert log is not None
        assert log.phone_number == "09123456789"
        assert log.status_captured == PermitApplication.Status.FORWARDED_TO_OPV
        assert log.message_type == SMSLog.Type.NOTIFICATION

    @patch('apps.sms.task.send_sms')
    def test_scoped_deduplication_allows_other_applications(self, mock_send_sms):
        mock_send_sms.return_value = True

        # First send for application 1
        send_via_status.func(self.application.id)
        assert mock_send_sms.call_count == 1

        # Second send for application 1 at same status is suppressed
        send_via_status.func(self.application.id)
        assert mock_send_sms.call_count == 1

        # Application 2 for the SAME farmer at same status must NOT be suppressed
        app2 = PermitApplication.objects.create(
            farmer=self.farmer,
            destination="Sariaya",
            transport_date=timezone.now().date(),
            purpose="Breeding",
            status=PermitApplication.Status.FORWARDED_TO_OPV,
            aic_number="09-09-002-26"
        )
        send_via_status.func(app2.id)
        assert mock_send_sms.call_count == 2

    @patch('django_tasks.base.Task.using')
    @patch('apps.sms.task.send_sms')
    def test_retry_on_failure(self, mock_send_sms, mock_using):
        mock_send_sms.return_value = False
        mock_task_instance = MagicMock()
        mock_using.return_value = mock_task_instance

        # Attempt 1 fails -> should enqueue attempt 2
        send_via_status.func(self.application.id, attempt=1)
        mock_using.assert_called_once()
        mock_task_instance.enqueue.assert_called_once_with(self.application.id, attempt=2)

        # Attempt 3 fails -> should not retry
        mock_using.reset_mock()
        mock_task_instance.reset_mock()
        send_via_status.func(self.application.id, attempt=3)
        mock_using.assert_not_called()
        mock_task_instance.enqueue.assert_not_called()


    @patch('apps.sms.task.send_sms')
    def test_all_status_messages_within_single_sms_limit(self, mock_send_sms):
        mock_send_sms.return_value = True
        statuses_to_test = [
            PermitApplication.Status.FORWARDED_TO_OPV,
            PermitApplication.Status.OPV_VALIDATED,
            PermitApplication.Status.OPV_REJECTED,
            PermitApplication.Status.RESUBMISSION,
            PermitApplication.Status.PERMIT_ISSUED,
            PermitApplication.Status.RELEASED,
        ]

        for st in statuses_to_test:
            mock_send_sms.reset_mock()
            SMSLog.objects.all().delete()
            self.application.status = st
            self.application.save()

            send_via_status.func(self.application.id)
            mock_send_sms.assert_called_once()
            _, kwargs = mock_send_sms.call_args
            msg = kwargs['message']
            assert len(msg) <= 150, f"Message for status {st} is too long ({len(msg)} chars): '{msg}'"


class TestSMSRateLimit(TestCase):
    @patch('apps.sms.services.requests.post')
    def test_rate_limit_blocks_after_10_sms(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_post.return_value = mock_response

        phone = "09123456789"

        # Create 10 logs in the last 24h
        for _ in range(10):
            SMSLog.objects.create(
                phone_number=phone,
                message_type=SMSLog.Type.NOTIFICATION,
            )

        # 11th attempt should be blocked by rate limiter
        sent = send_sms(phone, "Test message")
        assert sent is False
        mock_post.assert_not_called()

