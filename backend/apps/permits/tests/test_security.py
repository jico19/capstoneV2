import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.permits.models import PermitApplication
from apps.maps.models import Barangay
from django.urls import reverse

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def farmer_user(db):
    return User.objects.create_user(username='farmer2', password='password', role='Farmer', phone_no='09111111112')

@pytest.fixture
def other_farmer(db):
    return User.objects.create_user(username='farmer3', password='password', role='Farmer', phone_no='09111111113')

@pytest.fixture
def agri_user(db):
    return User.objects.create_user(username='agri2', password='password', role='Agri', phone_no='09222222223')

@pytest.fixture
def barangay(db):
    return Barangay.objects.create(name='Test Barangay 2')

@pytest.mark.django_db
class TestPermitSecurity:
    def test_farmer_cannot_approve_application(self, api_client, farmer_user, barangay):
        # Create app
        app = PermitApplication.objects.create(
            farmer=farmer_user, 
            destination='Lucena', 
            transport_date='2026-06-10',
            status=PermitApplication.Status.SUBMITTED
        )
        
        api_client.force_authenticate(user=farmer_user)
        url = reverse('permitapplication-approve', kwargs={'pk': app.id})
        response = api_client.post(url, {'remarks': 'hacking'})
        
        # Should be 403 Forbidden
        assert response.status_code == 403

    def test_farmer_cannot_view_others_application(self, api_client, farmer_user, other_farmer):
        app = PermitApplication.objects.create(
            farmer=other_farmer, 
            destination='Lucena', 
            transport_date='2026-06-10'
        )
        
        api_client.force_authenticate(user=farmer_user)
        url = reverse('permitapplication-detail', kwargs={'pk': app.id})
        response = api_client.get(url)
        
        assert response.status_code == 404

    def test_invalid_status_transition_issue_permit(self, api_client, agri_user, farmer_user):
        # App still pending
        app = PermitApplication.objects.create(
            farmer=farmer_user, 
            destination='Lucena', 
            transport_date='2026-06-10',
            status=PermitApplication.Status.SUBMITTED
        )
        
        api_client.force_authenticate(user=agri_user)
        url = reverse('issuedpermit-list')
        response = api_client.post(url, {'application_id': app.id})
        
        # Should fail because not OPV_VALIDATED
        assert response.status_code == 400
        assert "It must be OPV_VALIDATED" in response.data['error']
