"""OCR services facade module.

Re-exports text normalisation, parsing, document extractors, and validation
logic from their dedicated modular components to preserve full backward
compatibility with existing consumers (tasks, views, tests).
"""
from .normalizers import normalize_text
from .parsers import parse_date, words_to_int, extract_block_dates
from .extractors import (
    extract_handlers_license,
    extract_transport_carrier,
    extract_traders_pass,
    extract_cis,
    extract_endorsement_cert,
)
from .validators import (
    validate_handlers_license,
    validate_transport_carrier,
    validate_traders_pass,
    validate_cis,
    validate_endorsement_cert,
    check_all_documents_complete,
)

__all__ = [
    'normalize_text',
    'parse_date',
    'words_to_int',
    'extract_block_dates',
    'extract_handlers_license',
    'extract_transport_carrier',
    'extract_traders_pass',
    'extract_cis',
    'extract_endorsement_cert',
    'validate_handlers_license',
    'validate_transport_carrier',
    'validate_traders_pass',
    'validate_cis',
    'validate_endorsement_cert',
    'check_all_documents_complete',
]
