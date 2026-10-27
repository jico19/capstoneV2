import pytest
from io import StringIO
from django.core.files.uploadedfile import SimpleUploadedFile
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

@pytest.fixture
def farmer_user(db):
    return User.objects.create_user(username='farmer_test', password='password', role='Farmer', phone_no='09111111114')

@pytest.mark.django_db
class TestHogSurveyUpload:
    def test_agri_officer_can_upload_valid_csv(self, api_client, agri_user):
        Barangay.objects.create(name="Sariaya Central")
        csv_content = (
            "barangay,survey_date,inahin,barako,fattener,grower,starter,bulaw,total_pigs\n"
            "Sariaya Central,2024-05-01,10,2,20,30,15,5,82"
        )
        file = SimpleUploadedFile("test.csv", csv_content.encode('utf-8'), content_type="text/csv")
        
        api_client.force_authenticate(user=agri_user)
        response = api_client.post("/hog-survey/upload_csv/", {"file": file}, format='multipart')
        
        assert response.status_code == 201
        assert HogSurvey.objects.count() == 1
        assert HogSurvey.objects.first().total_pigs == 82

    def test_non_agri_cannot_upload_csv(self, api_client, farmer_user):
        file = SimpleUploadedFile("test.csv", b"content", content_type="text/csv")
        api_client.force_authenticate(user=farmer_user)
        response = api_client.post("/hog-survey/upload_csv/", {"file": file}, format='multipart')
        assert response.status_code == 403

    def test_upload_missing_columns(self, api_client, agri_user):
        csv_content = "wrong,column\nval,val"
        file = SimpleUploadedFile("test.csv", csv_content.encode('utf-8'), content_type="text/csv")
        api_client.force_authenticate(user=agri_user)
        response = api_client.post("/hog-survey/upload_csv/", {"file": file}, format='multipart')
        assert response.status_code == 400
        assert "Missing columns" in response.data["error"]

    def test_upload_csv_with_farmer_name_and_contact(self, api_client, agri_user):
        Barangay.objects.create(name="Poblacion 1")
        csv_content = (
            "barangay,survey_date,farmer_name,contact_number,inahin,barako,fattener,grower,starter,bulaw,total_pigs\n"
            "Poblacion 1,2026-09-01,Pedro Penduko,09123456789,2,1,5,3,4,1,16\n"
            "Poblacion 1,2026-09-01,Maria Clara,09987654321,5,0,10,5,0,0,20\n"
        )
        file = SimpleUploadedFile("farmer_survey.csv", csv_content.encode('utf-8'), content_type="text/csv")
        api_client.force_authenticate(user=agri_user)
        response = api_client.post("/hog-survey/upload_csv/", {"file": file}, format='multipart')

        assert response.status_code == 201
        assert HogSurvey.objects.count() == 2
        pedro = next(s for s in HogSurvey.objects.all() if s.farmer_name == "Pedro Penduko")
        assert pedro.contact_number == "09123456789"
        assert pedro.total_pigs == 16
        maria = next(s for s in HogSurvey.objects.all() if s.farmer_name == "Maria Clara")
        assert maria.contact_number == "09987654321"
        assert maria.total_pigs == 20

    def test_manual_survey_creation_with_farmer_details(self, api_client, agri_user):
        b = Barangay.objects.create(name="Balubal")
        api_client.force_authenticate(user=agri_user)
        response = api_client.post("/hog-survey/", {
            "barangay": b.id,
            "farmer_name": "Juan Luna",
            "contact_number": "09171234567",
            "survey_date": "2026-09-01",
            "inahin": 3,
            "barako": 1,
            "fattener": 4,
            "grower": 2,
            "starter": 5,
            "bulaw": 1,
            "total_pigs": 16
        })
        assert response.status_code == 201
        assert response.data["farmer_name"] == "Juan Luna"
        assert response.data["contact_number"] == "09171234567"

    def test_export_csv_includes_farmer_headers_and_data(self, api_client, agri_user):
        b = Barangay.objects.create(name="Bignay 1")
        HogSurvey.objects.create(
            barangay=b,
            farmer_name="Apolinario Mabini",
            contact_number="09181112233",
            survey_date="2026-09-01",
            inahin=2,
            total_pigs=2
        )
        api_client.force_authenticate(user=agri_user)
        response = api_client.get("/hog-survey/export_csv/")
        assert response.status_code == 200
        content = response.content.decode("utf-8")
        assert "Farmer Name" in content
        assert "Contact Number" in content
        assert "Apolinario Mabini" in content
        assert "09181112233" in content

    def test_manual_survey_rejects_empty_farmer_name(self, api_client, agri_user):
        b = Barangay.objects.create(name="Barangay Validation 1")
        api_client.force_authenticate(user=agri_user)
        response = api_client.post("/hog-survey/", {
            "barangay": b.id,
            "farmer_name": "   ",
            "survey_date": "2026-09-01",
            "inahin": 5,
        })
        assert response.status_code == 400
        assert "farmer_name" in response.data["error"]

    def test_manual_survey_rejects_zero_pigs(self, api_client, agri_user):
        b = Barangay.objects.create(name="Barangay Validation 2")
        api_client.force_authenticate(user=agri_user)
        response = api_client.post("/hog-survey/", {
            "barangay": b.id,
            "farmer_name": "Jose Rizal",
            "survey_date": "2026-09-01",
            "inahin": 0,
            "barako": 0,
            "fattener": 0,
            "grower": 0,
            "starter": 0,
            "bulaw": 0,
        })
        assert response.status_code == 400
        assert "total_pigs" in response.data["error"]

    def test_batch_create_rejects_empty_data(self, api_client, agri_user):
        b = Barangay.objects.create(name="Barangay Batch Validation")
        api_client.force_authenticate(user=agri_user)
        
        # Test missing farmer name
        res1 = api_client.post("/hog-survey/batch_create/", {
            "surveys": [{
                "barangay": b.id,
                "farmer_name": "",
                "survey_date": "2026-09-01",
                "inahin": 4,
            }]
        }, format='json')
        assert res1.status_code == 400
        assert "Farmer / Hog Owner name is required" in res1.data["error"]

        # Test zero pigs
        res2 = api_client.post("/hog-survey/batch_create/", {
            "surveys": [{
                "barangay": b.id,
                "farmer_name": "Emilio Aguinaldo",
                "survey_date": "2026-09-01",
                "inahin": 0,
            }]
        }, format='json')
        assert res2.status_code == 400
        assert "Total pigs must be at least 1" in res2.data["error"]

    def test_upload_csv_with_utf8_bom(self, api_client, agri_user):
        Barangay.objects.create(name="Balubal")
        csv_bytes = (
            b"\xef\xbb\xbfbarangay,survey_date,farmer_name,contact_number,inahin,barako,fattener,grower,starter,bulaw,total_pigs\n"
            b"Balubal,2026-10-15,Excel User,09123456789,1,0,2,0,0,0,3\n"
        )
        file = SimpleUploadedFile("excel_export.csv", csv_bytes, content_type="text/csv")
        api_client.force_authenticate(user=agri_user)
        response = api_client.post("/hog-survey/upload_csv/", {"file": file}, format='multipart')
        assert response.status_code == 201
        assert any(s.farmer_name == "Excel User" for s in HogSurvey.objects.all())

    def test_upload_csv_with_duplicate_rows_in_file(self, api_client, agri_user):
        Barangay.objects.create(name="Antipolo")
        csv_content = (
            "barangay,survey_date,farmer_name,contact_number,inahin,barako,fattener,grower,starter,bulaw,total_pigs\n"
            "Antipolo,2026-10-15,Duplicate Farmer,09123456789,2,1,0,0,0,0,3\n"
            "Antipolo,2026-10-15,Duplicate Farmer,09123456789,5,2,1,0,0,0,8\n"
        )
        file = SimpleUploadedFile("duplicates.csv", csv_content.encode('utf-8'), content_type="text/csv")
        api_client.force_authenticate(user=agri_user)
        response = api_client.post("/hog-survey/upload_csv/", {"file": file}, format='multipart')
        assert response.status_code == 400
        assert "Duplicate farmer/date" in response.data["error"]
        assert HogSurvey.objects.count() == 0

    def test_upload_csv_from_exported_format(self, api_client, agri_user):
        Barangay.objects.create(name="Bucal")
        csv_content = (
            "Barangay,Date,Farmer Name,Contact Number,Inahin,Barako,Fattener,Grower,Bulaw,Starter,Total\n"
            "Bucal,2026-10-15,Exported Farmer,09123456789,3,1,4,2,1,5,16\n"
        )
        file = SimpleUploadedFile("system_export.csv", csv_content.encode('utf-8'), content_type="text/csv")
        api_client.force_authenticate(user=agri_user)
        response = api_client.post("/hog-survey/upload_csv/", {"file": file}, format='multipart')
        assert response.status_code == 201
        assert any(s.farmer_name == "Exported Farmer" for s in HogSurvey.objects.all())

    def test_upload_csv_with_barangay_aliases_and_castanas(self, api_client, agri_user):
        Barangay.objects.create(name="Mamala I")
        Barangay.objects.create(name="Castañas")
        csv_content = (
            "barangay,survey_date,farmer_name,contact_number,inahin,barako,fattener,grower,starter,bulaw,total_pigs\n"
            "Mamala 1,2026-10-15,Farmer One,09123456789,1,0,0,0,0,0,1\n"
            "Castanas,2026-10-15,Farmer Two,09123456788,2,0,0,0,0,0,2\n"
        )
        file = SimpleUploadedFile("aliases.csv", csv_content.encode('utf-8'), content_type="text/csv")
        api_client.force_authenticate(user=agri_user)
        response = api_client.post("/hog-survey/upload_csv/", {"file": file}, format='multipart')
        assert response.status_code == 201
        assert any(s.farmer_name == "Farmer One" for s in HogSurvey.objects.filter(barangay__name="Mamala I"))
        assert any(s.farmer_name == "Farmer Two" for s in HogSurvey.objects.select_related("barangay") if s.barangay.name.startswith("Casta"))


