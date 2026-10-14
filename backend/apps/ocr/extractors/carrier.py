import re
from ..normalizers import normalize_text
from ..parsers import extract_block_dates

def extract_transport_carrier(text: str) -> dict:
    """Extract fields from Livestock Transport Carrier License."""
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

    block_dates = extract_block_dates(text)
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
