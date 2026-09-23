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

    # block_dates handles both stacked (dates above labels) and inline layouts
    block_dates = _extract_block_dates(text)
    issue_date = block_dates.get('date_of_issuance') or find(r'(\w+\s+\d{1,2},?\s*\d{4})\s*\n\s*DATE OF ISSUANCE', re.IGNORECASE | re.MULTILINE)
    expiry_date = block_dates.get('date_of_expiration') or find(r'(\w+\s+\d{1,2},?\s*\d{4})\s*\n\s*DATE OF EXPIRATION', re.IGNORECASE | re.MULTILINE)

    return {
        'registration_number': reg_no,
        'license_number': reg_no,
        'name_of_applicant': find(r'^(?:.*?\n)?([^\n]+)\s*\n\s*NAME OF APPLICANT', re.IGNORECASE | re.MULTILINE),
        'business_name': find(r'^(?:.*?\n)?([^\n]+)\s*\n\s*BUSINESS NAME', re.IGNORECASE | re.MULTILINE),
        'address': find(r'^(?:.*?\n)?([^\n]+)\s*\n\s*ADDRESS', re.IGNORECASE | re.MULTILINE),
        'area_of_coverage': find(r'^(?:.*?\n)?([^\n]+)\s*\n\s*AREA OF COVERAGE', re.IGNORECASE | re.MULTILINE),
        'date_of_issuance': issue_date,
        'date_of_expiration': expiry_date,
    }

def extract_transport_carrier(text):
    text = re.sub(r'\r\n|\r', '\n', text)

    def find(pattern, flags=re.IGNORECASE | re.MULTILINE):
        match = re.search(pattern, text, flags)
        return match.group(1).strip() if match else None

    lic_no = find(r'(20\d{2}-DARFO[\w-]+)')
    if not lic_no:
        lic_no = find(r'License\s*Number\s*[:\n]\s*([^\n]+)')

    block_dates = _extract_block_dates(text)
    issue_date = block_dates.get('date_of_issuance') or find(r'(\w+\s+\d{1,2},?\s*\d{4})\s*\n\s*DATE OF ISSUANCE', re.IGNORECASE | re.MULTILINE)
    expiry_date = block_dates.get('date_of_expiration') or find(r'(\w+\s+\d{1,2},?\s*\d{4})\s*\n\s*DATE OF EXPIRATION', re.IGNORECASE | re.MULTILINE)

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
        'date_of_issuance': issue_date,
        'date_of_expiration': expiry_date,
    }


def extract_traders_pass(text):
    text = re.sub(r'\r\n|\r', '\n', text)

    def find(pattern, flags=re.IGNORECASE | re.MULTILINE):
        match = re.search(pattern, text, flags)
        return match.group(1).strip() if match else None

    # TrPASS Code regex: e.g. TrPASS-OPV-QZN-00014-V1 or TrPASS-OPV-QZN-00014
    block = _extract_two_column_doc(text)

    pass_code = block.get('pass_code') or find(r'(TrPASS-OPV-[A-Z]+-[\w\-]+)')
    if not pass_code:
        pass_code = find(r'T[ri]PASS\s*Code\s*[:\n]\s*([^\n]+)')

    # OCR.space often stacks labels in one column and values in another:
    #   TiPASS Code :
    #   Name of Hauler:
    #   ...
    #   TrPASS-OPV-QZN-00014-V1
    #   Darrel Aonuevo
    #   ...
    hauler = block.get('hauler') or find(r'Name of Hauler\s*:\s*([^\n]+)')
    biz_name = block.get('biz') or find(r'Name of Business\s*:\s*([^\n]+)')
    address = block.get('address') or find(r'Business Address\s*:\s*([^\n]+)')
    plate_no = block.get('plate') or find(r'Plate Number\s*:\s*([^\n]+)')
    vehicle_type = block.get('vehicle') or find(r'Type of Vehicle\s*:\s*([^\n]+)')

    issue_date = find(r'Issue Date\s*:\s*(\d{1,2}/\d{1,2}/\d{4}|\w+\s+\d{1,2},?\s*\d{4})')

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


_MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'
_DATE_PATTERN = re.compile(r'\b((?:{months})\s+\d{{1,2}},?\s*\d{{4}})\b'.format(months=_MONTHS), re.IGNORECASE)


def _extract_block_dates(text):
    """Handle stacked date blocks: dates on separate lines, labels below.

    OCR.space reads table docs as a label column then a value column, e.g.:
        October 28, 2025
        October 28, 2026
        DATE OF ISSUANCE
        DATE OF EXPIRATION
    """
    label_hits = [
        (m.start(), m.group(1).upper())
        for m in re.finditer(r'DATE OF (ISSUANCE|EXPIRATION)', text, re.IGNORECASE)
    ]
    if not label_hits:
        return {}
    first_label_pos = label_hits[0][0]
    dates = re.findall(_DATE_PATTERN, text[:first_label_pos])
    out = {}
    for (_, label), date_str in zip(label_hits, dates):
        key = 'date_of_issuance' if label == 'ISSUANCE' else 'date_of_expiration'
        out[key] = date_str.strip()
    return out


def _extract_two_column_doc(text):
    """Parse docs whose OCR text stacks a label column then a value column.

    Matches table-style documents (e.g. Trader's Pass) where OCR.space emits
    all labels first, then all values:
        TiPASS Code :
        Name of Hauler:
        Name of Business:
        Business Address :
        TrPASS-OPV-QZN-00014-V1
        Darrel Aonuevo
        ...
    """
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    first_group = ('TIPASS CODE', 'NAME OF HAULER', 'NAME OF BUSINESS', 'BUSINESS ADDRESS')
    second_group = ('TYPE OF VEHICLE', 'PLATE NUMBER', 'COLOR', 'ORIGIN', 'DESTINATION')

    def label_of(line):
        upper = line.upper()
        for group in (first_group, second_group):
            for lbl in group:
                if upper.startswith(lbl):
                    return lbl
        return None

    g1_ix, g2_ix = [], []
    for i, ln in enumerate(lines):
        lbl = label_of(ln)
        if lbl in first_group:
            g1_ix.append(i)
        elif lbl in second_group:
            g2_ix.append(i)

    def values_between(start, end):
        out = []
        for ln in lines[start:end]:
            upper = ln.upper()
            if re.match(r'TRPASS-OPV-', upper):
                continue
            if upper.startswith(('**', 'VALID ONLY', 'GF FINANCE', 'PGQ-', 'REV.', 'ISSUE DATE')):
                continue
            out.append(ln)
        return out

    vals1 = values_between(max(g1_ix) + 1, min(g2_ix) if g2_ix else len(lines)) if g1_ix else []
    vals2 = values_between(max(g2_ix) + 1, len(lines)) if g2_ix else []

    result = {}
    for idx, key in ((0, 'hauler'), (1, 'biz'), (2, 'address')):
        if idx < len(vals1):
            result[key] = vals1[idx]
    for idx, key in ((0, 'vehicle'), (1, 'plate'), (2, 'color'), (3, 'origin'), (4, 'destination')):
        if idx < len(vals2):
            result[key] = vals2[idx]
    return result


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


_UNIT_WORDS = {
    'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5, 'SIX': 6,
    'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'TEN': 10, 'ELEVEN': 11,
    'TWELVE': 12, 'THIRTEEN': 13, 'FOURTEEN': 14, 'FIFTEEN': 15,
    'SIXTEEN': 16, 'SEVENTEEN': 17, 'EIGHTEEN': 18, 'NINETEEN': 19,
}
_TENS_WORDS = {
    'TWENTY': 20, 'THIRTY': 30, 'FORTY': 40, 'FIFTY': 50,
    'SIXTY': 60, 'SEVENTY': 70, 'EIGHTY': 80, 'NINETY': 90,
}


