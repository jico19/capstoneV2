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