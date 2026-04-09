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


@task()
def extract_document_info(document_id: int):

    doc = permits.SubmittedDocument.objects.get(id=document_id)


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
        print(check_all_documents_complete(doc.application.id))
        return
    
    # request
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

    parsed_results = ocr_response.get('ParsedResults', [])
    text = parsed_results[0]['ParsedText'] if parsed_results else ''

    
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
    
    check_all_documents_complete(doc.application.id)
