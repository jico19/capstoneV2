import re
import logging
from datetime import datetime
from django.db import transaction
from django.utils import timezone
from apps.permits import models as permits
from apps.api import models as api
from .parsers import parse_date

logger = logging.getLogger(__name__)


def validate_handlers_license(extracted: dict) -> dict:
    """Validate extracted fields for Handler's License."""
    errors = {}
    today = datetime.today()

    required_fields = [
        'name_of_applicant', 'business_name',
        'address', 'date_of_issuance', 'date_of_expiration', 'registration_number'
    ]
    for field in required_fields:
        if not extracted.get(field):
            errors[field] = 'Field could not be extracted.'

    expiry = parse_date(extracted.get('date_of_expiration', ''))
    if expiry is None:
        errors['date_of_expiration'] = 'Could not parse expiration date.'
    elif expiry < today:
        errors['date_of_expiration'] = f'Document is expired as of {expiry.strftime("%B %d, %Y")}.'

    return errors


def validate_transport_carrier(extracted: dict) -> dict:
    """Validate extracted fields for Transport Carrier Registration."""
    errors = {}
    today = datetime.today()

    required_fields = [
        'license_number', 'name_of_applicant', 'business_name', 'address',
        'plate_no', 'maker_brand', 'body_type',
        'date_of_issuance', 'date_of_expiration',
    ]
    for field in required_fields:
        if not extracted.get(field):
            errors[field] = 'Field could not be extracted.'

    expiry = parse_date(extracted.get('date_of_expiration', ''))
    if expiry is None:
        errors['date_of_expiration'] = 'Could not parse expiration date.'
    elif expiry < today:
        errors['date_of_expiration'] = f'Document is expired as of {expiry.strftime("%B %d, %Y")}.'

    plate = (extracted.get('plate_no') or '').strip().upper()
    if plate:
        valid_plate = re.match(r'^[A-Z]{1,4}[\s\-]?\d{3,4}[A-Z]?$', plate)
        if not valid_plate:
            errors['plate_no'] = f'Plate number format looks invalid: {plate}'

    return errors


def validate_traders_pass(extracted: dict) -> dict:
    """Validate extracted fields for Trader's Pass."""
    errors = {}

    if not extracted.get('license_number'):
        errors['license_number'] = 'TrPASS code could not be extracted.'

    if not extracted.get('date_of_issuance'):
        errors['date_of_issuance'] = 'Issue date could not be extracted.'

    return errors


def validate_cis(extracted: dict, application_origin) -> dict:
    """Cross-check extracted CIS fields against a TransportOrigin."""
    errors = {}

    count = extracted.get('number_of_animals')
    if count is None:
        errors['number_of_animals'] = 'Pig count could not be extracted.'
    elif application_origin and count != application_origin.number_of_pigs:
        errors['number_of_animals'] = (
            f'CIS pig count ({count}) does not match the declared '
            f'{application_origin.number_of_pigs} pigs for this origin.'
        )

    shipment_date = extracted.get('shipment_date')
    transport_date = getattr(getattr(application_origin, 'application', None), 'transport_date', None)

    if not shipment_date:
        errors['shipment_date'] = 'Shipment date could not be extracted.'
    else:
        try:
            shipped = datetime.strptime(shipment_date, '%Y-%m-%d').date()
        except ValueError:
            errors['shipment_date'] = f'Could not parse shipment date: {shipment_date}.'
        else:
            if transport_date and abs((shipped - transport_date).days) > 3:
                errors['shipment_date'] = (
                    f'Shipment date ({shipment_date}) is more than 3 days from '
                    f'the transport date ({transport_date}).'
                )

    if not extracted.get('destination'):
        errors['destination'] = 'Destination could not be extracted.'

    if not extracted.get('proprietor_name'):
        errors['proprietor_name'] = 'Proprietor/shipper name could not be extracted.'

    return errors


def validate_endorsement_cert(extracted: dict, application_origin) -> dict:
    """Cross-check extracted Endorsement Certificate fields against a TransportOrigin.

    Returns an empty dict when everything matches, otherwise a dict of
    field -> error message.
    """
    errors = {}

    count = extracted.get('number_of_animals')
    if count is None:
        errors['number_of_animals'] = 'Pig count could not be extracted from endorsement certificate.'
    elif application_origin and count != application_origin.number_of_pigs:
        errors['number_of_animals'] = (
            f'Endorsement pig count ({count}) does not match the declared '
            f'{application_origin.number_of_pigs} pigs for this origin.'
        )

    extracted_brgy = extracted.get('barangay')
    if not extracted_brgy:
        errors['barangay'] = 'Barangay could not be extracted from endorsement certificate.'
    elif application_origin and application_origin.barangay:
        origin_brgy_name = (application_origin.barangay.name or '').upper()
        clean_extracted = re.sub(r'^(?:BRGY\.?|BARANGAY)\s*', '', extracted_brgy.strip(), flags=re.IGNORECASE).upper()
        clean_origin = re.sub(r'^(?:BRGY\.?|BARANGAY)\s*', '', origin_brgy_name, flags=re.IGNORECASE).upper()
        if clean_extracted not in clean_origin and clean_origin not in clean_extracted:
            errors['barangay'] = (
                f'Endorsement barangay ({extracted_brgy}) does not match origin barangay ({application_origin.barangay.name}).'
            )

    if not extracted.get('official_name'):
        errors['official_name'] = 'Barangay Official / Punong Barangay name could not be extracted.'

    return errors



def check_all_documents_complete(application_id: int) -> bool:
    """Checks if all documents for an application have been processed by OCR.

    Updates application status to OCR_VALIDATED or MANUAL and triggers notifications.
    Uses select_for_update to avoid race conditions.
    """
    try:
        with transaction.atomic():
            application = permits.PermitApplication.objects.select_for_update().get(id=application_id)

            total_docs = permits.SubmittedDocument.objects.filter(origin__application=application).count()
            ocr_results = permits.OCRValidationResult.objects.filter(
                document__origin__application=application
            )
            total_ocr_results = ocr_results.count()

            if total_ocr_results < total_docs:
                return False

            manual_docs = ocr_results.filter(status='MANUAL')
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
        return False