def _words_to_int(words):
    """Parse an English number like 'TEN' or 'ONE HUNDRED TWENTY-THREE'.

    Returns the integer or None when the phrase is not a number.
    """
    if not words:
        return None
    total = 0
    current = 0
    for token in re.split(r'[\s\-]+', words.strip().upper()):
        if not token:
            continue
        if token in _UNIT_WORDS:
            current += _UNIT_WORDS[token]
        elif token in _TENS_WORDS:
            current += _TENS_WORDS[token]
        elif token == 'HUNDRED':
            current *= 100
        elif token == 'THOUSAND':
            total += (current if current else 1) * 1000
            current = 0
        else:
            return None
    return total + current


def extract_cis(text):
    """Extract filled fields from the standardized barangay CIS document.

    The certificate carries a fixed boilerplate sentence; only the pig count,
    origin, shipment date, destination, and shipper details vary.
    """
    text = re.sub(r'\r\n|\r', '\n', text)

    def find(pattern, flags=re.IGNORECASE | re.MULTILINE):
        match = re.search(pattern, text, flags)
        return match.group(1).strip() if match else None

    # 'TEN (10) of swine'
    count_match = re.search(r'certify that\s+([\w\s\-]+)\(\s*(\d+)\s*\)\s+of swine', text, re.IGNORECASE)
    if count_match:
        number_of_animals_text = count_match.group(1).strip().upper()
        number_of_animals = int(count_match.group(2))
    else:
        # Word-only form, e.g. 'certify that TEN of swine'
        number_of_animals_text = find(r'certify that\s+([A-Z\s\-]+?)\s+of swine')
        number_of_animals_text = (number_of_animals_text or '').upper()
        number_of_animals = _words_to_int(number_of_animals_text)

    from_date_match = re.search(
        r'from\s+(.+?)\s+shipped on\s+(.+?)(?:\n|$)', text, re.IGNORECASE | re.MULTILINE
    )
    if from_date_match:
        origin = from_date_match.group(1).strip()
        shipment_date_raw = from_date_match.group(2).strip()
    else:
        origin = find(r'from\s+([^\n]+)')
        shipment_date_raw = find(r'shipped on\s+([^\n]+)')

    shipment_date = None
    if shipment_date_raw:
        parsed_date = parse_date(shipment_date_raw.strip())
        if parsed_date:
            shipment_date = parsed_date.strftime('%Y-%m-%d')

    destination = find(r'to\s+(.+?)\s+are for immediate slaughter')

    proprietor_name = find(r'([^\n]+)\s*\n\s*PROPRIETOR\s*/\s*SHIPPER')
    business_name = find(r'PROPRIETOR\s*/\s*SHIPPER\s*\n\s*([^\n]+)')

    return {
        'number_of_animals': number_of_animals,
        'number_of_animals_text': number_of_animals_text,
        'origin': origin,
        'shipment_date': shipment_date,
        'destination': destination,
        'proprietor_name': proprietor_name,
        'business_name': business_name,
    }


def validate_cis(extracted, application_origin):
    """Cross-check extracted CIS fields against a TransportOrigin.

    Returns an empty dict when everything matches, otherwise a dict of
    field -> error message.
    """
    errors = {}

    count = extracted.get('number_of_animals')
    if count is None:
        errors['number_of_animals'] = 'Pig count could not be extracted.'
    elif count != application_origin.number_of_pigs:
        errors['number_of_animals'] = (
            f'CIS pig count ({count}) does not match the declared '
            f'{application_origin.number_of_pigs} pigs for this origin.'
        )

    shipment_date = extracted.get('shipment_date')
    transport_date = application_origin.application.transport_date
    if not shipment_date:
        errors['shipment_date'] = 'Shipment date could not be extracted.'
    else:
        try:
            shipped = datetime.strptime(shipment_date, '%Y-%m-%d').date()
        except ValueError:
            errors['shipment_date'] = f'Could not parse shipment date: {shipment_date}.'
        else:
            if abs((shipped - transport_date).days) > 3:
                errors['shipment_date'] = (
                    f'Shipment date ({shipment_date}) is more than 3 days from '
                    f'the transport date ({transport_date}).'
                )

    if not extracted.get('destination'):
        errors['destination'] = 'Destination could not be extracted.'

    if not extracted.get('proprietor_name'):
        errors['proprietor_name'] = 'Proprietor/shipper name could not be extracted.'

    return errors

