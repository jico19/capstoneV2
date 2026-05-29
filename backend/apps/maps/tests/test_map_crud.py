import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.maps.models import Barangay, HogSurvey
from django.urls import reverse
from django.utils import timezone

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def agri_user(db):
    return User.objects.create_user(username='agri_map', password='password', role='Agri', phone_no='09444444444')

@pytest.fixture
def barangay(db):
    return Barangay.objects.create(name='Sariaya Center')

@pytest.mark.django_db
class TestMapCRUD:
    def test_hog_survey_crud(self, api_client, agri_user, barangay):
        api_client.force_authenticate(user=agri_user)
        
        # 1. Create
        url = reverse('hogsurvey-list')
        data = {
            'barangay': barangay.id,
            'total_pigs': 100,
            'survey_date': '2026-05-01'
        }
        response = api_client.post(url, data)
        assert response.status_code == 201
        survey_id = response.data['id']

        # 2. Read
        url = reverse('hogsurvey-detail', kwargs={'pk': survey_id})
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data['total_pigs'] == 100

        # 3. Update
        response = api_client.patch(url, {'total_pigs': 150})
        assert response.status_code == 200
        assert HogSurvey.objects.get(id=survey_id).total_pigs == 150

        # 4. Delete
        response = api_client.delete(url)
        assert response.status_code == 204
        assert not HogSurvey.objects.filter(id=survey_id).exists()
