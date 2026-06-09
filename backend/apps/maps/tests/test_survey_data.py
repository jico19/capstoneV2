import pytest
from apps.maps.models import Barangay, HogSurvey
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def agri_user(db):
    return User.objects.create_user(username='agri_test', password='password', role='Agri', phone_no='09222222224')

@pytest.mark.django_db
class TestSurveyData:
    def test_survey_data_sums_correctly(self, api_client, agri_user):
        b = Barangay.objects.create(name="Barangay A", latitude=1.0, longitude=1.0)
        
        # Create two surveys for the same barangay in the same month/year
        HogSurvey.objects.create(barangay=b, survey_date="2026-06-01", total_pigs=10, inahin=5)
        HogSurvey.objects.create(barangay=b, survey_date="2026-06-15", total_pigs=20, inahin=10)
        
        api_client.force_authenticate(user=agri_user)
        response = api_client.get("/hog-survey/survey_data/", {"year": 2026, "month": 6})
        
        assert response.status_code == 200
        data = response.data
        assert len(data) == 1
        assert data[0]["barangay"] == "Barangay A"
        assert data[0]["total_pigs"] == 30  # 10 + 20
        assert data[0]["breakdown"]["inahin"] == 15  # 5 + 10

    def test_survey_data_defaults_to_latest_year(self, api_client, agri_user):
        b = Barangay.objects.create(name="Barangay A", latitude=1.0, longitude=1.0)
        
        # Create surveys in different years
        HogSurvey.objects.create(barangay=b, survey_date="2025-06-01", total_pigs=100)
        HogSurvey.objects.create(barangay=b, survey_date="2026-06-01", total_pigs=200)
        
        api_client.force_authenticate(user=agri_user)
        # No filters should default to latest year (2026)
        response = api_client.get("/hog-survey/survey_data/")
        
        assert response.status_code == 200
        data = response.data
        assert len(data) == 1
        assert data[0]["total_pigs"] == 200  # Should only count 2026
