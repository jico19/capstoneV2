import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.permits.models import PermitApplication, IssuedPermit
from django.urls import reverse
import uuid

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def inspector_user(db):
    return User.objects.create_user(username='inspector1', password='password', role='Inspector', phone_no='09555555555')

@pytest.fixture
def farmer_user(db):
    return User.objects.create_user(username='farmer_insp', password='password', role='Farmer', phone_no='09666666666')

@pytest.mark.django_db
class TestInspectorWorkflow:
    def test_verify_and_log(self, api_client, inspector_user, farmer_user):
        # 1. Setup - issued permit with QR
        app = PermitApplication.objects.create(
            farmer=farmer_user, 
            destination='Lucena', 
            transport_date='2026-06-01',
            status=PermitApplication.Status.PERMIT_ISSUED
        )
        token = uuid.uuid4()
        IssuedPermit.objects.create(
            application=app, 
            issued_by=inspector_user, 
            qr_token=token,
            permit_number='TEST-123'
        )

        api_client.force_authenticate(user=inspector_user)
        
        # 2. Verify QR
        url = reverse('permitapplication-verify', kwargs={'pk': str(token)})
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data['application_id'] == app.application_id

        # 3. Log Inspection
        url = reverse('inspectorlogs-list')
        data = {
            'application': app.id,
            'notes': 'Checked at boundary',
            'lat': 13.9,
            'longi': 121.5
        }
        response = api_client.post(url, data)
        assert response.status_code == 200
