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
    PaddleOCRProvider,
    OCRProviderError,
    RateLimitError,
)
from .models import DailyOCRUsage
from django.tasks import task

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider registry
# ---------------------------------------------------------------------------

_PROVIDER_CLASSES = {
    'paddleocr': PaddleOCRProvider,
    'ocrspace': OCRSpaceProvider,
}

_PROVIDER_DAILY_LIMITS = {
    'paddleocr': lambda: getattr(settings, 'PADDLE_OCR_DAILY_LIMIT', 20000),
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


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

@task()
def extract_document_info(document_id: int, attempt=3):
    """Background task: run OCR on a SubmittedDocument for a permit application.

    Tries providers in OCR_PROVIDER_CHAIN order, falls back on rate-limit or
    failure, and marks the document MANUAL if the entire chain is exhausted.
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

    try:
        text, provider_used = _call_ocr_chain(doc)

        extracted = {}
        errors = {}

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

        permits.OCRValidationResult.objects.update_or_create(
            document=doc,
            defaults={
                'status': 'PASSED' if not errors else 'MANUAL',
                'extracted_field': extracted,
                'remarks': errors if errors else {'general': 'All fields validated successfully.'},
                'provider': provider_used,
            }
        )

    except OCRProviderError as e:
        logger.error(f"All OCR providers failed for document {document_id}: {e}")
        permits.OCRValidationResult.objects.update_or_create(
            document=doc,
            defaults={
                'status': 'MANUAL',
                'extracted_field': {},
                'remarks': {'error': f'OCR processing failed: {str(e)}. Manual verification required.'},
                'provider': 'none',
            }
        )

    except Exception as e:
        logger.error(f"Unexpected error processing OCR for document {document_id}: {str(e)}")
        permits.OCRValidationResult.objects.update_or_create(
            document=doc,
            defaults={
                'status': 'MANUAL',
                'extracted_field': {},
                'remarks': {'error': f'Unexpected error: {str(e)}. Document requires manual verification.'},
                'provider': 'none',
            }
        )

    finally:
        try:
            check_all_documents_complete(doc.origin.application.id)
        except Exception as e:
            logger.error(f"Error in final check_all_documents_complete: {str(e)}")


@task()
def extract_farmer_document_info(farmer_doc_id: int):
    """Background task: run OCR on a FarmerDocument (KYC standing license).

    Auto-populates license_number, expiration_date, and extracted_data.
    """
    try:
        doc = api_models.FarmerDocument.objects.get(id=farmer_doc_id)
    except api_models.FarmerDocument.DoesNotExist:
        logger.error(f"FarmerDocument {farmer_doc_id} not found.")
        return

    try:
        text, _provider = _call_ocr_chain(doc)

        extracted = {}
        if doc.document_type == 'handlers_license':
            extracted = extract_handlers_license(text)
        elif doc.document_type == 'transport_carrier_reg':
            extracted = extract_transport_carrier(text)
        elif doc.document_type == 'traders_pass':
            extracted = extract_traders_pass(text)

        lic_no = extracted.get('license_number') or extracted.get('registration_number')
        exp_date_str = extracted.get('date_of_expiration')
        parsed_exp = parse_date(exp_date_str) if exp_date_str else None

        update_fields = ['ocr_status', 'extracted_data']
        doc.extracted_data = extracted
        doc.ocr_status = "PROCESSED"

        if lic_no and not doc.license_number:
            doc.license_number = lic_no
            update_fields.append('license_number')

        if parsed_exp and not doc.expiration_date:
            doc.expiration_date = parsed_exp.date()
            update_fields.append('expiration_date')

        doc.save(update_fields=update_fields)
        logger.info(
            f"FarmerDocument {farmer_doc_id} OCR processed. "
            f"Lic: {lic_no}, Exp: {doc.expiration_date}"
        )

    except OCRProviderError as e:
        logger.error(f"All OCR providers failed for FarmerDocument {farmer_doc_id}: {e}")
        doc.ocr_status = "FAILED"
        doc.save(update_fields=["ocr_status"])

    except Exception as e:
        logger.error(f"Error processing OCR for FarmerDocument {farmer_doc_id}: {str(e)}")
        doc.ocr_status = "FAILED"
        doc.save(update_fields=["ocr_status"])
