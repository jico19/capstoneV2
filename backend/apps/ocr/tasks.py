import logging
import requests
from datetime import timedelta
from django.conf import settings
from apps.permits import models as permits
from .services import (
    validate_handlers_license,
    extract_transport_carrier,
    extract_handlers_license,
    validate_transport_carrier,
    check_all_documents_complete
)
from django.tasks import task

# Initialize logger for this module
logger = logging.getLogger(__name__)

class OCRRateLimitError(Exception):
    """Custom exception for OCR rate limits."""
    pass

@task(takes_context=True)
def extract_document_info(context, document_id: int):
    """
    Background task to process OCR for a document.
    Uses django-tasks TaskContext to handle non-blocking retries for rate limits.
    """
    MAX_ATTEMPTS = 4  # Initial attempt + 3 retries
    RETRY_DELAY = 10  # Base delay in seconds

    try:
        doc = permits.SubmittedDocument.objects.get(id=document_id)
    except permits.SubmittedDocument.DoesNotExist:
        logger.error(f"SubmittedDocument with ID {document_id} not found.")
        return

    allowed_types = ['transport_carrier_reg', 'handlers_license']

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

        # read the document
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

        permits.OCRValidationResult.objects.update_or_create(
                document=doc,
                defaults={
                    'status': 'PASSED' if not errors else 'MANUAL',
                    'extracted_field': extracted,
                    'remarks': errors if errors else {'general': 'All fields validated successfully.'}
                }
            )
        
    except OCRRateLimitError as e:
        attempt = context.task_result.attempt_count
        if attempt < MAX_ATTEMPTS:
            # Exponential backoff: 10s, 20s, 40s...
            wait_time = RETRY_DELAY * (2 ** (attempt - 1))
            logger.warning(f"OCR Rate Limit hit for doc {document_id}. Retrying in {wait_time}s... (Attempt {attempt})")
            
            # Re-enqueue with a delay
            extract_document_info.using(run_after=timedelta(seconds=wait_time)).enqueue(document_id)
            return
        else:
            logger.error(f"Max attempts reached for OCR rate limit on document {document_id}.")
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
