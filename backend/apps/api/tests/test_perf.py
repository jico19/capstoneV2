import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.api.models import FarmerDocument
from apps.maps.models import Barangay

User = get_user_model()


@pytest.fixture
def agri_user(db):
    return User.objects.create_user(
        username="perf-agri", password="password", role="Agri", phone_no="09222222231"
    )


def _seed_farmers(barangay, n):
    for i in range(n):
        farmer = User.objects.create_user(
            username=f"perf-farmer-{i}-{n}",
            password="password",
            role="Farmer",
            phone_no=f"09{i:09d}",
            barangay=barangay,
            verification_status=User.VerificationStatus.VERIFIED,
        )
        for j, dtype in enumerate(FarmerDocument.DocumentType.values):
            FarmerDocument.objects.create(
                user=farmer,
                document_type=dtype,
                file=f"doc_{i}_{j}.jpg",
            )


@pytest.mark.django_db
class TestUserListQueryCount:
    @pytest.mark.parametrize("n", [10, 20])
    def test_list_query_count_is_flat(self, agri_user, n, django_assert_num_queries):
        barangay = Barangay.objects.create(name="Perf B")
        _seed_farmers(barangay, n)

        client = APIClient()
        client.force_authenticate(user=agri_user)

        with django_assert_num_queries(12, exact=False):
            response = client.get("/user/")
        assert response.status_code == 200