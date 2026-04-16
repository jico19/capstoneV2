import uuid
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.api.models import User, Notification
from apps.maps.models import Barangay
from apps.permits.models import PermitApplication, SubmittedDocument, IssuedPermit
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import patch
from datetime import date

class PermitApplicationTests(APITestCase):
    def setUp(self):
        self.barangay = Barangay.objects.create(name="Sariaya")
        
        self.farmer = User.objects.create_user(
            username='farmer', 
            password='password123', 
            role='Farmer',
            barangay=self.barangay
        )
        self.agri = User.objects.create_user(
            username='agri', 
            password='password123', 
            role='Agri'
        )
        self.opv = User.objects.create_user(
            username='opv', 
            password='password123', 
            role='Opv'
        )
        
        self.application = PermitApplication.objects.create(
            farmer=self.farmer,
            origin_barangay=self.barangay,
            destination="Manila",
            number_of_pigs=5,
            transport_date=date.today(),
            status=PermitApplication.Status.SUBMITTED
        )

    def test_list_applications_farmer(self):
        """Farmers should only see their own applications."""
        other_farmer = User.objects.create_user(username='other', password='password', role='Farmer')
        PermitApplication.objects.create(
            farmer=other_farmer,
            origin_barangay=self.barangay,
            destination="Other",
            number_of_pigs=2,
            transport_date=date.today()
        )
        
        self.client.force_authenticate(user=self.farmer)
        url = reverse('permitapplication-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['application_id'], self.application.application_id)

    def test_list_applications_agri(self):
        """Agri users should see all applications."""
        self.client.force_authenticate(user=self.agri)
        url = reverse('permitapplication-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_list_applications_opv(self):
        """Opv users should only see applications with specific statuses."""
        # Create an application that Opv should NOT see
        PermitApplication.objects.create(
            farmer=self.farmer,
            origin_barangay=self.barangay,
            destination="Private",
            number_of_pigs=1,
            transport_date=date.today(),
            status=PermitApplication.Status.DRAFT
        )
        
        # Create an application that Opv SHOULD see
        app_for_opv = PermitApplication.objects.create(
            farmer=self.farmer,
            origin_barangay=self.barangay,
            destination="Public",
            number_of_pigs=1,
            transport_date=date.today(),
            status=PermitApplication.Status.FORWARDED_TO_OPV
        )
        
        self.client.force_authenticate(user=self.opv)
        url = reverse('permitapplication-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check that only FORWARDED_TO_OPV (or other allowed statuses) are returned
        allowed_statuses = ["OPV_REJECTED", "OPV_VALIDATED", "FORWARDED_TO_OPV"]
        for app in response.data:
            self.assertIn(app['status'], allowed_statuses)

    @patch('apps.permits.services.transaction.on_commit')
    @patch('apps.permits.services.extract_document_info')
    def test_create_application_success(self, mock_task, mock_on_commit):
        # Make on_commit execute the function immediately
        mock_on_commit.side_effect = lambda f: f()
        
        self.client.force_authenticate(user=self.farmer)
        url = reverse('permitapplication-list')
        
        # Need 5 files as per services.py: if not files or len(files) < 5:
        data = {
            'origin_barangay': self.barangay.id,
            'destination': 'Batangas',
            'number_of_pigs': 10,
            'transport_date': date.today().isoformat(),
            'purpose': 'Sale',
            'traders_pass': SimpleUploadedFile('traders.jpg', b'content', content_type='image/jpeg'),
            'handlers_license': SimpleUploadedFile('handlers.jpg', b'content', content_type='image/jpeg'),
            'transport_carrier_reg': SimpleUploadedFile('carrier.jpg', b'content', content_type='image/jpeg'),
            'cis': SimpleUploadedFile('cis.jpg', b'content', content_type='image/jpeg'),
            'endorsement_cert': SimpleUploadedFile('endorsement.jpg', b'content', content_type='image/jpeg'),
        }
        
        response = self.client.post(url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, 'ok!!')
        self.assertTrue(PermitApplication.objects.filter(destination='Batangas').exists())
        # mock_task.enqueue should be called 5 times because of our on_commit mock
        self.assertEqual(mock_task.enqueue.call_count, 5)

    def test_create_application_missing_files(self):
        self.client.force_authenticate(user=self.farmer)
        url = reverse('permitapplication-list')
        
        data = {
            'origin_barangay': self.barangay.id,
            'destination': 'Quezon',
            'number_of_pigs': 10,
            'transport_date': date.today().isoformat(),
            'purpose': 'Sale',
            'traders_pass': SimpleUploadedFile('test.jpg', b'content', content_type='image/jpeg'),
        }
        
        response = self.client.post(url, data, format='multipart')
        
        # In this case, services.create_permit raises ValidationError, 
        # which HAS .detail attribute, so it should return 400.
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_forward_action(self):
        # Forward works if status is OCR_VALIDATED or MANUAL
        self.application.status = PermitApplication.Status.OCR_VALIDATED
        self.application.save()
        
        self.client.force_authenticate(user=self.agri)
        url = reverse('permitapplication-forward', args=[self.application.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, PermitApplication.Status.FORWARDED_TO_OPV)

    def test_approve_action_agri(self):
        self.client.force_authenticate(user=self.agri)
        url = reverse('permitapplication-approve', args=[self.application.id])
        data = {'remarks': 'Approved by Agri'}
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, PermitApplication.Status.FORWARDED_TO_OPV)
        
        # Check notification
        self.assertTrue(Notification.objects.filter(recipient=self.farmer, title="Application Approved").exists())

    def test_reject_action_agri(self):
        self.client.force_authenticate(user=self.agri)
        url = reverse('permitapplication-reject', args=[self.application.id])
        data = {'remarks': 'Please re-upload documents'}
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, PermitApplication.Status.RESUBMISSION)
        
        # Check notification
        self.assertTrue(Notification.objects.filter(recipient=self.farmer, title="Application Requires Resubmission").exists())

    def test_verify_action(self):
        qr_token = str(uuid.uuid4())
        issued_permit = IssuedPermit.objects.create(
            permit_number="TEST-123",
            application=self.application,
            issued_by=self.agri,
            qr_token=qr_token
        )
        
        self.client.force_authenticate(user=self.farmer)
        url = reverse('permitapplication-verify', args=[qr_token])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['application_id'], self.application.application_id)
