import logging
from django.conf import settings
from apps.permits import models as permits
from apps.api import models as api_models
from .services import (
    validate_handlers_license,
    extract_transport_carrier,
    extract_handlers_license,
    validate_transport_carrier,
    extract_traders_pass,
    validate_traders_pass,
    extract_cis,
    validate_cis,
    extract_endorsement_cert,
    validate_endorsement_cert,
    parse_date,
    check_all_documents_complete
)
from .providers import (
    OCRSpaceProvider,
    GeminiDocumentParser,
    OCRProviderError,
    RateLimitError,
)
from .models import DailyOCRUsage
import requests
import mimetypes

from django.tasks import task

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider registry
# ---------------------------------------------------------------------------

_PROVIDER_CLASSES = {
    'ocrspace': OCRSpaceProvider,
}

_PROVIDER_DAILY_LIMITS = {
    'ocrspace': lambda: 25000,  # OCR.space free-tier ceiling
}


def _call_ocr_chain(doc) -> tuple[str, str]:
    """Try each provider in OCR_PROVIDER_CHAIN order.

    Returns (extracted_text, provider_name) on success.
    Raises OCRProviderError when every provider in the chain fails.
    """
    chain = getattr(settings, 'OCR_PROVIDER_CHAIN', ['ocrspace'])
    file_url = doc.file.url
    errors = []

    for name in chain:
        name = name.strip()
        provider_cls = _PROVIDER_CLASSES.get(name)
        if not provider_cls:
            logger.warning(f"Unknown OCR provider in chain: '{name}' — skipping.")
            continue

        # Quota gate
        limit_fn = _PROVIDER_DAILY_LIMITS.get(name)
        if limit_fn:
            remaining = DailyOCRUsage.remaining(name, limit_fn())
            if remaining <= 0:
                logger.info(f"OCR provider '{name}' quota exhausted for today — skipping.")
                errors.append(f"{name}: daily quota exhausted")
                continue

        try:
            provider = provider_cls()
            if file_url.startswith('http'):
                text = provider.extract_text(file_url=file_url)
            else:
                with doc.file.open('rb') as f:
                    text = provider.extract_text(
                        file_obj=f, filename=doc.file.name
                    )

            DailyOCRUsage.increment(name)
            logger.info(f"OCR succeeded via provider '{name}' for document {doc.id}.")
            return text, name

        except RateLimitError as e:
            logger.warning(f"OCR provider '{name}' rate-limited: {e}")
            errors.append(f"{name}: rate limited")
            continue
        except OCRProviderError as e:
            logger.warning(f"OCR provider '{name}' failed: {e}")
            errors.append(f"{name}: {e}")
            continue

    raise OCRProviderError(
        f"All OCR providers failed for document {doc.id}. Errors: {'; '.join(errors)}"
    )


def _get_document_bytes_and_mime(doc) -> tuple[bytes, str]:
    """Fetch raw file bytes and mime type whether stored locally or via Cloudinary URL."""
    file_url = getattr(doc.file, 'url', '')
    filename = getattr(doc.file, 'name', 'document.jpg')
    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type:
        mime_type = 'application/pdf' if filename.lower().endswith('.pdf') else 'image/jpeg'

    if file_url.startswith('http'):
        resp = requests.get(file_url, timeout=20)
        resp.raise_for_status()
        return resp.content, mime_type
    else:
        with doc.file.open('rb') as f:
            return f.read(), mime_type


def _rescue_with_gemini(doc, doc_type, origin=None):
    """Attempt Gemini Vision rescue pass for structured field extraction."""
    logger.info(f"Attempting Gemini Vision rescue for document {doc.id} ({doc_type}).")
    file_bytes, mime_type = _get_document_bytes_and_mime(doc)
    parser = GeminiDocumentParser()
    extracted = parser.extract_fields(file_bytes=file_bytes, mime_type=mime_type, doc_type=doc_type)

    errors = {}
    if doc_type == 'handlers_license':
        errors = validate_handlers_license(extracted)
    elif doc_type == 'transport_carrier_reg':
        errors = validate_transport_carrier(extracted)
    elif doc_type == 'traders_pass':
        errors = validate_traders_pass(extracted)
    elif doc_type == 'cis':
        errors = validate_cis(extracted, origin)
    elif doc_type == 'endorsement_cert':
        errors = validate_endorsement_cert(extracted, origin)

    return extracted, errors


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

