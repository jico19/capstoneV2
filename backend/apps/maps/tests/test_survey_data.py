import pytest
from apps.maps.models import Barangay, HogSurvey
from apps.maps.services import HogSurveyService
from apps.permits.models import PermitApplication, TransportOrigin
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone

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

@pytest.mark.django_db
class TestTransportVolume:
    def _make_app(self, farmer, status):
        return PermitApplication.objects.create(
            farmer=farmer,
            status=status,
            destination="Lucena",
            transport_date=timezone.now().date(),
            purpose="Slaughter",
        )

    def test_transport_volume_aggregates_origins_and_zero_fills(self, agri_user):
        farmer = User.objects.create_user(
            username="vol_farmer", password="password", role="Farmer", phone_no="09555555555"
        )

        stable = Barangay.objects.create(name="Stable B", latitude=10.0, longitude=10.0)
        light = Barangay.objects.create(name="Light B", latitude=10.1, longitude=10.1)
        moderate = Barangay.objects.create(name="Moderate B", latitude=10.2, longitude=10.2)
        heavy = Barangay.objects.create(name="Heavy B", latitude=10.3, longitude=10.3)

        # A DRAFT application is NOT counted even if it has an origin -> 0 / Stable
        draft_app = self._make_app(farmer, PermitApplication.Status.DRAFT)
        TransportOrigin.objects.create(application=draft_app, barangay=stable, inahin=500)

        # RELEASED -> counted
        light_app = self._make_app(farmer, PermitApplication.Status.RELEASED)
        TransportOrigin.objects.create(application=light_app, barangay=light, inahin=10)

        # Sum across permits + both PAYMENT_PENDING and RELEASED count
        moderate_released = self._make_app(farmer, PermitApplication.Status.RELEASED)
        TransportOrigin.objects.create(application=moderate_released, barangay=moderate, fattener=20)
        moderate_pending = self._make_app(farmer, PermitApplication.Status.PAYMENT_PENDING)
        TransportOrigin.objects.create(application=moderate_pending, barangay=moderate, inahin=30)

        heavy_app = self._make_app(farmer, PermitApplication.Status.RELEASED)
        TransportOrigin.objects.create(application=heavy_app, barangay=heavy, inahin=150)

        payload = HogSurveyService.calculate_transport_volume()
        by_name = {entry["barangay"]: entry for entry in payload}

        assert by_name["Stable B"]["total_transported"] == 0
        assert by_name["Stable B"]["volume_level"] == "Stable"

        assert by_name["Light B"]["total_transported"] == 10
        assert by_name["Light B"]["volume_level"] == "Light"

        assert by_name["Moderate B"]["total_transported"] == 50
        assert by_name["Moderate B"]["volume_level"] == "Moderate"

        assert by_name["Heavy B"]["total_transported"] == 150
        assert by_name["Heavy B"]["volume_level"] == "Heavy"

        assert set(by_name["Light B"].keys()) == {
            "barangay", "total_transported", "volume_level", "latitude", "longitude",
        }
        assert float(by_name["Light B"]["latitude"]) == float(light.latitude)
        assert float(by_name["Light B"]["longitude"]) == float(light.longitude)
