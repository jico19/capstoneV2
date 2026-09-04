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

                    api.Notification.objects.create(
                        type=api.Notification.Type.WARNING,
                        recipient=application.farmer,
                        title='Application Under Manual Review',
                        message=f'Your application #{application.application_id} requires manual review by an Agri Officer due to document validation issues.'
                    )

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

                    api.AuditTrail.objects.create(
                        what_performed=f"[OCR AUTOMATION] - Application #{application.application_id} flagged for MANUAL REVIEW due to extraction errors/validation failures.",
                        when_performed=timezone.now()
                    )

            else:
                new_status = permits.PermitApplication.Status.OCR_VALIDATED
                if old_status != new_status:
                    application.status = new_status
                    application.save()

                    api.Notification.objects.create(
                        type=api.Notification.Type.SUCCESS,
                        recipient=application.farmer,
                        title='Documents Validated Successfully',
                        message=f'All documents for application #{application.application_id} have passed automated validation.'
                    )

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

    reg_no = find(r'(20\d{2}-DARFO[\w-]+)')
    if not reg_no:
        reg_no = find(r'Registration\s*Number\s*[:\n]\s*([^\n]+)')

    return {
        'registration_number': reg_no,
        'license_number': reg_no,
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

    lic_no = find(r'(20\d{2}-DARFO[\w-]+)')
    if not lic_no:
        lic_no = find(r'License\s*Number\s*[:\n]\s*([^\n]+)')

    return {
        'license_number': lic_no,
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


def extract_traders_pass(text):
    text = re.sub(r'\r\n|\r', '\n', text)

    def find(pattern, flags=re.IGNORECASE | re.MULTILINE):
        match = re.search(pattern, text, flags)
        return match.group(1).strip() if match else None

    # TrPASS Code regex: e.g. TrPASS-OPV-QZN-00014-V1 or TrPASS-OPV-QZN-00014
    pass_code = find(r'(TrPASS-OPV-[A-Z]+-[\w\-]+)')
    if not pass_code:
        pass_code = find(r'T[ri]PASS\s*Code\s*[:\n]\s*([^\n]+)')

    # In OCR.space, lines often appear as:
    # TrPASS-OPV-QZN-00014-V1
    # Darrel A?onuevo
    # Darrel Affonueva Trucking Services
    # Poblacion, San Antonio, Quezon
    # Or labels with colons
    hauler = find(r'Name of Hauler\s*:\s*([^\n]+)')
    biz_name = find(r'Name of Business\s*:\s*([^\n]+)')
    address = find(r'Business Address\s*:\s*([^\n]+)')
    plate_no = find(r'Plate Number\s*:\s*([^\n]+)')
    vehicle_type = find(r'Type of Vehicle\s*:\s*([^\n]+)')
    issue_date = find(r'Issue Date\s*:\s*(\d{1,2}/\d{1,2}/\d{4}|\w+\s+\d{1,2},?\s*\d{4})')

    # If key-value colons were on lines below:
    if not hauler:
        # Check if values are clustered under the block
        m = re.search(
            r'(TrPASS-OPV-[^\n]+)\n([^\n]+)\n([^\n]+)\n([^\n]+)',
            text
        )
        if m:
            if not pass_code:
                pass_code = m.group(1).strip()
            hauler = m.group(2).strip()
            biz_name = m.group(3).strip()
            address = m.group(4).strip()

    if not plate_no:
        m_plate = re.search(r'\n([A-Z]{2,4}\s?\d{3,4})\nSilver|Gray|White|Black|Red|Blue|JITNEY', text, re.IGNORECASE)
        if m_plate:
            plate_no = m_plate.group(1).strip()
        else:
            m_gen = re.search(r'\b([A-Z]{3}\s*\d{3,4})\b', text)
            if m_gen:
                plate_no = m_gen.group(1).strip()

    # Calculate default 1-year expiration from issue date if found
    expiration_date_str = None
    if issue_date:
        parsed_issue = parse_date(issue_date)
        if parsed_issue:
            try:
                # 1 year later
                exp_dt = parsed_issue.replace(year=parsed_issue.year + 1)
                expiration_date_str = exp_dt.strftime('%Y-%m-%d')
            except ValueError:
                exp_dt = parsed_issue + datetime.timedelta(days=365)
                expiration_date_str = exp_dt.strftime('%Y-%m-%d')

    return {
        'license_number': pass_code,
        'name_of_applicant': hauler,
        'business_name': biz_name,
        'address': address,
        'plate_no': plate_no,
        'vehicle_type': vehicle_type,
        'date_of_issuance': issue_date,
        'date_of_expiration': expiration_date_str,
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


def validate_traders_pass(extracted):
    errors = {}
    today = datetime.today()

    if not extracted.get('license_number'):
        errors['license_number'] = 'TrPASS code could not be extracted.'

    if not extracted.get('date_of_issuance'):
        errors['date_of_issuance'] = 'Issue date could not be extracted.'

    expiry_str = extracted.get('date_of_expiration')
    if expiry_str:
        expiry = parse_date(expiry_str)
        if expiry and expiry < today:
            errors['date_of_expiration'] = f'Trader\'s pass expired as of {expiry.strftime("%B %d, %Y")}.'

    return errors

