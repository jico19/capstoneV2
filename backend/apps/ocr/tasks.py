import logging
from django.conf import settings
from apps.permits import models as permits
import requests
from .services import (
    validate_handlers_license,
    extract_transport_carrier,
    extract_handlers_license,
    validate_transport_carrier,
    check_all_documents_complete
)
from django.tasks import task

logger = logging.getLogger(__name__)

@task()
def extract_document_info(document_id: int):
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
        try:
            check_all_documents_complete(doc.origin.application.id)
        except Exception as e:
            logger.error(f"Error in check_all_documents_complete: {str(e)}")
        return
    
    try:
        # OCR request configuration
        api_url = settings.OCR_URL
        payload = {
            'apikey': settings.OCR_API_KEY,
            'language': 'eng',
        }

        # read the document
        with doc.file.open('rb') as f:
            files = {'file': (doc.file.name, f)}
            response = requests.post(url=api_url, data=payload, files=files, timeout=30)

        response.raise_for_status()
        ocr_response = response.json()

        if ocr_response.get('OCRExitCode') != 1:
            error_message = ocr_response.get('ErrorMessage', 'Unknown OCR API error')
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
