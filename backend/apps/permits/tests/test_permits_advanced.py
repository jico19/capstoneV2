import uuid
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import patch
from datetime import date, timedelta
from django.utils import timezone

from apps.permits import models
from apps.permits.tests.factories import (
    FarmerFactory, AgriFactory, OpvFactory, InspectorFactory, BarangayFactory,
    PermitApplicationFactory, TransportOriginFactory, SubmittedDocumentFactory,
    OPVValidationFactory, IssuedPermitFactory, OCRValidationResultFactory
)

# Mock services that might be called during viewset actions
@patch('apps.permits.services.create_permit')
@patch('apps.permits.services.resubmit_permit')
@patch('apps.permits.services.create_approve_opv_validation')
@patch('apps.permits.services.create_reject_opv_validation')
class PermitAdvancedTests(APITestCase):

    def setUp(self):
        self.barangay = BarangayFactory()
        self.farmer_user = FarmerFactory(barangay=self.barangay)
        self.agri_user = AgriFactory()
        self.opv_user = OpvFactory()
        self.inspector_user = InspectorFactory()

        # Clients for different roles
        self.farmer_client = self.client
        self.agri_client = self.client
        self.opv_client = self.client
        self.inspector_client = self.client

        # URLs
        self.permit_list_url = reverse('application-list')
        self.opv_list_url = reverse('opv-list')
        self.issued_permit_list_url = reverse('issued-permit-list')
        self.ocr_validation_list_url = reverse('ocr-validation-list')

    # --- PermitApplicationViewSets Tests ---

    def test_farmer_can_create_application_with_multiple_origins(self, mock_reject_opv, mock_approve_opv, mock_resubmit_permit, mock_create_permit):
        """
        Ensure farmer can create an application with multiple transport origins.
        """
        self.farmer_client.force_authenticate(user=self.farmer_user)
        
        mock_create_permit.return_value = None # Mock the service call
        
        future_date = (timezone.now().date() + timedelta(days=10)).isoformat()
        data = {
            'destination': 'Test Destination',
            'transport_date': future_date,
            'purpose': 'Testing nested creation',
            'origins[0][barangay]': self.barangay.id,
            'origins[0][number_of_pigs]': 5,
            'origins[1][barangay]': BarangayFactory().id, # Another barangay
            'origins[1][number_of_pigs]': 10,
            'traders_pass': SimpleUploadedFile('traders.jpg', b'content', content_type='image/jpeg'),
            'handlers_license': SimpleUploadedFile('handlers.jpg', b'content', content_type='image/jpeg'),
            'transport_carrier_reg': SimpleUploadedFile('carrier.jpg', b'content', content_type='image/jpeg'),
            'cis': SimpleUploadedFile('cis.jpg', b'content', content_type='image/jpeg'),
            'endorsement_cert': SimpleUploadedFile('endorsement.jpg', b'content', content_type='image/jpeg'),
        }
        
        response = self.farmer_client.post(self.permit_list_url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(models.PermitApplication.objects.filter(destination='Test Destination').exists())
        
        new_application = models.PermitApplication.objects.get(destination='Test Destination')
        self.assertEqual(new_application.origins.count(), 2)
        
        mock_create_permit.assert_called_once()
        self.assertEqual(new_application.status, models.PermitApplication.Status.SUBMITTED)

    def test_create_application_with_past_transport_date_fails(self, *args):
        """
        Ensure application creation fails if transport_date is in the past.
        """
        self.farmer_client.force_authenticate(user=self.farmer_user)
        
        past_date = (timezone.now().date() - timedelta(days=1)).isoformat()
        data = {
            'destination': 'Test Destination',
            'transport_date': past_date,
            'purpose': 'Invalid date test',
            'origins[0][barangay]': self.barangay.id,
            'origins[0][number_of_pigs]': 5,
        }
        
        response = self.farmer_client.post(self.permit_list_url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('transport_date', response.data['detail'])
        self.assertFalse(models.PermitApplication.objects.filter(destination='Test Destination').exists())

    def test_agri_cannot_create_application(self, *args):
        """
        Ensure Agri officer cannot create a permit application.
        """
        self.agri_client.force_authenticate(user=self.agri_user)
        future_date = (timezone.now().date() + timedelta(days=10)).isoformat()
        data = {
            'destination': 'Agri Destination',
            'transport_date': future_date,
            'purpose': 'Agri tries to create',
            'origins[0][barangay]': self.barangay.id,
            'origins[0][number_of_pigs]': 5,
        }
        response = self.agri_client.post(self.permit_list_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertFalse(models.PermitApplication.objects.filter(destination='Agri Destination').exists())

    def test_farmer_can_resubmit_application_with_updated_data(self, mock_reject_opv, mock_approve_opv, mock_resubmit_permit, mock_create_permit):
        """
        Farmer can resubmit an application in RESUBMISSION status with updated data.
        """
        application = PermitApplicationFactory(
            farmer=self.farmer_user,
            status=models.PermitApplication.Status.RESUBMISSION,
            destination="Old Destination"
        )
        origin_old = TransportOriginFactory(application=application, barangay=self.barangay, number_of_pigs=1)

        self.farmer_client.force_authenticate(user=self.farmer_user)
        
        mock_resubmit_permit.return_value = None
        
        future_date = (timezone.now().date() + timedelta(days=15)).isoformat()
        data = {
            'destination': 'New Destination',
            'transport_date': future_date,
            'origins[0][id]': origin_old.id,
            'origins[0][barangay]': self.barangay.id,
            'origins[0][number_of_pigs]': 20, # Updated
        }
        resubmit_url = reverse('application-resubmit', args=[application.pk])
        response = self.farmer_client.post(resubmit_url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        self.assertEqual(application.destination, 'New Destination')
        self.assertEqual(application.status, models.PermitApplication.Status.SUBMITTED)
        
        origin_old.refresh_from_db()
        self.assertEqual(origin_old.number_of_pigs, 20)
        self.assertEqual(application.origins.count(), 1) # Still one origin

    def test_farmer_can_resubmit_application_adding_new_origin(self, mock_reject_opv, mock_approve_opv, mock_resubmit_permit, mock_create_permit):
        """
        Farmer can resubmit an application in RESUBMISSION status by adding a new origin.
        """
        application = PermitApplicationFactory(
            farmer=self.farmer_user,
            status=models.PermitApplication.Status.RESUBMISSION,
            destination="Destination with one origin"
        )
        origin_old = TransportOriginFactory(application=application, barangay=self.barangay, number_of_pigs=1)
        new_barangay = BarangayFactory()

        self.farmer_client.force_authenticate(user=self.farmer_user)
        mock_resubmit_permit.return_value = None
        
        future_date = (timezone.now().date() + timedelta(days=15)).isoformat()
        data = {
            'destination': 'Destination with new origin',
            'transport_date': future_date,
            'origins[0][id]': origin_old.id,
            'origins[0][barangay]': self.barangay.id,
            'origins[0][number_of_pigs]': 1,
            'origins[1][barangay]': new_barangay.id,
            'origins[1][number_of_pigs]': 15, # New origin
        }
        resubmit_url = reverse('application-resubmit', args=[application.pk])
        response = self.farmer_client.post(resubmit_url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        self.assertEqual(application.destination, 'Destination with new origin')
        self.assertEqual(application.origins.count(), 2)
        self.assertTrue(application.origins.filter(barangay=new_barangay, number_of_pigs=15).exists())

    def test_farmer_can_resubmit_application_removing_origin(self, mock_reject_opv, mock_approve_opv, mock_resubmit_permit, mock_create_permit):
        """
        Farmer can resubmit an application in RESUBMISSION status by removing an origin.
        """
        application = PermitApplicationFactory(
            farmer=self.farmer_user,
            status=models.PermitApplication.Status.RESUBMISSION,
            destination="Destination with two origins"
        )
        origin1 = TransportOriginFactory(application=application, barangay=self.barangay, number_of_pigs=5)
        origin2 = TransportOriginFactory(application=application, barangay=BarangayFactory(), number_of_pigs=10)

        self.farmer_client.force_authenticate(user=self.farmer_user)
        mock_resubmit_permit.return_value = None
        
        future_date = (timezone.now().date() + timedelta(days=15)).isoformat()
        data = {
            'destination': 'Destination with one origin left',
            'transport_date': future_date,
            'origins[0][id]': origin1.id,
            'origins[0][barangay]': self.barangay.id,
            'origins[0][number_of_pigs]': 5, # Keep only this one
        }
        resubmit_url = reverse('application-resubmit', args=[application.pk])
        response = self.farmer_client.post(resubmit_url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        self.assertEqual(application.destination, 'Destination with one origin left')
        self.assertEqual(application.origins.count(), 1)
        self.assertFalse(application.origins.filter(pk=origin2.pk).exists()) # origin2 should be deleted

    def test_farmer_cannot_resubmit_non_resubmission_application(self, *args):
        """
        Farmer cannot resubmit an application that is not in RESUBMISSION status.
        """
        application = PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.SUBMITTED)
        self.farmer_client.force_authenticate(user=self.farmer_user)
        
        data = {
            'destination': 'Updated Destination',
            'transport_date': (timezone.now().date() + timedelta(days=10)).isoformat(),
        }
        resubmit_url = reverse('application-resubmit', args=[application.pk])
        response = self.farmer_client.post(resubmit_url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        application.refresh_from_db()
        self.assertEqual(application.destination, 'Updated Destination') # Update might still happen if partial=True, but status change should fail.
        self.assertNotEqual(application.status, models.PermitApplication.Status.SUBMITTED) # Ensure status is not re-set

    def test_non_farmer_cannot_resubmit_application(self, *args):
        """
        Non-farmer user cannot resubmit an application.
        """
        application = PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.RESUBMISSION)
        self.agri_client.force_authenticate(user=self.agri_user)
        
        data = {
            'destination': 'Agri tries to resubmit',
            'transport_date': (timezone.now().date() + timedelta(days=10)).isoformat(),
        }
        resubmit_url = reverse('application-resubmit', args=[application.pk])
        response = self.agri_client.post(resubmit_url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        application.refresh_from_db()
        self.assertNotEqual(application.destination, 'Agri tries to resubmit') # Ensure no update

    # --- OPVValidationViewSets Tests ---

    def test_opv_can_create_opv_validation(self, mock_reject_opv, mock_approve_opv, mock_resubmit_permit, mock_create_permit):
        """
        OPV can create an OPVValidation entry.
        """
        application = PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.FORWARDED_TO_OPV)
        self.opv_client.force_authenticate(user=self.opv_user)
        
        data = {
            'application': application.pk,
            'status': models.OPVValidation.Status.VALIDATED,
            'remarks': 'OPV remarks',
            'veterinary_health_certificate': SimpleUploadedFile('vhc.pdf', b'vhc_content', content_type='application/pdf'),
            'transportation_pass': SimpleUploadedFile('pass.pdf', b'pass_content', content_type='application/pdf'),
        }
        
        # We call the service function, not the viewset directly for approve/reject.
        # This test ensures the serializer works and the viewset allows creation.
        # However, the viewset create method is implicit in a ModelViewSet.
        # The specific actions are 'approve' and 'reject'.
        # I'll modify this test to check if OPV can create via the 'approve' action, which then calls the service.

        # Let's test the `approve` action directly, as that's how OPVValidation records are primarily created/updated.
        approve_url = reverse('opv-approve', args=[application.pk])
        response = self.opv_client.post(approve_url, data, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_approve_opv.assert_called_once()
        # Verify that an OPVValidation object might be created implicitly by the service call,
        # but the viewset doesn't directly create it via its own 'create' method.
        # We need to rely on the service mock here.
        application.refresh_from_db()
        self.assertEqual(application.status, models.PermitApplication.Status.OPV_VALIDATED)

    def test_non_opv_cannot_approve_opv_validation(self, mock_reject_opv, mock_approve_opv, mock_resubmit_permit, mock_create_permit):
        """
        Non-OPV user cannot approve an application via OPVValidationViewSets.
        """
        application = PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.FORWARDED_TO_OPV)
        self.agri_client.force_authenticate(user=self.agri_user)
        
        data = {
            'remarks': 'Agri tries to approve OPV',
        }
        approve_url = reverse('opv-approve', args=[application.pk])
        response = self.agri_client.post(approve_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        mock_approve_opv.assert_not_called()
        application.refresh_from_db()
        self.assertNotEqual(application.status, models.PermitApplication.Status.OPV_VALIDATED)

    def test_opv_can_reject_opv_validation(self, mock_reject_opv, mock_approve_opv, mock_resubmit_permit, mock_create_permit):
        """
        OPV can reject an application via OPVValidationViewSets.
        """
        application = PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.FORWARDED_TO_OPV)
        self.opv_client.force_authenticate(user=self.opv_user)
        
        data = {
            'remarks': 'OPV rejected due to health concerns',
        }
        reject_url = reverse('opv-reject', args=[application.pk])
        response = self.opv_client.post(reject_url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_reject_opv.assert_called_once()
        application.refresh_from_db()
        self.assertEqual(application.status, models.PermitApplication.Status.OPV_REJECTED)

    def test_opv_application_action_lists_correct_statuses(self, *args):
        """
        OPV 'application' action should list only applications with OPV-related statuses.
        """
        PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.SUBMITTED)
        PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.DRAFT)
        opv_app_1 = PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.FORWARDED_TO_OPV)
        opv_app_2 = PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.OPV_REJECTED)

        self.opv_client.force_authenticate(user=self.opv_user)
        opv_application_url = reverse('opv-application')
        response = self.opv_client.get(opv_application_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertIn(opv_app_1.application_id, [app['application_id'] for app in response.data])
        self.assertIn(opv_app_2.application_id, [app['application_id'] for app in response.data])
        
    # --- IssuedPermitViewSets Tests ---

    def test_agri_can_issue_permit_for_opv_validated_application(self, *args):
        """
        Agri officer can issue a permit for an application that is OPV_VALIDATED.
        """
        application = PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.OPV_VALIDATED)
        self.agri_client.force_authenticate(user=self.agri_user)
        
        data = {
            'application_id': application.pk,
            'payment_method': models.IssuedPermit.PaymentMethodChoices.OFFLINE,
            'valid_until': (timezone.now().date() + timedelta(days=30)).isoformat(),
        }
        
        response = self.agri_client.post(self.issued_permit_list_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(models.IssuedPermit.objects.filter(application=application).exists())
        application.refresh_from_db()
        self.assertEqual(application.status, models.PermitApplication.Status.PAYMENT_PENDING)

    def test_agri_cannot_issue_permit_for_non_opv_validated_application(self, *args):
        """
        Agri officer cannot issue a permit for an application not in OPV_VALIDATED status.
        """
        application = PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.FORWARDED_TO_OPV)
        self.agri_client.force_authenticate(user=self.agri_user)
        
        data = {
            'application_id': application.pk,
            'payment_method': models.IssuedPermit.PaymentMethodChoices.OFFLINE,
            'valid_until': (timezone.now().date() + timedelta(days=30)).isoformat(),
        }
        
        response = self.agri_client.post(self.issued_permit_list_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertFalse(models.IssuedPermit.objects.filter(application=application).exists())
        application.refresh_from_db()
        self.assertEqual(application.status, models.PermitApplication.Status.FORWARDED_TO_OPV) # Status should not change

    def test_agri_cannot_issue_duplicate_permit(self, *args):
        """
        Agri officer cannot issue a permit if one already exists for the application.
        """
        application = PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.OPV_VALIDATED)
        IssuedPermitFactory(application=application) # Create an existing permit
        self.agri_client.force_authenticate(user=self.agri_user)
        
        data = {
            'application_id': application.pk,
            'payment_method': models.IssuedPermit.PaymentMethodChoices.OFFLINE,
            'valid_until': (timezone.now().date() + timedelta(days=30)).isoformat(),
        }
        
        response = self.agri_client.post(self.issued_permit_list_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(models.IssuedPermit.objects.filter(application=application).count(), 1) # Still only one permit

    def test_non_agri_cannot_issue_permit(self, *args):
        """
        Non-Agri user cannot issue a permit.
        """
        application = PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.OPV_VALIDATED)
        self.opv_client.force_authenticate(user=self.opv_user)
        
        data = {
            'application_id': application.pk,
            'payment_method': models.IssuedPermit.PaymentMethodChoices.OFFLINE,
            'valid_until': (timezone.now().date() + timedelta(days=30)).isoformat(),
        }
        
        response = self.opv_client.post(self.issued_permit_list_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertFalse(models.IssuedPermit.objects.filter(application=application).exists())

    def test_retrieve_issued_permit_documents_unpaid_fails(self, *args):
        """
        Retrieving issued permit documents should fail if the permit is unpaid.
        """
        application = PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.PAYMENT_PENDING)
        opv_validation = OPVValidationFactory(application=application)
        issued_permit = IssuedPermitFactory(application=application, is_paid=False)

        self.farmer_client.force_authenticate(user=self.farmer_user)
        retrieve_url = reverse('issued-permit-detail', args=[application.pk])
        response = self.farmer_client.get(retrieve_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], "This permit has not been paid for yet.")

    def test_retrieve_issued_permit_documents_pdf_not_generated(self, *args):
        """
        Retrieving issued permit documents should return 202 if PDF is not yet generated.
        """
        application = PermitApplicationFactory(farmer=self.farmer_user, status=models.PermitApplication.Status.PAYMENT_PENDING)
        opv_validation = OPVValidationFactory(application=application)
        issued_permit = IssuedPermitFactory(application=application, is_paid=True, permit_pdf=None) # No PDF yet

        self.farmer_client.force_authenticate(user=self.farmer_user)
        retrieve_url = reverse('issued-permit-detail', args=[application.pk])
        response = self.farmer_client.get(retrieve_url)

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], "Permit PDF is still being generated. Please try again in a moment.")

    # --- OCRValidationResultViewSets Tests ---

    def test_agri_can_override_ocr_validation_result(self, *args):
        """
        Agri officer can manually override an OCR validation result.
        """
        submitted_document = SubmittedDocumentFactory()
        ocr_result = OCRValidationResultFactory(
            document=submitted_document,
            status=models.OCRValidationResult.ValidationStatus.MANUAL,
            extracted_field={'name': 'Incorrect Name'}
        )
        
        self.agri_client.force_authenticate(user=self.agri_user)
        override_url = reverse('ocr-validation-detail', args=[ocr_result.pk])
        new_extracted_data = {'name': 'Correct Name', 'address': 'Some Address'}
        
        response = self.agri_client.patch(override_url, new_extracted_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ocr_result.refresh_from_db()
        self.assertEqual(ocr_result.status, models.OCRValidationResult.ValidationStatus.OVERRIDDEN)
        self.assertTrue(ocr_result.manually_overridden)
        self.assertEqual(ocr_result.overridden_by, self.agri_user)
        self.assertEqual(ocr_result.extracted_field, {'name': 'Correct Name', 'address': 'Some Address'})
        self.assertEqual(ocr_result.overridden_fields, {'name': 'Correct Name', 'address': 'Some Address'})

    def test_non_agri_cannot_override_ocr_validation_result(self, *args):
        """
        Non-Agri user cannot manually override an OCR validation result.
        """
        submitted_document = SubmittedDocumentFactory()
        ocr_result = OCRValidationResultFactory(
            document=submitted_document,
            status=models.OCRValidationResult.ValidationStatus.MANUAL,
            extracted_field={'name': 'Incorrect Name'}
        )
        
        self.farmer_client.force_authenticate(user=self.farmer_user)
        override_url = reverse('ocr-validation-detail', args=[ocr_result.pk])
        new_extracted_data = {'name': 'Correct Name'}
        
        response = self.farmer_client.patch(override_url, new_extracted_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        ocr_result.refresh_from_db()
        self.assertNotEqual(ocr_result.status, models.OCRValidationResult.ValidationStatus.OVERRIDDEN)
        self.assertFalse(ocr_result.manually_overridden)

