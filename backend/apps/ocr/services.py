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


# ---------------------------------------------------------------------------
# Text normalisation
# ---------------------------------------------------------------------------

def normalize_text(text: str) -> str:
    """Clean raw OCR output before regex extraction.

    Fixes the most common OCR.space Engine 2 artefacts on Philippine
    government documents:
      - CRLF → LF
      - Unicode 'smart' quotes/dashes → ASCII equivalents
      - Multiple blank lines collapsed to one
      - Stray pipe characters that OCR reads as 'I' or '|'
      - Digit/letter swaps ONLY inside known numeric contexts
        (registration numbers, plate numbers)
    """
    # Normalise line endings
    text = re.sub(r'\r\n|\r', '\n', text)

    # Smart quotes / dashes → plain ASCII
    text = text.replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u201c', '"').replace('\u201d', '"')
    text = text.replace('\u2013', '-').replace('\u2014', '-')

    # Collapse runs of 3+ blank lines → single blank line
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Fix OCR reading letter 'O' inside the 4-digit year prefix of DARFO reg numbers:
    # e.g. "2O25-DARFO..." → "2025-DARFO..." (only replace O in the year prefix, preserving DARFO)
    def _fix_darfo_year(match):
        year = match.group(1).replace('O', '0').replace('o', '0')
        rest = match.group(2)
        return f"{year}{rest}"

    text = re.sub(
        r'\b(2[O0o]\d{2})([\s\-]?DARFO)',
        _fix_darfo_year,
        text,
        flags=re.IGNORECASE,
    )

    # TrPASS code: fix common misreads  TiPASS / TfPASS / TrPABS → TrPASS
    text = re.sub(r'\bT[rif]PASS\b', 'TrPASS', text)

    # Strip stray form-feed characters PDF → text conversions leave
    text = text.replace('\x0c', '\n')

    return text


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
    text = normalize_text(text)

    def find(pattern, flags=re.IGNORECASE | re.MULTILINE):
        match = re.search(pattern, text, flags)
        return match.group(1).strip() if match else None

    # Primary: e.g. "2025-DARFO-IV-A-003971" or "2025-DARFO4A-HH-000123"
    reg_no = find(r'(20\d{2}[\s\-]?DARFO[\w\-]+)')
    if not reg_no:
        reg_match = find(r'Registration\s*(?:No\.?|Number)\s*[:\n]\s*([^\n]+)')
        if reg_match and not re.search(r'CERTIFICATE|REGISTRATION|LIVESTOCK', reg_match, re.IGNORECASE):
            reg_no = reg_match

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
    text = normalize_text(text)

    def find(pattern, flags=re.IGNORECASE | re.MULTILINE):
        match = re.search(pattern, text, flags)
        return match.group(1).strip() if match else None

    # Primary: e.g. "2025-DARFO-IV-A-012243" or "2025-DARFO4A-HH-000123"
    lic_no = find(r'(20\d{2}[\s\-]?DARFO[\w\-]+)')
    if not lic_no:
        lic_match = find(r'License\s*(?:No\.?|Number)\s*[:\n]\s*([^\n]+)')
        if lic_match and not re.search(r'LICENSE|OPERATE|LIVESTOCK|TRANSPORT', lic_match, re.IGNORECASE):
            lic_no = lic_match

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
    text = normalize_text(text)

    def find(pattern, flags=re.IGNORECASE | re.MULTILINE):
        match = re.search(pattern, text, flags)
        return match.group(1).strip() if match else None

    block = _extract_two_column_doc(text)

    pass_code = block.get('pass_code') or find(r'(TrPASS-OPV-[A-Z]+-[\w\-]+)')
    if not pass_code:
        pass_code = find(r'TrPASS\s*Code\s*[:\n]\s*([^\n]+)')

    hauler = block.get('hauler') or find(r'Name of Hauler\s*:\s*([^\n]+)')
    biz_name = block.get('biz') or find(r'Name of Business\s*:\s*([^\n]+)')
    address = block.get('address') or find(r'Business Address\s*:\s*([^\n]+)')
    plate_no = block.get('plate') or find(r'Plate\s*(?:No\.?|Number)\s*:\s*([^\n]+)')
    vehicle_type = block.get('vehicle') or find(r'Type of Vehicle\s*:\s*([^\n]+)')

    issue_date = find(r'Issue\s*Date\s*:\s*(\d{1,2}/\d{1,2}/\d{4}|\w+\s+\d{1,2},?\s*\d{4})')

    # Trader's Pass carries an Issue Date without an expiration date.
    # Only extract date_of_expiration if explicitly printed on the document.
    expiry_match = find(r'(?:Date of Expiration|Expiration Date|Valid Until)\s*:\s*(\d{1,2}/\d{1,2}/\d{4}|\w+\s+\d{1,2},?\s*\d{4})')
    expiration_date_str = None
    if expiry_match:
        parsed_exp = parse_date(expiry_match)
        if parsed_exp:
            expiration_date_str = parsed_exp.strftime('%Y-%m-%d')

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
    """Parse common date formats found on Philippine government documents.

    Handles: 'October 28, 2025', 'Oct 28 2025', '28 Oct 2025',
             '10/28/2025', '2025-10-28', 'FEB 02, 2024', 'Feb. 2, 2024'
    """
    if not date_str:
        return None
    # Normalise: collapse multiple spaces, strip trailing periods on month abbrevs
    s = re.sub(r'\s+', ' ', date_str.strip())
    s = re.sub(r'([A-Za-z]{3})\.', r'\1', s)  # "Feb." → "Feb"

    formats = [
        '%B %d, %Y',   # October 28, 2025
        '%B %d %Y',    # October 28 2025  (no comma)
        '%b %d, %Y',   # Oct 28, 2025
        '%b %d %Y',    # Oct 28 2025
        '%d %b %Y',    # 28 Oct 2025
        '%d %B %Y',    # 28 October 2025
        '%m/%d/%Y',    # 10/28/2025
        '%d/%m/%Y',    # 28/10/2025
        '%Y-%m-%d',    # 2025-10-28
        '%d-%m-%Y',    # 28-10-2025
        '%B %d,%Y',    # October 28,2025 (no space after comma)
        '%b %d,%Y',    # Oct 28,2025
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
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

    Matches table-style documents (e.g. Trader's Pass) where OCR engines emit
    all labels first, then all values:
        TrPASS Code :
        Name of Hauler:
        Name of Business:
        Business Address :
        Type of Vehicle :
        Plate Number :
        Color :
        Origin :
        Destination :
        TrPASS-OPV-QZN-00014-V1
        Darrel Añonuevo
        ...
    """
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    all_labels = [
        'TRPASS CODE', 'TIPASS CODE', 'NAME OF HAULER', 'NAME OF BUSINESS', 'BUSINESS ADDRESS',
        'TYPE OF VEHICLE', 'PLATE NUMBER', 'COLOR', 'CALOR', 'ORIGIN', 'DESTINATION'
    ]

    def is_label(line):
        upper = line.upper()
        return any(upper.startswith(lbl) for lbl in all_labels)

    label_indices = [i for i, ln in enumerate(lines) if is_label(ln)]
    if not label_indices:
        return {}

    last_label_idx = max(label_indices)
    vals = []
    for ln in lines[last_label_idx + 1:]:
        upper = ln.upper()
        if upper.startswith(('**', 'VALID ONLY', 'GF FINANCE', 'PGQ-', 'REV.', 'ISSUE DATE', 'EAGONE')):
            continue
        if re.search(r'qprovet@|FB Page:|\(042\)\s*\d', ln, re.IGNORECASE):
            continue
        vals.append(ln)

    pass_code = None
    if vals and re.match(r'TrPASS-OPV-', vals[0], re.IGNORECASE):
        pass_code = vals.pop(0)

    return {
        'pass_code': pass_code,
        'hauler': vals[0] if len(vals) > 0 else None,
        'biz': vals[1] if len(vals) > 1 else None,
        'address': vals[2] if len(vals) > 2 else None,
        'vehicle': vals[3] if len(vals) > 3 else None,
        'plate': vals[4] if len(vals) > 4 else None,
        'color': vals[5] if len(vals) > 5 else None,
        'origin': vals[6] if len(vals) > 6 else None,
        'destination': vals[7] if len(vals) > 7 else None,
    }


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

    # Fields that must be present to pass automated validation
    required_fields = [
        'license_number', 'name_of_applicant', 'business_name', 'address',
        'plate_no', 'maker_brand', 'body_type',
        'date_of_issuance', 'date_of_expiration',
    ]
    # motor_vehicle_no and temporary_conduction_sticker are often blank on
    # real docs — flag as warnings in remarks but don't block PASSED status
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
        # Accepts: AAA 1234 (new format), ABC 123 (old), motorcycle (1-2L + 4D)
        valid_plate = re.match(r'^[A-Z]{1,4}[\s\-]?\d{3,4}[A-Z]?$', plate)
        if not valid_plate:
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
    text = normalize_text(text)

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


def extract_endorsement_cert(text):
    """Extract fields from Barangay Endorsement Certificate (Pagpapatunay / Endorsement)."""
    text = normalize_text(text)

    def find(pattern, flags=re.IGNORECASE | re.MULTILINE):
        match = re.search(pattern, text, flags)
        return match.group(1).strip() if match else None

    # Barangay Name (e.g. 'BRGY. JANAGDONG 1' or 'Barangay JANAGDONG 1')
    brgy = (
        find(r'BRGY\.?\s*([A-Za-z0-9\s]+?)(?:\n|SARIAYA|,|\bQUEZON\b)') or
        find(r'Barangay\s+([A-Za-z0-9\s]+?)(?:,|\n|Sariaya)')
    )
    if brgy:
        brgy = re.sub(r'\s+', ' ', brgy).strip()

    # Hauler / Trader name
    hauler = (
        find(r'endorse to your good office\s+([A-Z\s\.\-]+?)\s+with business', re.IGNORECASE) or
        find(r'pagpapatunay na si\s+([A-Z\s\.\-]+?)\s+may sapat', re.IGNORECASE) or
        find(r'kahilingan ni\s+([A-Z\s\.\-]+?)\s+ngayong', re.IGNORECASE)
    )

    # Official Name (Punong Barangay / Barangay Chairman / Pupong Barangay)
    official = find(
        r'([^\n]+)\s*\n\s*(?:Barangay Chairman|Punong Barangay|Pupong Barangay|P[unp]ong\s*Barangay)',
        re.IGNORECASE,
    )

    # Swine raiser and pig count
    raiser = None
    count = None

    # Style A: Alternating PANGALAN -> Name, BILANG -> Count
    pangalan_m = re.search(r'PANGALAN\s*\n\s*([^\n]+)', text, re.IGNORECASE)
    if pangalan_m and not re.search(r'BILANG|SITIO|BARANGAY', pangalan_m.group(1), re.IGNORECASE):
        raiser = pangalan_m.group(1).strip()
        bilang_m = re.search(r'BILANG\s*\n\s*(\d+)', text, re.IGNORECASE)
        if bilang_m:
            count = int(bilang_m.group(1))

    # Style B: Stacked headers (Enumerated below ... probinsya ... Raiser ... Count)
    if not raiser or count is None:
        m_prob = re.search(
            r'\([^\)]*probinsya[^\)]*\)\s*\n\s*([A-Z\s\.\-]+?)\s*\n\s*([^\n]+)\s*\n\s*(\d+)',
            text,
            re.IGNORECASE,
        )
        if m_prob:
            raiser = m_prob.group(1).strip()
            count = int(m_prob.group(3))

    if not raiser or count is None:
        m_col = re.search(
            r'Name of Swine Raiser\s*\n\s*(?:Sitio/?\s*\n\s*Barangay\s*\n\s*)?([A-Z\s\.\-]+?)\s*\n\s*(?:[A-Za-z0-9\s]+\n)?(?:No\.?|Heads?)',
            text,
            re.IGNORECASE,
        )
        if m_col:
            raiser = m_col.group(1).strip()

    if count is None:
        cnt_m = re.search(
            r'(?:No\.?\s*\n\s*of\s*\n\s*Hea\s*\n\s*ds|BILANG|Heads?\s*Hauled|No\.\s*of\s*Heads?)[\s\S]*?\b(\d{1,4})\b',
            text,
            re.IGNORECASE,
        )
        if cnt_m:
            count = int(cnt_m.group(1))

    if not raiser:
        r_m = re.search(
            r'(?:Name of Swine Raiser|PANGALAN)[\s\S]*?\n([A-Z\s\.\-]{3,40})\n',
            text,
            re.IGNORECASE,
        )
        if r_m:
            candidate = r_m.group(1).strip()
            if not re.search(r'Sitio|Barangay|Bilang|Company|Address|Destination|Enumerated', candidate, re.IGNORECASE):
                raiser = candidate

    return {
        'barangay': brgy,
        'raiser_name': raiser,
        'number_of_animals': count,
        'hauler_name': hauler,
        'official_name': official,
    }


def validate_endorsement_cert(extracted, application_origin):
    """Cross-check extracted Endorsement Certificate fields against a TransportOrigin.

    Returns an empty dict when everything matches, otherwise a dict of
    field -> error message.
    """
    errors = {}

    count = extracted.get('number_of_animals')
    if count is None:
        errors['number_of_animals'] = 'Pig count could not be extracted from endorsement certificate.'
    elif count != application_origin.number_of_pigs:
        errors['number_of_animals'] = (
            f'Endorsement pig count ({count}) does not match the declared '
            f'{application_origin.number_of_pigs} pigs for this origin.'
        )

    extracted_brgy = extracted.get('barangay')
    if not extracted_brgy:
        errors['barangay'] = 'Barangay could not be extracted from endorsement certificate.'
    else:
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


