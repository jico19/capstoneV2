import re
from ..normalizers import normalize_text
from ..parsers import words_to_int, parse_date

def extract_cis(text: str) -> dict:
    """Extract filled fields from the standardized barangay CIS document."""
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
        number_of_animals_text = find(r'certify that\s+([A-Z0-9\s\-]+?)\s+of swine')
        number_of_animals_text = (number_of_animals_text or '').upper()
        number_of_animals = words_to_int(number_of_animals_text)
        if number_of_animals is None and number_of_animals_text.isdigit():
            number_of_animals = int(number_of_animals_text)

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
