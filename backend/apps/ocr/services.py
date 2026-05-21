import logging
from apps.permits import models as permits
from apps.api import models as api
import requests
import re
from datetime import datetime
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, NotFound, APIException

logger = logging.getLogger(__name__)

# HELPERS

def check_all_documents_complete(application_id):
    """
    Checks if all documents for an application have been processed by OCR.
    Updates application status and notifies relevant users.
    Uses atomic transaction and select_for_update to prevent race conditions.
    """
    try:
        with transaction.atomic():
            # Lock the application record to prevent multiple tasks from updating it simultaneously
            application = permits.PermitApplication.objects.select_for_update().get(id=application_id)
            
            total_docs = permits.SubmittedDocument.objects.filter(origin__application=application).count()
            ocr_results = permits.OCRValidationResult.objects.filter(
                document__origin__application=application
            )
            total_ocr_results = ocr_results.count()

            # Not all docs processed yet — wait for other background tasks
            if total_ocr_results < total_docs:
                return False

            manual_docs = ocr_results.filter(status='MANUAL')
            
            # Identify if we are transitioning to a new state to avoid duplicate notifications
            old_status = application.status

            if manual_docs.exists():
                new_status = permits.PermitApplication.Status.MANUAL
                if old_status != new_status:
                    application.status = new_status
                    application.save()

                    # Notification for Farmer
                    api.Notification.objects.create(
                        type=api.Notification.Type.WARNING,
                        recipient=application.farmer,
                        title='Application Under Manual Review',
                        message=f'Your application #{application.application_id} requires manual review by an Agri Officer due to document validation issues.'
                    )

                    # Bulk notification for Agri Officers
                    agri_officers = api.User.objects.filter(role='Agri')
                    if agri_officers.exists():
                        manual_types = [r.document.get_document_type_display() for r in manual_docs]
                        api.Notification.objects.bulk_create([
                            api.Notification(
                                type=api.Notification.Type.INFO,
                                recipient=officer,
                                title='Manual Review Required',
                                message=f'Application #{application.application_id} from {application.farmer.get_full_name()} requires manual review for: {", ".join(manual_types)}.'
                            )
                            for officer in agri_officers
                        ])

                    # Audit Trail
                    api.AuditTrail.objects.create(
                        what_performed=f"[OCR AUTOMATION] - Application #{application.application_id} flagged for MANUAL REVIEW due to extraction errors/validation failures.",
                        when_performed=timezone.now()
                    )

            else:
                # All documents passed OCR validation
                new_status = permits.PermitApplication.Status.OCR_VALIDATED
                if old_status != new_status:
                    application.status = new_status
                    application.save()

                    # Notify farmer
                    api.Notification.objects.create(
                        type=api.Notification.Type.SUCCESS,
                        recipient=application.farmer,
                        title='Documents Validated Successfully',
                        message=f'All documents for application #{application.application_id} have passed automated validation.'
                    )

                    # Notify Agri Officers
                    agri_officers = api.User.objects.filter(role='Agri')
                    if agri_officers.exists():
                        api.Notification.objects.bulk_create([
                            api.Notification(
                                type=api.Notification.Type.INFO,
                                recipient=officer,
                                title='New Application Ready for Review',
                                message=f'Application #{application.application_id} from {application.farmer.get_full_name()} has passed OCR validation and is ready for review.'
                            )
                            for officer in agri_officers
                        ])
                    
                    # Audit Trail
                    api.AuditTrail.objects.create(
                        what_performed=f"[OCR AUTOMATION] - Application #{application.application_id} documents successfully validated. Status updated to OCR_VALIDATED.",
                        when_performed=timezone.now()
                    )

            return True

    except permits.PermitApplication.DoesNotExist:
        logger.error(f"PermitApplication with ID {application_id} not found.")
        return False
    except Exception as e:
        logger.error(f"Error in check_all_documents_complete: {str(e)}")
        # In a background task, we don't want to crash everything, but we should log it
        return False



def extract_handlers_license(text):
    text = re.sub(r'\r\n|\r', '\n', text)

    def find(pattern, flags=re.IGNORECASE | re.MULTILINE):
        match = re.search(pattern, text, flags)
        return match.group(1).strip() if match else None

    # More robust patterns: allowing for colons, multiple spaces, and values before/after labels
    return {
        'registration_number': find(r'(20\d{2}-DARFO[\w-]+)'),
        'name_of_applicant': find(r'^(?:.*?\n)?([^\n]+)\s*\n\s*NAME OF APPLICANT', re.IGNORECASE | re.MULTILINE),
        'business_name': find(r'^(?:.*?\n)?([^\n]+)\s*\n\s*BUSINESS NAME', re.IGNORECASE | re.MULTILINE),
        'address': find(r'^(?:.*?\n)?([^\n]+)\s*\n\s*ADDRESS', re.IGNORECASE | re.MULTILINE),
        'area_of_coverage': find(r'^(?:.*?\n)?([^\n]+)\s*\n\s*AREA OF COVERAGE', re.IGNORECASE | re.MULTILINE),
        'date_of_issuance': find(r'(\w+\s+\d{1,2},?\s*\d{4})\s*\n\s*DATE OF ISSUANCE', re.IGNORECASE | re.MULTILINE),
        'date_of_expiration': find(r'(\w+\s+\d{1,2},?\s*\d{4})\s*\n\s*DATE OF EXPIRATION', re.IGNORECASE | re.MULTILINE),
    }

