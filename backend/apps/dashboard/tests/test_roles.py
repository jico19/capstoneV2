import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

ROLES = ["Admin", "Farmer", "Inspector", "Opv", "Agri", "Barangay"]


def make_user(role):
    return User.objects.create_user(
        username=f"role_{role.lower()}",
        password="password",
        role=role,
        phone_no="0919",
    )


@pytest.mark.django_db
class TestAgriMetricsRoleGuard:
    @pytest.mark.parametrize("role,expected", [
        ("Farmer", status.HTTP_403_FORBIDDEN),
        ("Barangay", status.HTTP_403_FORBIDDEN),
        ("Opv", status.HTTP_403_FORBIDDEN),
        ("Agri", status.HTTP_200_OK),
        ("Admin", status.HTTP_200_OK),
    ])
    def test_agri_metrics_role_matrix(self, role, expected):
        user = make_user(role)
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/dashboard/agri-metrics/")

        assert response.status_code == expected

    def test_anonymous_rejected(self):
        response = APIClient().get("/dashboard/agri-metrics/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestOPVMetricsRoleGuard:
    @pytest.mark.parametrize("role,expected", [
        ("Farmer", status.HTTP_403_FORBIDDEN),
        ("Agri", status.HTTP_403_FORBIDDEN),
        ("Opv", status.HTTP_200_OK),
        ("Admin", status.HTTP_200_OK),
    ])
    def test_opv_metrics_role_matrix(self, role, expected):
        user = make_user(role)
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/dashboard/opv-metrics/")

        assert response.status_code == expected


@pytest.mark.django_db
class TestInsightsRoleGuard:
    def test_farmer_gets_own_role_insight_not_clientsupplied(self):
        farmer = make_user("Farmer")
        client = APIClient()
        client.force_authenticate(user=farmer)

        response = client.get("/dashboard/insights/?role=Agri")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["role"] == "Farmer"

    def test_barangay_cannot_read_agri_metrics(self):
        user = make_user("Barangay")
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/dashboard/agri-metrics/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_insights_ignores_role_on_refresh(self):
        farmer = make_user("Farmer")
        client = APIClient()
        client.force_authenticate(user=farmer)

        response = client.post("/dashboard/insights/refresh/", {"role": "Agri"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["role"] == "Farmer"