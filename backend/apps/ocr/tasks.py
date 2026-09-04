import logging
import requests
from datetime import timedelta
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
    parse_date,
    check_all_documents_complete
)
from django.tasks import task

logger = logging.getLogger(__name__)

class OCRRateLimitError(Exception):
    """Custom exception for OCR rate limits."""
    pass

@task()
def extract_document_info(document_id: int, attempt=3):
    """
    Background task to process OCR for a permit application document.
    Uses django-tasks TaskContext to handle non-blocking retries for rate limits.
    """
    MAX_ATTEMPTS = 4  # Initial attempt + 3 retries
    RETRY_DELAY = 10  # Base delay in seconds

    try:
        doc = permits.SubmittedDocument.objects.get(id=document_id)
    except permits.SubmittedDocument.DoesNotExist:
        logger.error(f"SubmittedDocument with ID {document_id} not found.")
        return

    allowed_types = ['transport_carrier_reg', 'handlers_license', 'traders_pass']

    if doc.document_type not in allowed_types:
        permits.OCRValidationResult.objects.update_or_create(
            document=doc,
            defaults={
                'status': 'PASSED',
                'extracted_field': {},
                'remarks': {'general': 'No OCR required for this document type.'}
            }
        )
        check_all_documents_complete(doc.origin.application.id)
        return
    
    try:
        # OCR request configuration
        api_url = settings.OCR_URL
        payload = {
            'apikey': settings.OCR_API_KEY,
            'language': 'eng',
            'isOverlayRequired': False,
            'detectOrientation': True,
            'scale': True,
            'OCREngine': 2
        }

        # Handle Cloudinary (URL) or Local (File)
        file_url = doc.file.url
        if file_url.startswith('http'):
            payload['url'] = file_url
            response = requests.post(url=api_url, data=payload, timeout=30)
        else:
            with doc.file.open('rb') as f:
                files = {'file': (doc.file.name, f)}
                response = requests.post(url=api_url, data=payload, files=files, timeout=30)

        # Handle 429 Too Many Requests
        if response.status_code == 429:
            raise OCRRateLimitError("Rate limit reached (429).")

        response.raise_for_status()
        ocr_response = response.json()

        # Handle API-level errors
        if ocr_response.get('OCRExitCode') != 1:
            error_message = ocr_response.get('ErrorMessage', 'Unknown OCR API error')
            # Check if ErrorMessage indicates rate limit
            if "rate limit" in error_message.lower() or "too many requests" in error_message.lower():
                raise OCRRateLimitError(error_message)
            
            logger.error(f"OCR API Error for doc {document_id}: {error_message}")
            raise Exception(f"OCR API Error: {error_message}")

        parsed_results = ocr_response.get('ParsedResults', [])
        if not parsed_results:
            logger.error(f"No parsed results for doc {document_id}")
            raise Exception("No parsed results returned from OCR API")

        text = parsed_results[0].get('ParsedText', '')

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

        permits.OCRValidationResult.objects.update_or_create(
                document=doc,
                defaults={
                    'status': 'PASSED' if not errors else 'MANUAL',
                    'extracted_field': extracted,
                    'remarks': errors if errors else {'general': 'All fields validated successfully.'}
                }
            )
        
    except OCRRateLimitError as e:
        logger.warning(f"OCR Rate Limit hit for doc {document_id}. {e}")
        permits.OCRValidationResult.objects.update_or_create(
            document=doc,
            defaults={
                'status': 'MANUAL',
                'extracted_field': {},
                'remarks': {'error': 'OCR provider rate limit exceeded. Manual verification required.'}
            }
        )

    except (requests.exceptions.RequestException, Exception) as e:
        logger.error(f"Failed to process OCR for document {document_id}: {str(e)}")
        permits.OCRValidationResult.objects.update_or_create(
            document=doc,
            defaults={
                'status': 'MANUAL',
                'extracted_field': {},
                'remarks': {'error': f'OCR processing failed: {str(e)}. Document requires manual verification.'}
            }
        )

    finally:
        try:
            check_all_documents_complete(doc.origin.application.id)
        except Exception as e:
            logger.error(f"Error in final check_all_documents_complete: {str(e)}")


@task()
def extract_farmer_document_info(farmer_doc_id: int):
    """
    Background task to run OCR on standing KYC licenses uploaded by a Farmer.
    Auto-populates license_number, expiration_date, and extracted_data.
    """
    try:
        doc = api_models.FarmerDocument.objects.get(id=farmer_doc_id)
    except api_models.FarmerDocument.DoesNotExist:
        logger.error(f"FarmerDocument with ID {farmer_doc_id} not found.")
        return

    try:
        api_url = settings.OCR_URL
        payload = {
            'apikey': settings.OCR_API_KEY,
            'language': 'eng',
            'isOverlayRequired': False,
            'detectOrientation': True,
            'scale': True,
            'OCREngine': 2
        }

        file_url = doc.file.url
        if file_url.startswith('http'):
            payload['url'] = file_url
            response = requests.post(url=api_url, data=payload, timeout=30)
        else:
            with doc.file.open('rb') as f:
                files = {'file': (doc.file.name, f)}
                response = requests.post(url=api_url, data=payload, files=files, timeout=30)

        if response.status_code == 429:
            doc.ocr_status = "FAILED"
            doc.save(update_fields=["ocr_status"])
            return

        response.raise_for_status()
        ocr_response = response.json()

        if ocr_response.get('OCRExitCode') != 1:
            doc.ocr_status = "FAILED"
            doc.save(update_fields=["ocr_status"])
            return

        parsed_results = ocr_response.get('ParsedResults', [])
        if not parsed_results:
            doc.ocr_status = "FAILED"
            doc.save(update_fields=["ocr_status"])
            return

        text = parsed_results[0].get('ParsedText', '')
        extracted = {}

        if doc.document_type == 'handlers_license':
            extracted = extract_handlers_license(text)
        elif doc.document_type == 'transport_carrier_reg':
            extracted = extract_transport_carrier(text)
        elif doc.document_type == 'traders_pass':
            extracted = extract_traders_pass(text)

        lic_no = extracted.get('license_number') or extracted.get('registration_number')
        exp_date_str = extracted.get('date_of_expiration')

        parsed_exp = None
        if exp_date_str:
            parsed_exp = parse_date(exp_date_str)

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
        logger.info(f"FarmerDocument {farmer_doc_id} OCR processed successfully. Lic: {lic_no}, Exp: {doc.expiration_date}")

    except Exception as e:
        logger.error(f"Error processing OCR for FarmerDocument {farmer_doc_id}: {str(e)}")
        doc.ocr_status = "FAILED"
        doc.save(update_fields=["ocr_status"])

