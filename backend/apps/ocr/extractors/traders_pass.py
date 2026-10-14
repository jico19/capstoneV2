import re
from ..normalizers import normalize_text

def _extract_two_column_doc(text: str) -> dict:
    """Parse docs whose OCR text stacks a label column then a value column."""
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


def extract_traders_pass(text: str) -> dict:
    """Extract fields from Trader's Pass (TrPASS)."""
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

    return {
        'license_number': pass_code,
        'name_of_applicant': hauler,
        'business_name': biz_name,
        'address': address,
        'plate_no': plate_no,
        'vehicle_type': vehicle_type,
        'date_of_issuance': issue_date,
    }
