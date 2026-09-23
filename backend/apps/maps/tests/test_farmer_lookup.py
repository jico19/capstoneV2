import pytest
from datetime import timedelta
from django.utils import timezone
from apps.maps.models import Barangay, HogSurvey
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def barangay_a(db):
    return Barangay.objects.create(name="Roster Bgy A")


@pytest.fixture
def barangay_b(db):
    return Barangay.objects.create(name="Roster Bgy B")


@pytest.fixture
def barangay_user(db, barangay_a):
    return User.objects.create_user(
        username='bgy_roster', password='password', role='Barangay',
        phone_no='09170000001', barangay=barangay_a,
    )


@pytest.fixture
def agri_user(db):
    return User.objects.create_user(
        username='agri_roster', password='password', role='Agri', phone_no='09220000001',
    )


def _seed_surveys(barangay, rows):
    for (name, date, contact) in rows:
        HogSurvey.objects.create(
            barangay=barangay, farmer_name=name, contact_number=contact,
            survey_date=date, inahin=1, total_pigs=1,
        )


@pytest.mark.django_db
class TestFarmerLookup:
    def test_requires_two_chars(self, api_client, barangay_user, barangay_a):
        _seed_surveys(barangay_a, [("Carlos Reyes", "2024-06-15", "09171234567")])
        api_client.force_authenticate(user=barangay_user)
        response = api_client.get("/hog-survey/farmer_lookup/?q=c")
        assert response.status_code == 200
        assert response.data == []

    def test_lookup_scoped_to_user_barangay(self, api_client, barangay_user, barangay_a, barangay_b):
        _seed_surveys(barangay_a, [("Carlos Reyes", "2024-06-15", "09171234567")])
        _seed_surveys(barangay_b, [("Carlos Reyes", "2024-06-20", "09999999999")])
        api_client.force_authenticate(user=barangay_user)
        response = api_client.get("/hog-survey/farmer_lookup/?q=carlos")
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["farmer_name"] == "Carlos Reyes"
        assert response.data[0]["contact_number"] == "09171234567"

    def test_lookup_aggregates_survey_count_and_last_date(self, api_client, barangay_user, barangay_a):
        _seed_surveys(barangay_a, [
            ("Carlos Reyes", "2024-06-15", "09171234567"),
            ("Carlos Reyes", "2024-07-20", "09171234567"),
            ("Maria Clara", "2024-05-01", "09170000000"),
        ])
        api_client.force_authenticate(user=barangay_user)
        response = api_client.get("/hog-survey/farmer_lookup/?q=reyes")
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["last_survey_date"] == "2024-07-20"
        assert response.data[0]["survey_count"] == 2

    def test_lookup_is_active_flag(self, api_client, barangay_user, barangay_a):
        recent = timezone.now().date() - timedelta(days=30)
        old = timezone.now().date() - timedelta(days=300)
        _seed_surveys(barangay_a, [
            ("Carlos Reyes", str(recent), "09171234567"),
            ("Old Pedro", str(old), "09170000000"),
        ])
        api_client.force_authenticate(user=barangay_user)
        response = api_client.get("/hog-survey/farmer_lookup/?q=")
        # short query -> empty; query full instead
        response = api_client.get("/hog-survey/farmer_lookup/?q=carlos")
        assert response.data[0]["is_active"] is True
        response = api_client.get("/hog-survey/farmer_lookup/?q=pedro")
        assert response.data[0]["is_active"] is False

    def test_lookup_agri_can_scope_by_barangay_param(self, api_client, agri_user, barangay_a, barangay_b):
        _seed_surveys(barangay_a, [("Carlos Reyes", "2024-06-15", "09171234567")])
        _seed_surveys(barangay_b, [("Carlos Reyes", "2024-06-20", "09999999999")])
        api_client.force_authenticate(user=agri_user)
        response = api_client.get(f"/hog-survey/farmer_lookup/?q=carlos&barangay={barangay_b.id}")
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["contact_number"] == "09999999999"


@pytest.mark.django_db
class TestFarmerRoster:
    def test_roster_lists_all_distinct_farmers_alphabetically(self, api_client, barangay_user, barangay_a):
        _seed_surveys(barangay_a, [
            ("Carlos Reyes", "2024-06-15", "09171234567"),
            ("Carlos Reyes", "2024-07-20", "09171234567"),
            ("Maria Clara", "2024-05-01", "09170000000"),
        ])
        api_client.force_authenticate(user=barangay_user)
        response = api_client.get("/hog-survey/farmer_roster/")
        assert response.status_code == 200
        assert [r["farmer_name"] for r in response.data] == ["Carlos Reyes", "Maria Clara"]
        carlos = response.data[0]
        assert carlos["survey_count"] == 2
        assert carlos["last_survey_date"] == "2024-07-20"

    def test_roster_scoped_to_user_barangay(self, api_client, barangay_user, barangay_b):
        _seed_surveys(barangay_b, [("Other Bgy Farmer", "2024-06-15", "09171234567")])
        api_client.force_authenticate(user=barangay_user)
        response = api_client.get("/hog-survey/farmer_roster/")
        assert response.status_code == 200
        assert response.data == []


@pytest.mark.django_db
class TestSurveyListFilters:
    def test_filters_by_farmer_name_and_date_range(self, api_client, agri_user, barangay_a):
        _seed_surveys(barangay_a, [
            ("Carlos Reyes", "2024-03-01", "09171234567"),
            ("Carlos Reyes", "2024-07-20", "09171234567"),
            ("Maria Clara", "2024-06-01", "09170000000"),
        ])
        api_client.force_authenticate(user=agri_user)
        response = api_client.get(
            "/hog-survey/?farmer_name=carlos&date_from=2024-04-01&date_to=2024-12-31"
        )
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["survey_date"] == "2024-07-20"

    def test_all_filters_optional(self, api_client, barangay_user, barangay_a):
        _seed_surveys(barangay_a, [("Carlos Reyes", "2024-03-01", "09171234567")])
        api_client.force_authenticate(user=barangay_user)
        response = api_client.get("/hog-survey/")
        assert response.status_code == 200
        assert response.data["count"] == 1