import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from apps.maps.models import Barangay
from apps.permits.models import PermitApplication, TransportOrigin, SubmittedDocument, OCRValidationResult
from apps.ocr.tasks import extract_document_info
from apps.ocr.services import check_all_documents_complete

User = get_user_model()


@pytest.fixture
def test_setup(db):
    farmer = User.objects.create_user(username="farmer_test", password="password", role="Farmer")
    agri = User.objects.create_user(username="agri_test", password="password", role="Agri")
    barangay = Barangay.objects.create(name="TestBarangay")
    application = PermitApplication.objects.create(
        farmer=farmer,
        status=PermitApplication.Status.SUBMITTED,
        destination="Lucena City",
        transport_date=timezone.now().date(),
    )
    origin = TransportOrigin.objects.create(
        application=application,
        barangay=barangay,
        fattener=5,
    )
    return {
        'farmer': farmer,
        'agri': agri,
        'application': application,
        'origin': origin,
    }


def test_unsupported_document_type_marked_manual_and_triggers_manual_status(test_setup):
    """
    Verify that an unsupported document type (e.g. vhc/other) is marked
    as MANUAL (not PASSED) and transitions the application to MANUAL status
    requiring Agri officer review.
    """
    origin = test_setup['origin']
    application = test_setup['application']

    doc_file = SimpleUploadedFile("other_doc.png", b"dummy_content", content_type="image/png")
    doc = SubmittedDocument.objects.create(
        origin=origin,
        document_type="other_unsupported_doc",
        file=doc_file,
    )

    # Run the task directly (synchronous for test)
    extract_document_info.func(doc.id)

    # Verify OCRValidationResult
    ocr_res = OCRValidationResult.objects.get(document=doc)
    assert ocr_res.status == OCRValidationResult.ValidationStatus.MANUAL
    assert ocr_res.provider == 'none'
    assert 'manual review' in ocr_res.remarks.get('general', '').lower()

    # Verify Application status became MANUAL (not OCR_VALIDATED or remaining SUBMITTED)
    application.refresh_from_db()
    assert application.status == PermitApplication.Status.MANUAL


def test_mixed_documents_with_unsupported_doc_results_in_manual_application(test_setup):
    """
    When an application has valid scanned docs + an unscanned doc (unsupported),
    the application must be flagged for MANUAL review.
    """
    origin = test_setup['origin']
    application = test_setup['application']

    # 1. Scanned doc with passed OCR
    scanned_file = SimpleUploadedFile("carrier.png", b"dummy_content", content_type="image/png")
    scanned_doc = SubmittedDocument.objects.create(
        origin=origin,
        document_type=SubmittedDocument.DocumentType.TRANSPORT_CARRIER_REG,
        file=scanned_file,
    )
    OCRValidationResult.objects.create(
        document=scanned_doc,
        status=OCRValidationResult.ValidationStatus.PASSED,
        extracted_field={'license_number': '2025-DARFO-123'},
    )

    # 2. Unscanned doc (unsupported)
    unsupported_file = SimpleUploadedFile("other.png", b"dummy_content", content_type="image/png")
    unsupported_doc = SubmittedDocument.objects.create(
        origin=origin,
        document_type="other_unsupported_doc",
        file=unsupported_file,
    )

    extract_document_info.func(unsupported_doc.id)

    application.refresh_from_db()
    assert application.status == PermitApplication.Status.MANUAL
