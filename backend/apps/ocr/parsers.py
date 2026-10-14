import re
from datetime import datetime

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

_MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'
_DATE_PATTERN = re.compile(r'\b((?:{months})\s+\d{{1,2}},?\s*\d{{4}})\b'.format(months=_MONTHS), re.IGNORECASE)


def parse_date(date_str: str | None) -> datetime | None:
    """Parse common date formats found on Philippine government documents.

    Handles: 'October 28, 2025', 'Oct 28 2025', '28 Oct 2025',
             '10/28/2025', '2025-10-28', 'FEB 02, 2024', 'Feb. 2, 2024'
    """
    if not date_str:
        return None

    s = re.sub(r'\s+', ' ', str(date_str).strip())
    s = re.sub(r'([A-Za-z]{3})\.', r'\1', s)

    formats = [
        '%B %d, %Y',
        '%B %d %Y',
        '%b %d, %Y',
        '%b %d %Y',
        '%d %b %Y',
        '%d %B %Y',
        '%m/%d/%Y',
        '%d/%m/%Y',
        '%Y-%m-%d',
        '%d-%m-%Y',
        '%B %d,%Y',
        '%b %d,%Y',
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except (ValueError, AttributeError):
            continue
    return None


def words_to_int(words: str | None) -> int | None:
    """Parse an English number like 'TEN' or 'ONE HUNDRED TWENTY-THREE'.

    Returns the integer or None when the phrase is not a valid number.
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


def extract_block_dates(text: str) -> dict[str, str]:
    """Handle stacked date blocks where dates are on separate lines with labels below."""
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