@task()
def extract_document_info(document_id: int, attempt=3):
    """Background task: run OCR on a SubmittedDocument for a permit application.

    1. Tries OCR.space + regex first (0 Gemini tokens consumed).
    2. If OCR fails, rate limits, or validation errors occur, falls back to Gemini Vision rescue.
    3. If Gemini fails or errors remain, safely marks document as MANUAL for Agri review.
    """
    try:
        doc = permits.SubmittedDocument.objects.get(id=document_id)
    except permits.SubmittedDocument.DoesNotExist:
        logger.error(f"SubmittedDocument {document_id} not found.")
        return

    allowed_types = ['transport_carrier_reg', 'handlers_license', 'traders_pass', 'cis', 'endorsement_cert']

    if doc.document_type not in allowed_types:
        permits.OCRValidationResult.objects.update_or_create(
            document=doc,
            defaults={
                'status': 'MANUAL',
                'extracted_field': {},
                'remarks': {
                    'general': (
                        f"Document type '{doc.get_document_type_display()}' does not support automated "
                        "OCR extraction. This document requires manual review by an Agri officer."
                    )
                },
                'provider': 'none',
            }
        )
        check_all_documents_complete(doc.origin.application.id)
        return

    extracted = {}
    errors = {}
    provider_used = 'none'

    # Step 1: Try OCR.space + regex
    try:
        text, provider_used = _call_ocr_chain(doc)

        if doc.document_type == 'handlers_license':
            extracted = extract_handlers_license(text)
            errors = validate_handlers_license(extracted)
        elif doc.document_type == 'transport_carrier_reg':
            extracted = extract_transport_carrier(text)
            errors = validate_transport_carrier(extracted)
        elif doc.document_type == 'traders_pass':
            extracted = extract_traders_pass(text)
            errors = validate_traders_pass(extracted)
        elif doc.document_type == 'cis':
            extracted = extract_cis(text)
            errors = validate_cis(extracted, doc.origin)
        elif doc.document_type == 'endorsement_cert':
            extracted = extract_endorsement_cert(text)
            errors = validate_endorsement_cert(extracted, doc.origin)

    except Exception as e:
        logger.warning(f"Tier 1 OCR.space failed for document {document_id}: {e}")
        errors = {'ocr_space_failed': str(e)}

    # Step 2: Smart Hybrid Fallback — If OCR.space failed or regex had errors, try Gemini Vision
    if errors:
        try:
            gemini_extracted, gemini_errors = _rescue_with_gemini(doc, doc.document_type, doc.origin)
            extracted = gemini_extracted
            errors = gemini_errors
            provider_used = 'gemini'
            logger.info(f"Gemini rescue succeeded for document {doc.id} (errors={len(errors)}).")
        except Exception as e:
            logger.warning(f"Tier 2 Gemini rescue also failed for document {document_id}: {e}")
            if 'ocr_space_failed' not in errors:
                errors['gemini_rescue_error'] = str(e)

    # Step 3: Record result
    permits.OCRValidationResult.objects.update_or_create(
        document=doc,
        defaults={
            'status': 'PASSED' if not errors else 'MANUAL',
            'extracted_field': extracted,
            'remarks': errors if errors else {'general': 'All fields validated successfully.'},
            'provider': provider_used,
        }
    )

    try:
        check_all_documents_complete(doc.origin.application.id)
    except Exception as e:
        logger.error(f"Error in final check_all_documents_complete: {str(e)}")



@task()
def extract_farmer_document_info(farmer_doc_id: int, expected_file_name=None):
    """Background task: run OCR on a FarmerDocument (KYC standing license).

    Auto-populates license_number, expiration_date, and extracted_data.
    """
    try:
        doc = api_models.FarmerDocument.objects.get(id=farmer_doc_id)
    except api_models.FarmerDocument.DoesNotExist:
        logger.error(f"FarmerDocument {farmer_doc_id} not found.")
        return

    file_name = doc.file.name
    uploaded_at = doc.uploaded_at
    if expected_file_name is not None and file_name != expected_file_name:
        return
    extracted = {}
    ocr_failed = False
    try:
        text, _provider = _call_ocr_chain(doc)

        if doc.document_type == 'handlers_license':
            extracted = extract_handlers_license(text)
        elif doc.document_type == 'transport_carrier_reg':
            extracted = extract_transport_carrier(text)
        elif doc.document_type == 'traders_pass':
            extracted = extract_traders_pass(text)
    except Exception as e:
        logger.warning(f"FarmerDocument {farmer_doc_id} OCR.space failed: {e}")
        ocr_failed = True

    # Smart fallback: if OCR failed or registration/license number could not be extracted
    lic_no = extracted.get('license_number') or extracted.get('registration_number')
    if (ocr_failed or not lic_no) and doc.document_type in GeminiDocumentParser.SCHEMAS:
        try:
            gemini_extracted, _ = _rescue_with_gemini(doc, doc.document_type)
            if gemini_extracted:
                extracted = gemini_extracted
                lic_no = extracted.get('license_number') or extracted.get('registration_number')
                logger.info(f"FarmerDocument {farmer_doc_id} rescued by Gemini.")
        except Exception as e:
            logger.warning(f"FarmerDocument {farmer_doc_id} Gemini rescue failed: {e}")

    try:
        exp_date_str = extracted.get('date_of_expiration')
        parsed_exp = parse_date(exp_date_str) if exp_date_str else None

        update_fields = ['ocr_status', 'extracted_data']
        doc.extracted_data = extracted
        doc.ocr_status = "PROCESSED" if extracted else "FAILED"

        if lic_no and not doc.license_number:
            doc.license_number = lic_no
            update_fields.append('license_number')

        if parsed_exp and not doc.expiration_date:
            doc.expiration_date = parsed_exp.date()
            update_fields.append('expiration_date')

        updated = api_models.FarmerDocument.objects.filter(
            pk=doc.pk, file=file_name, uploaded_at=uploaded_at,
        ).update(**{field: getattr(doc, field) for field in update_fields})
        if not updated:
            return
        logger.info(
            f"FarmerDocument {farmer_doc_id} OCR processed. "
            f"Lic: {lic_no}, Exp: {doc.expiration_date}"
        )

    except Exception as e:
        logger.error(f"Error processing OCR for FarmerDocument {farmer_doc_id}: {str(e)}")
        doc.ocr_status = "FAILED"
        api_models.FarmerDocument.objects.filter(pk=doc.pk, file=file_name, uploaded_at=uploaded_at).update(ocr_status="FAILED")

