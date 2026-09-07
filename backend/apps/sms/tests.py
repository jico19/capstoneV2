from django.test import TestCase
from unittest.mock import patch
from apps.sms.task import send_source_farmer_scan_sms


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
