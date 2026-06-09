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
