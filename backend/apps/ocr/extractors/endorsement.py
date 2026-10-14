import re
from ..normalizers import normalize_text

def extract_endorsement_cert(text: str) -> dict:
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
