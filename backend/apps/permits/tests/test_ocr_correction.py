import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.api.models import AuditTrail
from apps.maps.models import Barangay
from apps.permits.models import (
    OCRValidationResult, PermitApplication, SubmittedDocument, TransportOrigin,
)


@pytest.fixture
def correction_case(db):
    User = get_user_model()
    users = {
        role: User.objects.create_user(
            username=f'ocr-{role}', role=role, phone_no=f'0910000000{i}',
        )
        for i, role in enumerate(['Farmer', 'Agri', 'Admin', 'Opv', 'Inspector'])
    }
    users['other'] = User.objects.create_user(
        username='ocr-other', role='Farmer', phone_no='09100000009',
    )
    application = PermitApplication.objects.create(
        farmer=users['Farmer'], destination='Lucena', transport_date='2026-11-01',
        status='MANUAL',
    )
    origin = TransportOrigin.objects.create(
        application=application, barangay=Barangay.objects.create(name='OCR Test'),
        fattener=1,
    )
    document = SubmittedDocument.objects.create(
        origin=origin, document_type='handlers_license', file='test/license.png',
    )
    result = OCRValidationResult.objects.create(
        document=document, status='MANUAL',
        extracted_field={'name_of_applicant': None, 'license_number': 'KEEP'},
    )
    return users, application, result


@pytest.mark.django_db
@pytest.mark.parametrize('method', ['patch', 'put'])
def test_agri_correction_persists_fields_and_audit(correction_case, method):
    users, application, result = correction_case
    client = APIClient()
    client.force_authenticate(users['Agri'])
    response = getattr(client, method)(
        f'/ocr-validation/{result.pk}/', {'name_of_applicant': 'Correct Name'},
        format='json',
    )
    assert response.status_code == 200
    result.refresh_from_db()
    assert result.extracted_field == {'name_of_applicant': 'Correct Name', 'license_number': 'KEEP'}
    assert result.status == 'OVERRIDDEN'
    assert result.manually_overridden
    assert result.overridden_by == users['Agri']
    assert AuditTrail.objects.filter(
        who_performed=users['Agri'],
        what_performed__contains=f'Application #{application.pk}',
    ).exists()
    response = client.get(f'/ocr-validation/{result.pk}/')
    assert response.status_code == 200
    assert response.data['extracted_field']['name_of_applicant'] == 'Correct Name'


@pytest.mark.django_db
@pytest.mark.parametrize('role,read_status,write_status', [
    ('Farmer', 200, 403), ('other', 404, 404), ('Admin', 200, 403),
    ('Opv', 200, 403), ('Inspector', 404, 404),
])
def test_ocr_access_and_ownership(correction_case, role, read_status, write_status):
    users, _, result = correction_case
    client = APIClient()
    client.force_authenticate(users[role])
    url = f'/ocr-validation/{result.pk}/'
    assert client.get(url).status_code == read_status
    response = client.get('/ocr-validation/')
    assert response.status_code == 200
    assert response.data['count'] == (1 if read_status == 200 else 0)
    assert client.patch(url, {'name_of_applicant': 'Unauthorized'}, format='json').status_code == write_status
    result.refresh_from_db()
    assert result.status == 'MANUAL'


@pytest.mark.django_db
@pytest.mark.parametrize('role,expected', [
    ('Opv', 200), ('Agri', 200), ('Farmer', 200), ('other', 403),
])
def test_mao_certificate_detail(correction_case, role, expected):
    users, application, _ = correction_case
    application.mao_certificate_pdf = 'issued_docs/mao_cert/test.pdf'
    application.mao_certificate_number = 'OMA-TEST'
    application.save()
    client = APIClient()
    client.force_authenticate(users[role])
    response = client.get(f'/document/mao-cert-{application.pk}/')
    assert response.status_code == expected
    if expected == 200:
        assert response.data['file'].endswith('/issued_docs/mao_cert/test.pdf')
        assert response.data['ocr']['extracted_field']['Certificate Number'] == 'OMA-TEST'
        assert response.data['is_generated'] is True


@pytest.mark.django_db
def test_mao_certificate_missing_and_invalid(correction_case):
    users, application, _ = correction_case
    client = APIClient()
    client.force_authenticate(users['Opv'])
    for identifier in [str(application.pk), 'invalid', '999999999']:
        assert client.get(f'/document/mao-cert-{identifier}/').status_code == 404
