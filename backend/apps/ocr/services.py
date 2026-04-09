from apps.permits import models as permits
from apps.api import models as api
import requests
import re
from datetime import datetime



# HELPERS

def check_all_documents_complete(application_id):
    application         = permits.PermitApplication.objects.get(id=application_id)
    total_docs          = application.documents.count()
    total_ocr_results   = permits.OCRValidationResult.objects.filter(
        document__application=application
    ).count()

    # Not all docs processed yet — wait
    if total_ocr_results < total_docs:
        return

    manual_docs = permits.OCRValidationResult.objects.filter(
        document__application=application,
        status='MANUAL'
    )

    print(manual_docs)

    if manual_docs.exists():
        manual_types = [r.document.get_document_type_display() for r in manual_docs]
        print(manual_types)
        application.status  = permits.PermitApplication.Status.MANUAL
        application.save()

        api.Notification.objects.create(
            recipient   = application.farmer,
            title       = 'Application Under Manual Review',
            message     = f'Your application #{application.pk} is currently under manual review. '
                f'Please wait for the Agri Officer to verify your documents.'
        )

        agri_officers = api.User.objects.filter(role='Agri')
        api.Notification.objects.bulk_create([
            api.Notification(
                recipient   = officer,
                title       = 'Manual Review Required',
                message     = f'Application #{application.pk} from {application.farmer.get_full_name()} '
                            f'requires manual review for: {", ".join(manual_types)}.'
            )
            for officer in agri_officers
        ])

    else:
        print("tite")
        # All passed
        application.status  = permits.PermitApplication.Status.OCR_VALIDATED
        application.save()

        # Notify farmer
        api.Notification.objects.create(
            recipient   = application.farmer,
            title       = 'Documents Validated Successfully',
            message     = f'All documents for application #{application.pk} have passed validation. '
                    f'Your application is now under review.'
        )

        # Notify Agri Officers
        agri_officers =  api.User.objects.filter(role='Agri')
        permits.Notification.objects.bulk_create([
            permits.Notification(
                recipient   = officer,
                title       = 'New Application Ready for Review',
                message     = f'Application #{application.pk} from {application.farmer.get_full_name()} '
                            f'has passed OCR validation and is ready for review.'
            )
            for officer in agri_officers
        ])

    return True



def extract_handlers_license(text):
    text = re.sub(r'\r\n|\r', '\n', text)

    def find(pattern, flags=re.IGNORECASE | re.MULTILINE):
        match = re.search(pattern, text, flags)
        return match.group(1).strip() if match else None

    return {
        'registration_number': find(r'(20\d{2}-DARFO[\w-]+)'),
        'name_of_applicant': find(r'^([^\n]+)\nNAME OF APPLICANT'),
        'business_name': find(r'^([^\n]+)\nBUSINESS NAME'),
        'address': find(r'^([^\n]+)\nADDRESS'),
        'area_of_coverage': find(r'^([^\n]+)\nAREA OF COVERAGE'),
        'date_of_issuance': find(r'(\w+ \d{1,2},\s*\d{4})\nDATE OF ISSUANCE'),
        'date_of_expiration': find(r'(\w+ \d{1,2},\s*\d{4})\nDATE OF EXPIRATION'),
    }

def extract_transport_carrier(text):
    text = re.sub(r'\r\n|\r', '\n', text)

    def find(pattern):
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        return match.group(1).strip() if match else None

    return {
        'license_number': find(r'(20\d{2}-DARFO[\w-]+)'),
        'name_of_applicant': find(r'^([^\n]+)\nNAME OF APPLICANT'),
        'business_name': find(r'^([^\n]+)\nBUSINESS NAME'),
        'address': find(r'^([^\n]+)\nADDRESS'),
        'plate_no': find(r'([A-Z]{2,4}\s?\d{3,4})\nPLATE NO'),
        'motor_vehicle_no': find(r'([\d\-]+)\nMOTOR VEHICLE'),
        'temporary_conduction_sticker': find(r'(N/A|[\w\d]+)\nTEMPORARY'),
        'maker_brand': find(r'^([^\n]+)\nMAKER\s*/\s*BRAND'),
        'body_type': find(r'^([^\n]+)\nBODY TYPE'),
        'date_of_issuance': find(r'(\w+ \d{1,2},\s*\d{4})\nDATE OF ISSUANCE'),
        'date_of_expiration': find(r'(\w+ \d{1,2},\s*\d{4})\nDATE OF EXPIRATION'),
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
