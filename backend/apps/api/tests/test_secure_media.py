import os
from django.conf import settings
from django.test import TestCase
from rest_framework_simplejwt.tokens import AccessToken
from django.utils import timezone
from apps.api.models import User
from apps.permits.models import PermitApplication, TransportOrigin, SubmittedDocument, OPVValidation
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

    def test_owner_can_view_generated_certificate_and_opv_files(self):
        # Use a distinct file so SubmittedDocument ownership cannot mask a failure.
        path = 'test_docs/official.pdf'
        with open(os.path.join(self.test_dir, 'official.pdf'), 'wb') as f:
            f.write(b'%PDF-1.4 official')
        try:
            self.app_a.mao_certificate_pdf = path
            self.app_a.save()
            opv = OPVValidation.objects.create(application=self.app_a)
            for field in ['mao_certificate_pdf', 'veterinary_health_certificate', 'transportation_pass']:
                self.app_a.mao_certificate_pdf = path if field == 'mao_certificate_pdf' else ''
                self.app_a.save()
                opv.veterinary_health_certificate = path if field == 'veterinary_health_certificate' else ''
                opv.transportation_pass = path if field == 'transportation_pass' else ''
                opv.save()
                for user, expected in [(self.farmer_a, 200), (self.farmer_b, 403)]:
                    response = self.client.get('/media/' + path, {'token': str(AccessToken.for_user(user))})
                    self.assertEqual(response.status_code, expected, field)
                    if expected == 200:
                        self.assertTrue(b''.join(response.streaming_content).startswith(b'%PDF-'))
        finally:
            os.remove(os.path.join(self.test_dir, 'official.pdf'))

    def test_owner_token_takes_precedence_over_other_farmer_session(self):
        self.client.force_login(self.farmer_b)
        token = str(AccessToken.for_user(self.farmer_a))
        response = self.client.get('/media/test_docs/doc_a.pdf', {'token': token})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(b''.join(response.streaming_content).startswith(b'%PDF-'))

    def test_other_farmer_token_cannot_use_owner_session(self):
        self.client.force_login(self.farmer_a)
        token = str(AccessToken.for_user(self.farmer_b))
        response = self.client.get('/media/test_docs/doc_a.pdf', {'token': token})
        self.assertEqual(response.status_code, 403)

    def test_invalid_token_does_not_fall_back_to_staff_session(self):
        self.client.force_login(self.staff_user)
        response = self.client.get('/media/test_docs/doc_a.pdf', {'token': 'invalid'})
        self.assertEqual(response.status_code, 401)

    def test_session_still_works_without_token(self):
        self.client.force_login(self.farmer_a)
        response = self.client.get('/media/test_docs/doc_a.pdf')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(b''.join(response.streaming_content).startswith(b'%PDF-'))

    def test_header_takes_precedence_over_query_and_session(self):
        self.client.force_login(self.farmer_a)
        response = self.client.get(
            '/media/test_docs/doc_a.pdf',
            {'token': str(AccessToken.for_user(self.farmer_a))},
            HTTP_AUTHORIZATION=f'Bearer {AccessToken.for_user(self.farmer_b)}',
        )
        self.assertEqual(response.status_code, 403)


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

