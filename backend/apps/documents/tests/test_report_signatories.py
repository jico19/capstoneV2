from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.documents.services.summary_reports import (
    generate_collection_report_pdf,
    generate_inspector_report_pdf,
)
from apps.documents.tests.test_permit_pdf import pdf_text
from apps.permits.models import ApplicationSignatory, MunicipalConfig, Signatory


@pytest.fixture
def report_roster(db):
    ApplicationSignatory.objects.all().delete()
    Signatory.objects.all().delete()
    vet = Signatory.objects.create(
        name='REPORT DEFAULT VET', title='Configured Veterinarian',
        position=Signatory.Position.MUNICIPAL_VETERINARIAN, is_default=True,
    )
    agri = Signatory.objects.create(
        name='REPORT DEFAULT AGRI', title='Configured Agriculturist',
        position=Signatory.Position.MUNICIPAL_AGRICULTURIST, is_default=True,
    )
    return vet, agri


@pytest.fixture
def report_client(db):
    user = get_user_model().objects.create_user(
        username='report_signatory_agri', first_name='Report', last_name='Preparer', role='Agri',
    )
    client = APIClient()
    client.force_authenticate(user)
    return client


def get_draft(client, report_type='permit_issuance'):
    response = client.get('/report/draft/', {
        'report_type': report_type, 'start_date': '2026-01-01', 'end_date': '2026-03-01',
    })
    assert response.status_code == 200
    return response.json()


@pytest.mark.django_db
@pytest.mark.parametrize('report_type', [
    'permit_issuance', 'barangay_distribution', 'inspector_logs', 'revenue_collection',
])
def test_draft_and_pdf_use_settings_signers(report_client, report_roster, report_type):
    draft = get_draft(report_client, report_type)
    expected_signatories = {
        'prepared_by_name': 'REPORT PREPARER',
        'verified_by_name': 'REPORT DEFAULT VET',
        'verified_by_title': 'Configured Veterinarian',
        'approved_by_name': 'REPORT DEFAULT AGRI',
        'approved_by_title': 'Configured Agriculturist',
    }
    for field, expected in expected_signatories.items():
        assert draft['signatories'][field] == expected
    assert draft['transmittal']['memo_through'] == 'REPORT DEFAULT AGRI, Configured Agriculturist'
    response = report_client.post('/report/export-formal-pdf/', draft, format='json')
    assert response.status_code == 200
    text = pdf_text(b''.join(response.streaming_content))
    for expected in ['REPORT DEFAULT VET', 'Configured Veterinarian', 'REPORT DEFAULT AGRI', 'Configured Agriculturist', 'REPORT PREPARER']:
        assert expected in text


@pytest.mark.django_db
def test_new_draft_follows_changed_settings_default(report_client, report_roster):
    get_draft(report_client)
    replacement = Signatory.objects.create(
        name='REPLACEMENT AGRI', title='Acting Agriculturist',
        position=Signatory.Position.MUNICIPAL_AGRICULTURIST,
    )
    response = report_client.patch(f'/signatory/{replacement.pk}/', {'is_default': True}, format='json')
    assert response.status_code == 200
    draft = get_draft(report_client)
    assert draft['signatories']['approved_by_name'] == 'REPLACEMENT AGRI'
    assert draft['signatories']['approved_by_title'] == 'Acting Agriculturist'
    assert draft['transmittal']['memo_through'] == 'REPLACEMENT AGRI, Acting Agriculturist'


@pytest.mark.django_db
def test_report_specific_edits_are_kept_in_pdf(report_client, report_roster):
    draft = get_draft(report_client)
    draft['signatories'].update(verified_by_name='CUSTOM VERIFIER', approved_by_name='CUSTOM APPROVER')
    response = report_client.post('/report/export-formal-pdf/', draft, format='json')
    assert response.status_code == 200
    text = pdf_text(b''.join(response.streaming_content))
    assert 'CUSTOM VERIFIER' in text
    assert 'CUSTOM APPROVER' in text
    assert 'REPORT DEFAULT VET' not in text


@pytest.mark.django_db
def test_pdf_with_missing_signers_uses_settings(report_client, report_roster):
    draft = get_draft(report_client)
    draft.pop('signatories')
    draft['transmittal'].pop('memo_through')
    response = report_client.post('/report/export-formal-pdf/', draft, format='json')
    assert response.status_code == 200
    text = pdf_text(b''.join(response.streaming_content))
    assert 'REPORT DEFAULT VET' in text
    assert 'REPORT DEFAULT AGRI' in text


@pytest.mark.django_db
def test_inactive_default_uses_municipal_fallback(report_client, report_roster):
    vet, _ = report_roster
    vet.is_active = False
    vet.save(update_fields=['is_active'])
    MunicipalConfig.objects.all().delete()
    MunicipalConfig.objects.create(oic_name='MUNICIPAL FALLBACK', oic_title='Fallback Title')
    draft = get_draft(report_client)
    assert draft['signatories']['verified_by_name'] == 'MUNICIPAL FALLBACK'
    assert draft['signatories']['verified_by_title'] == 'Fallback Title'
    assert draft['signatories']['approved_by_name'] == 'REPORT DEFAULT AGRI'


@pytest.mark.django_db
@pytest.mark.parametrize('generator', [generate_collection_report_pdf, generate_inspector_report_pdf])
def test_direct_summary_pdfs_use_settings_signers(report_roster, generator):
    text = pdf_text(generator(date(2026, 1, 1), date(2026, 3, 1)).getvalue())
    assert 'REPORT DEFAULT VET' in text
    assert 'Configured Veterinarian' in text
    if generator is generate_inspector_report_pdf:
        assert 'REPORT DEFAULT AGRI' in text
        assert 'Configured Agriculturist' in text
