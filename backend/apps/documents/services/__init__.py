import csv
import logging
import os
from datetime import timedelta
from io import BytesIO, StringIO

import qrcode
from django.conf import settings
from django.core.files import File
from django.db import transaction
from django.db.models import Count, Sum
from django.tasks import task
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from apps.documents.pdf_builder import OfficialMemorandumPDF
from apps.documents.pdf_builder import (
    GREEN as PDF_GREEN,
    PURPLE as PDF_PURPLE,
    TEXT_MAIN as PDF_TEXT_MAIN,
    TEXT_MUTED as PDF_TEXT_MUTED,
    BORDER_COLOR as PDF_BORDER_COLOR,
    ACCENT_BG as PDF_ACCENT_BG,
)

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.report_title = "Report"
        self.report_subtitle = ""
        self.date_range_str = ""
        self.footer_text = ""
        self.primary_color = colors.HexColor("#166534")

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_elements(num_pages)
            super().showPage()
        super().save()

    def draw_page_elements(self, page_count):
        self.saveState()
        width, height = self._pagesize
        
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#1c1917"))
            self.drawString(1 * cm, height - 1.5 * cm, f"SARIAYA MUNICIPAL AGRICULTURE OFFICE • {self.report_title.upper()}")
            
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#57534e"))
            self.drawRightString(width - 1 * cm, height - 1.5 * cm, f"Period: {self.date_range_str}")
            
            self.setStrokeColor(colors.HexColor("#e7e5e4"))
            self.setLineWidth(0.5)
            self.line(1 * cm, height - 1.8 * cm, width - 1 * cm, height - 1.8 * cm)
            
        self.setStrokeColor(colors.HexColor("#e7e5e4"))
        self.setLineWidth(0.5)
        self.line(1 * cm, 1.8 * cm, width - 1 * cm, 1.8 * cm)
        
        self.setFont("Helvetica-Oblique", 8)
        self.setFillColor(colors.HexColor("#78716c"))
        self.drawString(1 * cm, 1.2 * cm, self.footer_text)
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#78716c"))
        self.drawRightString(width - 1 * cm, 1.2 * cm, f"Page {self._pageNumber} of {page_count}")
        
        self.restoreState()


def make_numbered_canvas(report_title, report_subtitle, date_range_str, footer_text, primary_color):
    class CustomNumberedCanvas(NumberedCanvas):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.report_title = report_title
            self.report_subtitle = report_subtitle
            self.date_range_str = date_range_str
            self.footer_text = footer_text
            self.primary_color = primary_color
    return CustomNumberedCanvas

from apps.inspector.models import InspectorLogs
from apps.payment.models import PaymentHistory
from apps.permits.models import (
    IssuedPermit,
    PermitApplication,
    TransportOrigin,
    SubmittedDocument,
    OCRValidationResult,
    MunicipalConfig,
)

logger = logging.getLogger(__name__)

from apps.documents.services.permit_documents import generate_aic_pdf, generate_permit_pdf
from apps.documents.services.summary_reports import (
    generate_barangay_distribution_pdf,
    generate_collection_report_pdf,
    generate_formal_government_report_pdf,
    generate_inspector_report_pdf,
    generate_permit_issuance_csv,
    generate_permit_issuance_report_pdf,
)