def extract_transport_carrier(text):
    text = re.sub(r'\r\n|\r', '\n', text)

    def find(pattern, flags=re.IGNORECASE | re.MULTILINE):
        match = re.search(pattern, text, flags)
        return match.group(1).strip() if match else None

    return {
        'license_number': find(r'(20\d{2}-DARFO[\w-]+)'),
        'name_of_applicant': find(r'^(?:.*?\n)?([^\n]+)\s*\n\s*NAME OF APPLICANT', re.IGNORECASE | re.MULTILINE),
        'business_name': find(r'^(?:.*?\n)?([^\n]+)\s*\n\s*BUSINESS NAME', re.IGNORECASE | re.MULTILINE),
        'address': find(r'^(?:.*?\n)?([^\n]+)\s*\n\s*ADDRESS', re.IGNORECASE | re.MULTILINE),
        'plate_no': find(r'([A-Z]{2,4}\s?[\d\-]{3,4})\s*\n\s*PLATE NO', re.IGNORECASE | re.MULTILINE),
        'motor_vehicle_no': find(r'([\d\-]+)\s*\n\s*MOTOR VEHICLE', re.IGNORECASE | re.MULTILINE),
        'temporary_conduction_sticker': find(r'(N/A|[\w\d]+)\s*\n\s*TEMPORARY', re.IGNORECASE | re.MULTILINE),
        'maker_brand': find(r'^(?:.*?\n)?([^\n]+)\s*\n\s*MAKER\s*/\s*BRAND', re.IGNORECASE | re.MULTILINE),
        'body_type': find(r'^(?:.*?\n)?([^\n]+)\s*\n\s*BODY TYPE', re.IGNORECASE | re.MULTILINE),
        'date_of_issuance': find(r'(\w+\s+\d{1,2},?\s*\d{4})\s*\n\s*DATE OF ISSUANCE', re.IGNORECASE | re.MULTILINE),
        'date_of_expiration': find(r'(\w+\s+\d{1,2},?\s*\d{4})\s*\n\s*DATE OF EXPIRATION', re.IGNORECASE | re.MULTILINE),
    }


def parse_date(date_str):
    """Try common date formats."""
    formats = ['%B %d, %Y', '%m/%d/%Y', '%Y-%m-%d', '%d-%m-%Y', '%b %d, %Y']
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except (ValueError, AttributeError):
            continue
    return None


def validate_handlers_license(extracted):
    errors = {}
    today = datetime.today()

    required_fields = ['name_of_applicant', 'business_name',
                        'address', 'date_of_issuance', 'date_of_expiration', 'registration_number']
    for field in required_fields:
        if not extracted.get(field):
            errors[field] = 'Field could not be extracted.'

    expiry = parse_date(extracted.get('date_of_expiration', ''))
    if expiry is None:
        errors['date_of_expiration'] = 'Could not parse expiration date.'
    elif expiry < today:
        errors['date_of_expiration'] = f'Document is expired as of {expiry.strftime("%B %d, %Y")}.'

    return errors


def validate_transport_carrier(extracted):
    errors = {}
    today = datetime.today()

    required_fields = [
        'license_number','name_of_applicant', 'business_name', 'address',
        'plate_no', 'motor_vehicle_no', 'maker_brand',
        'body_type', 'date_of_issuance', 'date_of_expiration'
    ]
    for field in required_fields:
        if not extracted.get(field):
            errors[field] = 'Field could not be extracted.'

    expiry = parse_date(extracted.get('date_of_expiration', ''))
    if expiry is None:
        errors['date_of_expiration'] = 'Could not parse expiration date.'
    elif expiry < today:
        errors['date_of_expiration'] = f'Document is expired as of {expiry.strftime("%B %d, %Y")}.'

    plate = extracted.get('plate_no', '')
    if plate and not re.match(r'^[A-Z]{2,3}[\s\-]?\d{3,4}$', plate.upper()):
        errors['plate_no'] = f'Plate number format looks invalid: {plate}'

    return errors
