import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from django.db import connection
from apps.api.models import User, AuditTrail, PrivacyConsentLog, FarmerDocument
from apps.maps.models import Barangay, HogSurvey
from apps.permits.models import PermitApplication, IssuedPermit
from apps.api.admin import AuditTrailAdmin, PrivacyConsentLogAdmin
from django.contrib.admin.sites import AdminSite


@pytest.mark.django_db
class TestDPASecurityAndEncryption:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.barangay = Barangay.objects.create(name="Lutucan 1", latitude=13.9654, longitude=121.5103)
        self.farmer_a = User.objects.create_user(
            username="test_farmer_a",
            password="password123",
            role="Farmer",
            phone_no="09171112233",
            first_name="Juan",
            last_name="Dela Cruz",
            barangay=self.barangay,
            verification_status=User.VerificationStatus.VERIFIED
        )
        self.farmer_b = User.objects.create_user(
            username="test_farmer_b",
            password="password123",
            role="Farmer",
            phone_no="09174445566",
            first_name="Pedro",
            last_name="Penduko",
            barangay=self.barangay,
            verification_status=User.VerificationStatus.VERIFIED
        )
        self.agri_user = User.objects.create_user(
            username="test_agri",
            password="password123",
            role="Agri",
            phone_no="09177778899",
            first_name="Armando",
            last_name="Agri"
        )
        self.brgy_user = User.objects.create_user(
            username="test_brgy",
            password="password123",
            role="Barangay",
            phone_no="09179990011",
            first_name="Ernesto",
            last_name="Vega",
            barangay=self.barangay
        )

        # Create Hog Survey
        self.survey = HogSurvey.objects.create(
            barangay=self.barangay,
            farmer_name="Mang Jose Swine",
            contact_number="09171234567",
            total_pigs=25,
            survey_date=timezone.now().date()
        )

        # Create Application and Issued Permit for Farmer B
        self.app_b = PermitApplication.objects.create(
            farmer=self.farmer_b,
            status=PermitApplication.Status.RELEASED,
            destination="Lucena City",
            transport_date=timezone.now().date() + timedelta(days=2),
            purpose="Commercial trade",
            is_issued=True
        )
        self.permit_b = IssuedPermit.objects.create(
            permit_number="LP26-9999-01",
            application=self.app_b,
            qr_token="qr-token-secret-uuid-12345",
            is_paid=True,
            valid_until=timezone.now().date() + timedelta(days=3)
        )

    def test_field_encryption_at_rest(self):
        """Verifies raw SQL contains ciphertext while Django ORM transparently decrypts."""
        plain_phone = self.farmer_a.phone_no
        assert plain_phone == "09171112233"

        # Direct SQL query on PostgreSQL table
        with connection.cursor() as cursor:
            cursor.execute("SELECT phone_no FROM api_user WHERE id = %s", [self.farmer_a.id])
            raw_db_phone = cursor.fetchone()[0]

        # In the database, it MUST be ciphertext starting with det$
        assert raw_db_phone.startswith("det$")
        assert raw_db_phone != plain_phone

        # Filter query via ORM works seamlessly
        queried = User.objects.filter(phone_no=plain_phone).first()
        assert queried is not None
        assert queried.id == self.farmer_a.id

    def test_audit_trail_immutability(self):
        """Verifies AuditTrail cannot be modified or deleted via Django Admin."""
        site = AdminSite()
        admin = AuditTrailAdmin(AuditTrail, site)
        assert admin.has_add_permission(None) is False
        assert admin.has_change_permission(None) is False
        assert admin.has_delete_permission(None) is False

    def test_privacy_consent_log_immutability(self):
        """Verifies PrivacyConsentLog cannot be modified or deleted via Django Admin."""
        site = AdminSite()
        admin = PrivacyConsentLogAdmin(PrivacyConsentLog, site)
        assert admin.has_add_permission(None) is False
        assert admin.has_change_permission(None) is False
        assert admin.has_delete_permission(None) is False

    def test_hog_survey_authorization_lockdown(self):
        """Verifies Farmers and Inspectors cannot view Hog Survey PII."""
        client = APIClient()
        client.force_authenticate(user=self.farmer_a)
        resp = client.get("/hog-survey/")
        assert resp.status_code == 200
        # Farmer must receive an empty list
        data = resp.json()
        results = data.get("results", data)
        assert len(results) == 0

        # Agri officer can see all
        client.force_authenticate(user=self.agri_user)
        resp = client.get("/hog-survey/")
        assert resp.status_code == 200
        data = resp.json()
        results = data.get("results", data)
        assert len(results) > 0

    def test_verify_permit_cross_farmer_forbidden(self):
        """Verifies a farmer cannot scan/view another farmer's permit QR token."""
        client = APIClient()
        # Farmer A attempts to verify Farmer B's permit
        client.force_authenticate(user=self.farmer_a)
        resp = client.get(f"/application/{self.permit_b.qr_token}/verify/")
        assert resp.status_code == 403

    def test_data_portability_export(self):
        """Verifies citizen data portability endpoint returns complete dossier and logs audit trail."""
        client = APIClient()
        client.force_authenticate(user=self.farmer_b)

        resp = client.get("/user/export_personal_data/")
        assert resp.status_code == 200
        data = resp.json()

        assert "data_subject" in data
        assert data["data_subject"]["username"] == self.farmer_b.username
        assert "consent_history" in data
        assert "permit_records" in data

        # Check export audit trail was recorded
        export_log = AuditTrail.objects.filter(
            who_performed=self.farmer_b,
            action_type=AuditTrail.ActionType.EXPORT
        ).first()
        assert export_log is not None
