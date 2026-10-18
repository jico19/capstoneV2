import os
from django.conf import settings
from django.test import TestCase
from rest_framework_simplejwt.tokens import AccessToken
from django.utils import timezone
from apps.api.models import User
from apps.permits.models import PermitApplication, TransportOrigin, SubmittedDocument
from apps.maps.models import Barangay


class SecureServeMediaTests(TestCase):
    def setUp(self):
        self.barangay = Barangay.objects.create(name="Test Barangay")
        self.staff_user = User.objects.create_user(
            username="agri_staff",
            password="password123",
            role="Agri",
        )
        self.farmer_a = User.objects.create_user(
            username="farmer_a",
            password="password123",
            role="Farmer",
            barangay=self.barangay,
        )
        self.farmer_b = User.objects.create_user(
            username="farmer_b",
            password="password123",
            role="Farmer",
            barangay=self.barangay,
        )

        # Create sample physical test files in MEDIA_ROOT
        self.test_dir = os.path.join(settings.MEDIA_ROOT, "test_docs")
        os.makedirs(self.test_dir, exist_ok=True)
        self.test_file_path = os.path.join(self.test_dir, "doc_a.pdf")
        with open(self.test_file_path, "wb") as f:
            f.write(b"%PDF-1.4 test content")

        # Create application, origin, and submitted document for farmer A
        self.app_a = PermitApplication.objects.create(
            farmer=self.farmer_a,
            status="PENDING",
            transport_date=timezone.now().date(),
            destination="Manila",
        )
        self.origin_a = TransportOrigin.objects.create(
            application=self.app_a,
            barangay=self.barangay,
            number_of_pigs=5,
        )
        self.doc_a = SubmittedDocument.objects.create(
            origin=self.origin_a,
            document_type="cis",
            file="test_docs/doc_a.pdf",
        )

    def tearDown(self):
        if os.path.exists(self.test_file_path):
            try:
                os.remove(self.test_file_path)
            except OSError:
                pass
        if os.path.exists(self.test_dir):
            try:
                os.rmdir(self.test_dir)
            except OSError:
                pass

    def test_unauthenticated_request_returns_401(self):
        response = self.client.get("/media/test_docs/doc_a.pdf")
        self.assertEqual(response.status_code, 401)
        self.assertIn("Authentication credentials were not provided", response.json().get("detail", ""))


    def test_invalid_token_returns_401(self):
        response = self.client.get("/media/test_docs/doc_a.pdf?token=invalid_token_string")
        self.assertEqual(response.status_code, 401)


    def test_valid_query_param_token_staff_access_success(self):
        token = str(AccessToken.for_user(self.staff_user))
        response = self.client.get(f"/media/test_docs/doc_a.pdf?token={token}")
        self.assertEqual(response.status_code, 200)


    def test_valid_auth_header_staff_access_success(self):
        token = str(AccessToken.for_user(self.staff_user))
        response = self.client.get("/media/test_docs/doc_a.pdf", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(response.status_code, 200)


    def test_farmer_can_access_own_file_with_query_token(self):
        token = str(AccessToken.for_user(self.farmer_a))
        response = self.client.get(f"/media/test_docs/doc_a.pdf?token={token}")
        self.assertEqual(response.status_code, 200)


    def test_farmer_cannot_access_other_farmer_file(self):
        token = str(AccessToken.for_user(self.farmer_b))
        response = self.client.get(f"/media/test_docs/doc_a.pdf?token={token}")
        self.assertEqual(response.status_code, 403)
        self.assertIn("You do not have permission", response.json().get("detail", ""))

