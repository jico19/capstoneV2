from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.api.models import User
from django.core.cache import cache
from unittest.mock import patch
from rest_framework_simplejwt.tokens import RefreshToken

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


class UserTokenRefreshTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='temp_user',
            password='password123',
            phone_no='09111111111'
        )
        self.refresh = RefreshToken.for_user(self.user)

    def test_refresh_token_valid_user(self):
        url = reverse('token_refresh')
        data = {'refresh': str(self.refresh)}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_refresh_token_deleted_user(self):
        # Delete user to simulate a stale refresh token
        self.user.delete()
        
        url = reverse('token_refresh')
        data = {'refresh': str(self.refresh)}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn(response.data.get('code'), ['token_not_valid', 'not_authenticated'])


from django.core.files.uploadedfile import SimpleUploadedFile
from apps.api.models import FarmerDocument
from apps.maps.models import Barangay


class KYCVerificationTests(APITestCase):
    def setUp(self):
        self.barangay = Barangay.objects.create(name="Balubal")
        self.farmer = User.objects.create_user(
            username="test_farmer_kyc",
            password="password123",
            role="Farmer",
            phone_no="09191234567",
            barangay=self.barangay,
            verification_status=User.VerificationStatus.UNVERIFIED,
        )
        self.agri = User.objects.create_user(
            username="test_agri_officer",
            password="password123",
            role="Agri",
            phone_no="09197654321",
        )

    def test_new_farmer_is_unverified(self):
        self.assertEqual(self.farmer.verification_status, User.VerificationStatus.UNVERIFIED)

    def test_farmer_document_upload_sets_pending_review(self):
        self.client.force_authenticate(user=self.farmer)

        dummy_file = SimpleUploadedFile("license.jpg", b"fake image content", content_type="image/jpeg")
        dummy_file2 = SimpleUploadedFile("transport.jpg", b"fake transport content", content_type="image/jpeg")
        dummy_file3 = SimpleUploadedFile("traders.jpg", b"fake trader content", content_type="image/jpeg")

        url = reverse("user-documents")
        data = {
            "handlers_license": dummy_file,
            "handlers_license_expiry": "2027-01-01",
            "transport_carrier_reg": dummy_file2,
            "transport_carrier_reg_expiry": "2027-02-01",
            "traders_pass": dummy_file3,
            "traders_pass_expiry": "2027-03-01",
        }

        response = self.client.post(url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.farmer.refresh_from_db()
        self.assertEqual(self.farmer.verification_status, User.VerificationStatus.PENDING_REVIEW)
        self.assertEqual(self.farmer.farmer_documents.count(), 3)

    def test_agri_can_verify_and_reject_documents(self):
        FarmerDocument.objects.create(
            user=self.farmer,
            document_type=FarmerDocument.DocumentType.HANDLERS_LICENSE,
            file=SimpleUploadedFile("h.jpg", b"h"),
        )
        FarmerDocument.objects.create(
            user=self.farmer,
            document_type=FarmerDocument.DocumentType.TRANSPORT_CARRIER_REG,
            file=SimpleUploadedFile("t.jpg", b"t"),
        )
        FarmerDocument.objects.create(
            user=self.farmer,
            document_type=FarmerDocument.DocumentType.TRADERS_PASS,
            file=SimpleUploadedFile("p.jpg", b"p"),
        )
        self.farmer.verification_status = User.VerificationStatus.PENDING_REVIEW
        self.farmer.save()

        # Farmer cannot verify own documents
        self.client.force_authenticate(user=self.farmer)
        verify_url = reverse("user-verify-documents", kwargs={"pk": self.farmer.pk})
        res = self.client.post(verify_url, {"action": "approve"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Agri officer can approve
        self.client.force_authenticate(user=self.agri)
        res = self.client.post(verify_url, {"action": "approve", "remarks": "All documents verified."})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.farmer.refresh_from_db()
        self.assertEqual(self.farmer.verification_status, User.VerificationStatus.VERIFIED)
        self.assertEqual(self.farmer.verified_by, self.agri)
        self.assertTrue(all(d.is_verified for d in self.farmer.farmer_documents.all()))

        # Agri officer can reject if needed
        res = self.client.post(verify_url, {"action": "reject", "remarks": "Trader pass expired."})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.farmer.refresh_from_db()
        self.assertEqual(self.farmer.verification_status, User.VerificationStatus.REJECTED)
        self.assertEqual(self.farmer.verification_remarks, "Trader pass expired.")

    def test_agri_can_approve_documents_with_document_updates(self):
        doc = FarmerDocument.objects.create(
            user=self.farmer,
            document_type=FarmerDocument.DocumentType.HANDLERS_LICENSE,
            file=SimpleUploadedFile("h.jpg", b"h"),
        )
        self.farmer.verification_status = User.VerificationStatus.PENDING_REVIEW
        self.farmer.save()

        self.client.force_authenticate(user=self.agri)
        verify_url = reverse("user-verify-documents", kwargs={"pk": self.farmer.pk})
        payload = {
            "action": "approve",
            "remarks": "Verified with updated expiration date and license no.",
            "document_updates": {
                "handlers_license": {
                    "license_number": "BAI-2026-999",
                    "expiration_date": "2027-12-31"
                }
            }
        }
        res = self.client.post(verify_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.farmer.refresh_from_db()
        self.assertEqual(self.farmer.verification_status, User.VerificationStatus.VERIFIED)

        doc.refresh_from_db()
        self.assertEqual(doc.license_number, "BAI-2026-999")
        self.assertEqual(str(doc.expiration_date), "2027-12-31")


class KYCLifecycleLockdownTests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            username="lock_farmer",
            password="password123",
            role="Farmer",
            phone_no="09191234001",
            verification_status=User.VerificationStatus.UNVERIFIED,
        )
        self.agri = User.objects.create_user(
            username="lock_agri",
            password="password123",
            role="Agri",
            phone_no="09197654001",
        )

    def test_public_registration_ignores_client_kyc_and_active_flags(self):
        url = reverse("user-list")
        payload = {
            "username": "sneaky_farmer",
            "password": "password123",
            "phone_no": "09191234002",
            "first_name": "Sneaky",
            "last_name": "Farmer",
            "role": "Farmer",
            "verification_status": User.VerificationStatus.VERIFIED,
            "is_active": False,
            "verification_remarks": "I am legit",
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(username="sneaky_farmer")
        self.assertEqual(user.role, "Farmer")
        self.assertEqual(user.verification_status, User.VerificationStatus.UNVERIFIED)
        self.assertTrue(user.is_active)
        self.assertEqual(user.verification_remarks, "")

    def test_farmer_patch_cannot_flip_own_kyc_or_active(self):
        self.client.force_authenticate(user=self.farmer)
        url = reverse("user-detail", kwargs={"pk": self.farmer.pk})

        response = self.client.patch(
            url,
            {"verification_status": User.VerificationStatus.VERIFIED, "is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.farmer.refresh_from_db()
        self.assertEqual(self.farmer.verification_status, User.VerificationStatus.UNVERIFIED)
        self.assertTrue(self.farmer.is_active)

    def test_agri_created_barangay_official_is_verified(self):
        self.client.force_authenticate(user=self.agri)
        url = reverse("user-list")
        payload = {
            "username": "brgy_captain",
            "password": "password123",
            "phone_no": "09191234003",
            "first_name": "Barangay",
            "last_name": "Captain",
            "role": "Barangay",
            "verification_status": User.VerificationStatus.UNVERIFIED,
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(username="brgy_captain")
        self.assertEqual(user.role, "Barangay")
        self.assertEqual(user.verification_status, User.VerificationStatus.VERIFIED)
