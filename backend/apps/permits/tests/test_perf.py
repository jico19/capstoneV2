import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.permits.models import PermitApplication

User = get_user_model()


@pytest.fixture
def agri_user(db):
    return User.objects.create_user(
        username="perf-agri", password="password", role="Agri", phone_no="09222222221"
    )


def _seed_applications(farmer, n):
    PermitApplication.objects.bulk_create([
        PermitApplication(
            farmer=farmer,
            status=PermitApplication.Status.RELEASED,
            destination="Lucena",
            transport_date=timezone.now().date(),
            purpose="Slaughter",
        )
        for _ in range(n)
    ])


@pytest.mark.django_db
class TestApplicationListQueryCount:
    @pytest.mark.parametrize("n", [10, 20])
    def test_list_query_count_is_flat(self, agri_user, n, django_assert_num_queries):
        farmer = User.objects.create_user(
            username=f"perf-farmer-{n}",
            password="password",
            role="Farmer",
            phone_no=f"09{n:09d}",
        )
        _seed_applications(farmer, n)

        client = APIClient()
        client.force_authenticate(user=agri_user)

        with django_assert_num_queries(8, exact=False):
            response = client.get("/application/")
        assert response.status_code == 200