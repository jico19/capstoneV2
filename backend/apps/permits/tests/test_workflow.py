import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.permits.models import PermitApplication, OPVValidation, IssuedPermit
from apps.maps.models import Barangay
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
import io
from PIL import Image

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def farmer_user(db):
    return User.objects.create_user(
        username='farmer', 
        password='password', 
        role='Farmer', 
        phone_no='09111111111'
    )

@pytest.fixture
def agri_user(db):
    return User.objects.create_user(
        username='agri', 
        password='password', 
        role='Agri', 
        phone_no='09222222222'
    )

@pytest.fixture
def opv_user(db):
    return User.objects.create_user(
        username='opv', 
        password='password', 
        role='Opv', 
        phone_no='09333333333'
    )

@pytest.fixture
def barangay(db):
    return Barangay.objects.create(name='Test Barangay')

@pytest.fixture
def dummy_image():
    file = io.BytesIO()
    image = Image.new('RGBA', size=(100, 100), color=(155, 0, 0))
    image.save(file, 'png')
    file.name = 'test.png'
    file.seek(0)
    return SimpleUploadedFile(file.name, file.read(), content_type='image/png')

@pytest.mark.django_db
class TestPermitWorkflow:
    def test_full_workflow(self, api_client, farmer_user, agri_user, opv_user, barangay, dummy_image):
        # 1. Farmer Create Application
        api_client.force_authenticate(user=farmer_user)
        url = reverse('permitapplication-list')
        
        # We need fresh files for each field to avoid "The submitted file is empty" 
        # when the same SimpleUploadedFile is used multiple times in a multipart request.
        def get_fresh_file():
            dummy_image.seek(0)
            return SimpleUploadedFile(dummy_image.name, dummy_image.read(), content_type=dummy_image.content_type)
        
        dummy_image.seek(0)
        
        from django.utils import timezone
        from datetime import timedelta
        future_date = (timezone.now() + timedelta(days=2)).strftime('%Y-%m-%d')

        data = {
            'destination': 'Lucena',
            'transport_date': future_date,
            'purpose': 'Slaughter',
            'origins[0][barangay]': barangay.id,
            'origins[0][number_of_pigs]': 5,
            'traders_pass': get_fresh_file(),
            'handlers_license': get_fresh_file(),
            'transport_carrier_reg': get_fresh_file(),
            'origin_0_cis': get_fresh_file(),
            'origin_0_endorsement_cert': get_fresh_file()
        }
        response = api_client.post(url, data, format='multipart')
        assert response.status_code == 201
        app_id = response.data['id']
        application = PermitApplication.objects.get(id=app_id)
        assert application.status == PermitApplication.Status.SUBMITTED

        # 2. Agri Approve Application
        api_client.force_authenticate(user=agri_user)
        url = reverse('permitapplication-approve', kwargs={'pk': app_id})
        response = api_client.post(url, {'remarks': 'Documents clear'})
        assert response.status_code == 200
        application.refresh_from_db()
        assert application.status == PermitApplication.Status.FORWARDED_TO_OPV

        # 3. OPV Reject (Return for Correction)
        api_client.force_authenticate(user=opv_user)
        url = reverse('opvvalidation-resubmit', kwargs={'pk': app_id})
        response = api_client.post(url, {'remarks': 'Incomplete health info'})
        assert response.status_code == 200
        application.refresh_from_db()
        assert application.status == PermitApplication.Status.OPV_REJECTED

        # 4. Farmer Resubmit
        api_client.force_authenticate(user=farmer_user)
        url = reverse('permitapplication-resubmit', kwargs={'pk': app_id})
        data = {
            'destination': 'Lucena City',
            'transport_date': future_date,
            'purpose': 'Slaughter',
            'origins[0][id]': application.origins.first().id,
            'origins[0][barangay]': barangay.id,
            'origins[0][number_of_pigs]': 5,
        }
        response = api_client.post(url, data, format='multipart')
        assert response.status_code == 200
        application.refresh_from_db()
        # Should go back to OPV (Forwarded)
        assert application.status == PermitApplication.Status.FORWARDED_TO_OPV

        # 5. OPV Approve (Final Validation)
        api_client.force_authenticate(user=opv_user)
        url = reverse('opvvalidation-approve', kwargs={'pk': app_id})
        data = {
            'remarks': 'All good',
            'veterinary_health_certificate': dummy_image,
            'transportation_pass': dummy_image
        }
        response = api_client.post(url, data, format='multipart')
        assert response.status_code == 200
        application.refresh_from_db()
        assert application.status == PermitApplication.Status.OPV_VALIDATED

        # 6. Agri Issue Permit
        api_client.force_authenticate(user=agri_user)
        url = reverse('issuedpermit-list')
        response = api_client.post(url, {'application_id': app_id})
        assert response.status_code == 201
        application.refresh_from_db()
        assert application.status == PermitApplication.Status.PAYMENT_PENDING
        assert IssuedPermit.objects.filter(application=application).exists()
