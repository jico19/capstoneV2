import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def agri_user(db):
    return User.objects.create_user(username='agriofficer', password='password', role='Agri', phone_no='09333333333')

@pytest.fixture
def farmer_user(db):
    return User.objects.create_user(username='farmeruser', password='password', role='Farmer', phone_no='09444444444')

@pytest.mark.django_db
class TestGovernmentReports:
    def test_agri_can_get_draft_report(self, api_client, agri_user):
        api_client.force_authenticate(user=agri_user)
        response = api_client.get('/report/draft/?report_type=permit_issuance&start_date=2026-01-01&end_date=2026-03-01')
        assert response.status_code == 200
        data = response.json()
        assert data['report_type'] == 'permit_issuance'
        assert 'transmittal' in data
        assert 'executive_summary' in data
        assert 'biosecurity_findings' in data
        assert 'operational_observations' in data
        assert 'recommendations' in data
        assert 'signatories' in data
        assert 'HON. MARCELO P. GAYETA' in data['transmittal']['memo_for']

    def test_farmer_cannot_access_draft_report(self, api_client, farmer_user):
        api_client.force_authenticate(user=farmer_user)
        response = api_client.get('/report/draft/?report_type=permit_issuance&start_date=2026-01-01&end_date=2026-03-01')
        assert response.status_code == 403

    def test_agri_can_export_formal_pdf(self, api_client, agri_user):
        api_client.force_authenticate(user=agri_user)
        # Fetch draft first
        draft_res = api_client.get('/report/draft/?report_type=permit_issuance&start_date=2026-01-01&end_date=2026-03-01')
        draft_payload = draft_res.json()

        # Modify a field to simulate user customization
        draft_payload['transmittal']['memo_for'] = 'DR. FLOMIELLA A. CADA, Provincial Veterinarian'
        draft_payload['recommendations'].append('Custom recommendation test')

        # Export formal PDF
        export_res = api_client.post('/report/export-formal-pdf/', data=draft_payload, format='json')
        assert export_res.status_code == 200
        assert export_res['Content-Type'] == 'application/pdf'
        assert len(export_res.getvalue()) > 1000
