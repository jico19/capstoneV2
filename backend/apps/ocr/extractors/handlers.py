import re
from ..normalizers import normalize_text
from ..parsers import extract_block_dates

def extract_handlers_license(text: str) -> dict:
    """Extract fields from Livestock Handler's Certificate of Registration."""
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

    block_dates = extract_block_dates(text)
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
