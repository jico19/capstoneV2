from apps.documents.pdf_builder import (
    OfficialMemorandumPDF,
    NumberedCanvas,
    make_numbered_canvas,
    format_date_range,
    OFFICIAL_LOGO,
    AGRI_LOGO,
    GREEN as PDF_GREEN,
    PURPLE as PDF_PURPLE,
    TEXT_MAIN as PDF_TEXT_MAIN,
    TEXT_MUTED as PDF_TEXT_MUTED,
    BORDER_COLOR as PDF_BORDER_COLOR,
    ACCENT_BG as PDF_ACCENT_BG,
)

from apps.documents.services.permit_documents import generate_aic_pdf, generate_permit_pdf
from apps.documents.services.summary_reports import (
    generate_barangay_distribution_pdf,
    generate_collection_report_pdf,
    generate_formal_government_report_pdf,
    generate_inspector_report_pdf,
    generate_permit_issuance_csv,
    generate_permit_issuance_report_pdf,
)