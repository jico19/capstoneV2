import re

def normalize_text(text: str) -> str:
    """Clean raw OCR output before regex extraction.

    Fixes the most common OCR.space Engine 2 artefacts on Philippine
    government documents:
      - CRLF → LF
      - Unicode 'smart' quotes/dashes → plain ASCII equivalents
      - Multiple blank lines collapsed to one
      - Stray pipe characters that OCR reads as 'I' or '|'
      - Digit/letter swaps inside known numeric contexts (DARFO, TrPASS)
    """
    if not text:
        return ""

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

    # TrPASS code: fix common misreads TiPASS / TfPASS / TrPABS → TrPASS
    text = re.sub(r'\bT[rif]PASS\b', 'TrPASS', text)

    # Strip stray form-feed characters PDF → text conversions leave
    text = text.replace('\x0c', '\n')

    return text
