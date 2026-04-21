from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.api.models import User
from django.core.cache import cache
from unittest.mock import patch

class UserOTPTests(APITestCase):
    def setUp(self):
        # Clear cache before each test to ensure isolation
        cache.clear()
        self.phone_no = "09123456789"
        self.normalized_phone = "+639123456789"

    @patch('requests.post')
    def test_otp_registration_happy_path(self, mock_sms_post):
        """Test the full happy path: Send OTP -> Verify OTP -> Register"""
        
        # 1. Send OTP
        mock_sms_post.return_value.status_code = 202
        send_url = reverse('user-send-otp')
        send_data = {'phone_no': self.phone_no}
        
        response = self.client.post(send_url, send_data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("OTP successfully sent", response.data['msg'])
        
        # Verify OTP is in cache (using normalized phone as key)
        cached_otp = cache.get(f"otp_{self.normalized_phone}")
        self.assertIsNotNone(cached_otp)
        
        # 2. Verify OTP
        verify_url = reverse('user-verify-otp')
        verify_data = {
            'phone_no': self.phone_no,
            'otp': cached_otp
        }
        
        response = self.client.post(verify_url, verify_data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_verified'])
        
        # Verify OTP is removed from cache after verification
        self.assertIsNone(cache.get(f"otp_{self.normalized_phone}"))
        
        # 3. Register User
        register_url = reverse('user-list') # ModelViewSet create is at root
        register_data = {
            'username': 'test_farmer',
            'password': 'password123',
            'phone_no': self.phone_no,
            'first_name': 'Juan',
            'last_name': 'Dela Cruz'
        }
        
        response = self.client.post(register_url, register_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='test_farmer').exists())
        
        user = User.objects.get(username='test_farmer')
        self.assertEqual(user.first_name, 'Juan')
        self.assertEqual(user.last_name, 'Dela Cruz')
        self.assertEqual(user.phone_no, self.phone_no)

    def test_verify_otp_invalid(self):
        """Test verification with incorrect OTP"""
        # Set a dummy OTP in cache
        cache.set(f"otp_{self.normalized_phone}", 123456, timeout=300)
        
        url = reverse('user-verify-otp')
        data = {
            'phone_no': self.phone_no,
            'otp': 999999 # Wrong OTP
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], "Invalid verification code.")

    def test_verify_otp_expired(self):
        """Test verification with expired/missing OTP"""
        url = reverse('user-verify-otp')
        data = {
            'phone_no': self.phone_no,
            'otp': 123456
        }
        
        # No OTP in cache
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], "OTP has expired or hasn't been requested.")
