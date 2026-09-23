"""Shared scaffolding for LGU memorandum-style PDF reports."""

import os
from io import BytesIO

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

ASSET_DIR = os.path.join(settings.BASE_DIR.parent, "asset")
OFFICIAL_LOGO = os.path.join(ASSET_DIR, "sariaya-official-logo.jpg")
AGRI_LOGO = os.path.join(ASSET_DIR, "sariaya-agri-logo.jpg")

GREEN = colors.HexColor("#166534")
PURPLE = colors.HexColor("#6b21a8")
TEXT_MAIN = colors.HexColor("#1c1917")  # Stone-900
TEXT_MUTED = colors.HexColor("#57534e")  # Stone-600
BORDER_COLOR = colors.HexColor("#d6d3d1")  # Stone-300
ACCENT_BG = colors.HexColor("#fafaf9")  # Stone-50


def format_date_range(start_date, end_date, fmt="%B %d, %Y", sep=" — "):
    """Render a date-range label, collapsing to a single date when both ends match."""
    if start_date == end_date:
        return start_date.strftime(fmt)
    return f"{start_date.strftime(fmt)}{sep}{end_date.strftime(fmt)}"


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.report_title = "Report"
        self.date_range_str = ""
        self.footer_text = ""
        self.primary_color = GREEN

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
            self.setFillColor(TEXT_MAIN)
            self.drawString(1 * cm, height - 1.5 * cm, f"SARIAYA MUNICIPAL AGRICULTURE OFFICE • {self.report_title.upper()}")

            self.setFont("Helvetica", 8)
            self.setFillColor(TEXT_MUTED)
            self.drawRightString(width - 1 * cm, height - 1.5 * cm, f"Period: {self.date_range_str}")

            self.setStrokeColor(self.primary_color)
            self.setLineWidth(0.5)
            self.line(1 * cm, height - 1.8 * cm, width - 1 * cm, height - 1.8 * cm)

        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(1 * cm, 1.8 * cm, width - 1 * cm, 1.8 * cm)

        self.setFont("Helvetica-Oblique", 8)
        self.setFillColor(TEXT_MUTED)
        self.drawString(1 * cm, 1.2 * cm, self.footer_text)

        self.setFont("Helvetica", 8)
        self.setFillColor(TEXT_MUTED)
        self.drawRightString(width - 1 * cm, 1.2 * cm, f"Page {self._pageNumber} of {page_count}")

        self.restoreState()


def make_numbered_canvas(report_title, date_range_str, footer_text, primary_color):
    class CustomNumberedCanvas(NumberedCanvas):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.report_title = report_title
            self.date_range_str = date_range_str
            self.footer_text = footer_text
            self.primary_color = primary_color
    return CustomNumberedCanvas


class OfficialMemorandumPDF:
    """Low-level canvas LGU report: shared letterhead header, title band,
    three-column signatory block, and footer. Builders call draw_header(),
    draw their body sections, then draw_signatories() + finalize()."""

    def __init__(self):
        self.buffer = BytesIO()
        self.p = canvas.Canvas(self.buffer, pagesize=A4)
        self.width, self.height = A4
        self.from_name = "ADMINISTRATIVE STAFF"

    def draw_header(self, title, period_text, primary_color, requesting_user=None):
        """Draws logos, LGU letterhead, report title, and PERIOD line."""
        if requesting_user:
            self.from_name = (
                requesting_user.get_full_name() or requesting_user.username
            ).upper()

        logo_size = 2.0 * cm
        p, width, height = self.p, self.width, self.height

        if os.path.exists(OFFICIAL_LOGO):
            p.drawImage(
                OFFICIAL_LOGO,
                1 * cm,
                height - 2.5 * cm,
                width=logo_size,
                height=logo_size,
                mask="auto",
            )

        if os.path.exists(AGRI_LOGO):
            p.drawImage(
                AGRI_LOGO,
                width - 1 * cm - logo_size,
                height - 2.5 * cm,
                width=logo_size,
                height=logo_size,
                mask="auto",
            )

        p.setFillColor(TEXT_MUTED)
        p.setFont("Helvetica", 9)
        p.drawCentredString(width / 2, height - 1.0 * cm, "Republic of the Philippines")
        p.setFont("Helvetica-Bold", 10)
        p.drawCentredString(width / 2, height - 1.4 * cm, "PROVINCE OF QUEZON")
        p.drawCentredString(width / 2, height - 1.8 * cm, "Municipality of Sariaya")

        p.setFont("Helvetica-Bold", 12)
        p.setFillColor(primary_color)
        p.drawCentredString(width / 2, height - 2.3 * cm, "OFFICE OF THE MUNICIPAL AGRICULTURIST")

        p.setStrokeColor(primary_color)
        p.setLineWidth(1.5)
        p.line(1 * cm, height - 2.6 * cm, width - 1 * cm, height - 2.6 * cm)

        p.setFillColor(TEXT_MAIN)
        p.setFont("Helvetica-Bold", 14)
        p.drawCentredString(width / 2, height - 3.2 * cm, title)
        p.setFont("Helvetica-Bold", 9)
        p.setFillColor(TEXT_MUTED)
        p.drawCentredString(width / 2, height - 3.7 * cm, f"PERIOD: {period_text.upper()}")

    @staticmethod
    def _column(p, x_center, line_left, line_right, sig_y, label, name, role):
        p.setFillColor(TEXT_MAIN)
        p.setFont("Helvetica-Bold", 8)
        p.drawCentredString(x_center, sig_y, label)
        p.line(line_left, sig_y - 1.2 * cm, line_right, sig_y - 1.2 * cm)
        p.setFont("Helvetica-Bold", 8)
        p.drawCentredString(x_center, sig_y - 1.6 * cm, name)
        p.setFont("Helvetica", 7.5)
        p.setFillColor(TEXT_MUTED)
        p.drawCentredString(x_center, sig_y - 2.0 * cm, role)

    def draw_signatories(
        self,
        prepared_by_role,
        certified_label,
        certified_name,
        certified_role,
        third_label,
        third_name,
        third_role,
        sig_y=None,
    ):
        """Three-column signatory block; page-breaks first if no room at sig_y."""
        if sig_y is None:
            sig_y = self.height - 4.0 * cm
        if sig_y < 3.5 * cm:
            self.p.showPage()
            sig_y = self.height - 4.0 * cm

        self._column(
            self.p, 4.0 * cm, 1.5 * cm, 6.5 * cm, sig_y,
            "Prepared By:", self.from_name, prepared_by_role,
        )
        self._column(
            self.p, 10.0 * cm, 7.5 * cm, 12.5 * cm, sig_y,
            certified_label, certified_name, certified_role,
        )
        self._column(
            self.p, 16.0 * cm, 13.5 * cm, 18.5 * cm, sig_y,
            third_label, third_name, third_role,
        )

    def finalize(self, footer_text):
        """Draws the footer, flushes the canvas, and returns the PDF buffer."""
        p = self.p
        p.setFillColor(colors.grey)
        p.setFont("Helvetica-Oblique", 7.5)
        p.drawString(1 * cm, 1 * cm, footer_text)

        p.showPage()
        p.save()
        self.buffer.seek(0)
        return self.buffer