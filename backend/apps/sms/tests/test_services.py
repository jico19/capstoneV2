"""SMS gateway rate limiting."""
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.sms.models import SMSLog
from apps.sms.services import send_sms


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
