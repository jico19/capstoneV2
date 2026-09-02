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


@task()
def generate_permit_pdf(permit_application_id, current_attempt=1):
    """
    Background task to generate a professional PDF permit.
    Aligns with the current PermitApplication model structure.
    """
    try:
        with transaction.atomic():
            # Select related and prefetch origins for efficiency
            application = (
                PermitApplication.objects.select_related("farmer", "issued_permit")
                .prefetch_related("origins__barangay")
                .get(pk=permit_application_id)
            )
            issued_permit = application.issued_permit

            # Aggregate data from origins
            origins = application.origins.all()
            total_pigs = sum(o.number_of_pigs for o in origins)
            origin_barangays = ", ".join(o.barangay.name for o in origins)

            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4

            # --- Branding & Design Constants ---
            PRIMARY_GREEN = colors.HexColor("#166534")  # Professional Green
            TEXT_MAIN = colors.HexColor("#1c1917")  # Stone-900
            TEXT_MUTED = colors.HexColor("#57534e")  # Stone-600
            BORDER_COLOR = colors.HexColor("#e7e5e4")  # Stone-200
            ACCENT_BG = colors.HexColor("#f5f5f4")  # Stone-100

            # Resolve the assets path relative to the backend project root (one level up from BASE_DIR)
            ASSET_DIR = os.path.join(settings.BASE_DIR.parent, "asset")
            OFFICIAL_LOGO = os.path.join(ASSET_DIR, "sariaya-official-logo.jpg")
            AGRI_LOGO = os.path.join(ASSET_DIR, "sariaya-agri-logo.jpg")

            p.setFillColor(colors.white)
            p.rect(0, 0, width, height, fill=True, stroke=False)

            # Subtle accent on the left
            p.setFillColor(PRIMARY_GREEN)
            p.rect(0, 0, 0.5 * cm, height, fill=True, stroke=False)

            logo_size = 2.2 * cm
            if os.path.exists(OFFICIAL_LOGO):
                p.drawImage(
                    OFFICIAL_LOGO,
                    1.5 * cm,
                    height - 2.8 * cm,
                    width=logo_size,
                    height=logo_size,
                    mask="auto",
                )

            if os.path.exists(AGRI_LOGO):
                p.drawImage(
                    AGRI_LOGO,
                    width - 1.5 * cm - logo_size,
                    height - 2.8 * cm,
                    width=logo_size,
                    height=logo_size,
                    mask="auto",
                )

            p.setFillColor(TEXT_MAIN)
            p.setFont("Helvetica-Bold", 20)
            p.drawCentredString(
                width / 2, height - 1.2 * cm, "LIVESTOCK TRANSPORT PERMIT"
            )

            p.setFont("Helvetica", 10)
            p.setFillColor(TEXT_MUTED)
            p.drawCentredString(
                width / 2, height - 1.8 * cm, "OFFICE OF THE MUNICIPAL AGRICULTURIST"
            )
            p.drawCentredString(
                width / 2, height - 2.3 * cm, "SARIAYA, QUEZON PROVINCE, PHILIPPINES"
            )

            # Reference Number Badge
            badge_width = 6.5 * cm
            badge_x = width - badge_width - 1.5 * cm  # 1.5cm margin from right edge
            badge_y = height - 4.8 * cm

            p.setFillColor(ACCENT_BG)
            p.rect(badge_x, badge_y, badge_width, 1.5 * cm, fill=True, stroke=False)

            p.setFillColor(TEXT_MAIN)
            p.setFont("Helvetica-Bold", 8)
            p.drawString(badge_x + 0.3 * cm, badge_y + 1.1 * cm, "PERMIT NUMBER")
            p.setFont("Helvetica-Bold", 13)  # Slightly smaller so long IDs fit
            p.drawString(
                badge_x + 0.3 * cm, badge_y + 0.4 * cm, issued_permit.permit_number
            )

            def draw_info_row(x, y, label, value, w=8 * cm, h=1.4 * cm):
                # Box
                p.setStrokeColor(BORDER_COLOR)
                p.setLineWidth(0.5)
                p.rect(x, y, w, h, fill=False, stroke=True)
                # Label
                p.setFillColor(TEXT_MUTED)
                p.setFont("Helvetica-Bold", 7)
                p.drawString(x + 0.3 * cm, y + h - 0.4 * cm, label.upper())
                # Value
                p.setFillColor(TEXT_MAIN)
                p.setFont("Helvetica-Bold", 11)
                p.drawString(x + 0.3 * cm, y + 0.3 * cm, str(value))

            # Row 1: Farmer & Application ID
            draw_info_row(
                1.5 * cm,
                height - 7.5 * cm,
                "Registered Farmer",
                (
                    application.farmer.get_full_name() or application.farmer.username
                ).upper(),
                w=11 * cm,
            )
            draw_info_row(
                13 * cm,
                height - 7.5 * cm,
                "System ID",
                application.application_id,
                w=6.5 * cm,
            )

            # Row 2: Origins & Destination
            draw_info_row(
                1.5 * cm,
                height - 9.2 * cm,
                "Origin Barangay(s)",
                origin_barangays,
                w=11 * cm,
            )
            draw_info_row(
                13 * cm,
                height - 9.2 * cm,
                "Destination",
                application.destination,
                w=6.5 * cm,
            )

            # Row 3: Livestock Count & Dates
            draw_info_row(
                1.5 * cm,
                height - 10.9 * cm,
                "Total Quantity (Swine)",
                f"{total_pigs} PIGS",
                w=6 * cm,
            )
            draw_info_row(
                8 * cm,
                height - 10.9 * cm,
                "Transport Date",
                application.transport_date.strftime("%B %d, %Y"),
                w=5.5 * cm,
            )
            draw_info_row(
                14 * cm,
                height - 10.9 * cm,
                "Valid Until",
                issued_permit.valid_until.strftime("%B %d, %Y"),
                w=5.5 * cm,
            )

            # Row 4: Purpose
            draw_info_row(
                1.5 * cm,
                height - 12.6 * cm,
                "Authorized Purpose",
                application.purpose or "LIVESTOCK TRADE/TRANSPORT",
                w=18 * cm,
            )

            p.setFillColor(ACCENT_BG)
            p.rect(1.5 * cm, 3.5 * cm, 18 * cm, 6 * cm, fill=True, stroke=True)
            p.setStrokeColor(BORDER_COLOR)

            qr_url = (
                f"{settings.FRONTEND_URL}/inspector/verify/{issued_permit.qr_token}"
            )
            qr = qrcode.QRCode(version=1, box_size=10, border=1)
            qr.add_data(qr_url)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            qr_buffer = BytesIO()
            qr_img.save(qr_buffer, format="PNG")
            qr_buffer.seek(0)

            p.drawImage(
                ImageReader(qr_buffer), 2 * cm, 4 * cm, width=5 * cm, height=5 * cm
            )

            p.setFillColor(TEXT_MAIN)
            p.setFont("Helvetica-Bold", 12)
            p.drawString(7.5 * cm, 7.5 * cm, "SECURE DIGITAL VERIFICATION")
            p.setFont("Helvetica", 10)
            p.setFillColor(TEXT_MUTED)
            p.drawString(
                7.5 * cm,
                6.8 * cm,
                "This permit is equipped with a unique QR code for field verification.",
            )
            p.drawString(
                7.5 * cm,
                6.3 * cm,
                "Inspectors may scan this code using the FarmPass Official App.",
            )
            p.drawString(
                7.5 * cm,
                5.8 * cm,
                "Validation confirms authenticity and real-time status of the permit.",
            )

            p.setFillColor(TEXT_MAIN)
            p.setFont("Helvetica-Bold", 10)
            p.drawString(1.5 * cm, 2 * cm, "ISSUED BY:")
            p.line(1.5 * cm, 1.2 * cm, 8 * cm, 1.2 * cm)
            p.setFont("Helvetica", 8)
            p.drawString(1.5 * cm, 0.8 * cm, "MUNICIPAL AGRICULTURE OFFICE")
            p.drawString(
                1.5 * cm,
                0.4 * cm,
                f"Date Issued: {issued_permit.date_issued.strftime('%B %d, %Y')}",
            )

            p.setFillColor(TEXT_MUTED)
            p.setFont("Helvetica-Oblique", 7)
            p.drawRightString(
                width - 1.5 * cm,
                0.4 * cm,
                f"Verification Token: {issued_permit.qr_token[:16]}...",
            )
            p.drawRightString(
                width - 1.5 * cm,
                0.8 * cm,
                "This is a computer-generated document. Unauthorized alteration is a criminal offense.",
            )

            p.showPage()
            p.save()

            buffer.seek(0)
            filename = f"PERMIT_{issued_permit.permit_number}.pdf"

            application.is_issued = True
            application.issued_at = timezone.now()
            application.save()

            issued_permit.permit_pdf.save(filename, File(buffer), save=True)
            logger.info(
                f"Successfully generated redesigned PDF for application {permit_application_id}"
            )

            return f"PDF Generated: {filename}"

    except PermitApplication.DoesNotExist:
        logger.error(f"PermitApplication {permit_application_id} not found.")
    except Exception as e:
        if current_attempt < 3:
            wait_time = 10 * current_attempt
            logger.warning(
                f"Failed to generate PDF for {permit_application_id}. "
                f"Retrying in {wait_time}s... (Attempt {current_attempt})"
            )
            generate_permit_pdf.using(run_after=timedelta(seconds=wait_time)).enqueue(
                permit_application_id, current_attempt=current_attempt + 1
            )
        else:
            logger.error(
                f"Max attempts reached for PDF generation on application {permit_application_id}: {str(e)}"
            )
            raise e


@task()
def generate_aic_pdf(permit_application_id, current_attempt=1):
    """
    Background task to generate a professional PDF Animal Inspection Certificate (AIC).
    Populates fields from OCR-extracted Handler's License and Transport Carrier Accreditation.
    """
    try:
        with transaction.atomic():
            application = (
                PermitApplication.objects.select_related("farmer", "issued_permit")
                .prefetch_related("origins__barangay")
                .get(pk=permit_application_id)
            )
            issued_permit = application.issued_permit
            
            # 1. Fetch config or use defaults
            config = MunicipalConfig.objects.first()
            oic_name = config.oic_name if config and config.oic_name else "AMALITA C. AMORES"
            oic_title = config.oic_title if config and config.oic_title else "OIC - Municipal Agriculturist"
            
            # 2. Get OCR documents data
            handlers_license_doc = SubmittedDocument.objects.filter(
                origin__application=application,
                document_type='handlers_license'
            ).first()

            transport_carrier_doc = SubmittedDocument.objects.filter(
                origin__application=application,
                document_type='transport_carrier_reg'
            ).first()

            handlers_data = {}
            if handlers_license_doc and hasattr(handlers_license_doc, 'ocr'):
                ocr = handlers_license_doc.ocr
                handlers_data = {**(ocr.extracted_field or {}), **(ocr.overridden_fields or {})}

            carrier_data = {}
            if transport_carrier_doc and hasattr(transport_carrier_doc, 'ocr'):
                ocr = transport_carrier_doc.ocr
                carrier_data = {**(ocr.extracted_field or {}), **(ocr.overridden_fields or {})}

            # 3. Aggregate origins data
            origins = application.origins.all()
            total_pigs = sum(o.number_of_pigs for o in origins)
            
            # Classifications
            is_breeder = any(o.inahin > 0 or o.barako > 0 for o in origins)
            is_grower = any(o.grower > 0 for o in origins)
            is_slaughter = any(o.fattener > 0 for o in origins)
            
            class_str = []
            if is_breeder: class_str.append("Breeder")
            if is_grower: class_str.append("Grower")
            if is_slaughter: class_str.append("Slaughter Animal")
            if not class_str: class_str.append("Slaughter Animal")
            
            # Gather shipper name/address
            shipper_name = (
                handlers_data.get('name_of_applicant') or 
                carrier_data.get('name_of_applicant') or 
                application.farmer.get_full_name() or 
                application.farmer.username
            ).upper()
            
            shipper_address = (
                handlers_data.get('address') or 
                carrier_data.get('address') or 
                "SARIAYA, QUEZON"
            ).upper()

            # Gather license details
            handlers_lic = handlers_data.get('registration_number') or handlers_data.get('license_number') or "N/A"
            handlers_expiry = handlers_data.get('date_of_expiration') or "N/A"
            
            carrier_acc = carrier_data.get('license_number') or carrier_data.get('registration_number') or "N/A"
            carrier_expiry = carrier_data.get('date_of_expiration') or "N/A"
            
            plate_number = carrier_data.get('plate_no') or "N/A"
            cp_number = application.farmer.phone_no or handlers_data.get('cp_no') or "N/A"
            
            origin_barangays = ", ".join(o.barangay.name for o in origins).upper()
            destination = application.destination.upper()
            company_address = carrier_data.get('address') or "N/A"
            
            # Or number and date
            or_num = "N/A"
            if hasattr(issued_permit, 'payment_history') and issued_permit.payment_history.or_number:
                or_num = issued_permit.payment_history.or_number
                
            # Processed by
            processed_by = (
                issued_permit.issued_by.get_full_name() or 
                issued_permit.issued_by.username if issued_permit.issued_by else "SYSTEM STAFF"
            ).upper()

            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4

            # --- Layout & Styling ---
            PRIMARY_GREEN = colors.HexColor("#166534")  # Professional Green
            TEXT_MAIN = colors.HexColor("#1c1917")  # Stone-900
            TEXT_MUTED = colors.HexColor("#57534e")  # Stone-600
            BORDER_COLOR = colors.HexColor("#a8a29e")  # Stone-400
            ACCENT_BG = colors.HexColor("#fafaf9")  # Stone-50

            ASSET_DIR = os.path.join(settings.BASE_DIR.parent, "asset")
            OFFICIAL_LOGO = os.path.join(ASSET_DIR, "sariaya-official-logo.jpg")
            AGRI_LOGO = os.path.join(ASSET_DIR, "sariaya-agri-logo.jpg")

            # 1. Outer Border
            p.setFillColor(colors.white)
            p.rect(0, 0, width, height, fill=True, stroke=False)
            p.setStrokeColor(BORDER_COLOR)
            p.setLineWidth(1)
            p.rect(1.0 * cm, 1.0 * cm, width - 2.0 * cm, height - 2.0 * cm, fill=False, stroke=True)

            # 2. Header Logos & Text
            logo_size = 2.2 * cm
            if os.path.exists(OFFICIAL_LOGO):
                p.drawImage(OFFICIAL_LOGO, 1.5 * cm, height - 3.8 * cm, width=logo_size, height=logo_size, mask="auto")
            if os.path.exists(AGRI_LOGO):
                p.drawImage(AGRI_LOGO, width - 1.5 * cm - logo_size, height - 3.8 * cm, width=logo_size, height=logo_size, mask="auto")

            p.setFillColor(TEXT_MUTED)
            p.setFont("Helvetica", 9.5)
            p.drawCentredString(width / 2, height - 1.5 * cm, "Republic of the Philippines")
            p.drawCentredString(width / 2, height - 2.0 * cm, "Region IV-A (CALABARZON)")
            p.drawCentredString(width / 2, height - 2.5 * cm, "Province of Quezon")
            p.setFont("Helvetica-Bold", 11)
            p.setFillColor(TEXT_MAIN)
            p.drawCentredString(width / 2, height - 3.0 * cm, "MUNICIPALITY OF SARIAYA")

            p.setStrokeColor(PRIMARY_GREEN)
            p.setLineWidth(1.5)
            p.line(1.5 * cm, height - 3.8 * cm, width - 1.5 * cm, height - 3.8 * cm)

            # Title
            p.setFont("Helvetica-Bold", 12)
            p.setFillColor(TEXT_MUTED)
            p.drawCentredString(width / 2, height - 4.4 * cm, "OFFICE OF THE MUNICIPAL AGRICULTURIST")
            p.setFont("Helvetica-Bold", 16)
            p.setFillColor(PRIMARY_GREEN)
            p.drawCentredString(width / 2, height - 5.1 * cm, "ANIMAL INSPECTION CERTIFICATE")

            # 3. Certification Body Text
            p.setFillColor(TEXT_MAIN)
            p.setFont("Helvetica", 9.5)
            body_text = (
                "This is to certify that the following animals described below were found to be apparently healthy "
                "at the time of inspection. Furthermore, the animals are from areas where there are no reported "
                "outbreaks of animal diseases and will be transported in appropriately sanitized and accredited transport vehicle."
            )
            style = ParagraphStyle('AICBody', fontName='Helvetica', fontSize=9, leading=13, textColor=TEXT_MAIN)
            p_body = Paragraph(body_text, style)
            p_body.wrapOn(p, width - 3.0 * cm, 3 * cm)
            p_body.drawOn(p, 1.5 * cm, height - 6.7 * cm)

            current_y = height - 7.0 * cm

            # Section A to G - Details Table
            def format_heads_in_words(n):
                ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
                tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
                if 0 <= n < 20:
                    return ones[n].upper()
                elif 20 <= n < 100:
                    div, mod = divmod(n, 10)
                    res = tens[div] + (f"-{ones[mod]}" if mod else "")
                    return res.upper()
                else:
                    return str(n).upper()

            in_words_str = f"{format_heads_in_words(total_pigs)} HEADS ONLY"
            
            details_data = [
                [
                    Paragraph(f"<b>Total Number of Heads:</b> {total_pigs}<br/>In words: {in_words_str}", style),
                    Paragraph(f"<b>Classification:</b><br/>{', '.join(class_str)}", style)
                ],
                [
                    Paragraph(f"<b>Name of Shipper:</b> {shipper_name}", style),
                    Paragraph(f"<b>Address of Shipper:</b> {shipper_address}", style)
                ],
                [
                    Paragraph(f"<b>Livestock Handlers License:</b> {handlers_lic}", style),
                    Paragraph(f"<b>Expiration Date:</b> {handlers_expiry}", style)
                ],
                [
                    Paragraph(f"<b>Transport Carrier Accreditation:</b> {carrier_acc}", style),
                    Paragraph(f"<b>Expiration Date:</b> {carrier_expiry}", style)
                ],
                [
                    Paragraph(f"<b>Plate Number:</b> {plate_number}", style),
                    Paragraph(f"<b>CP #:</b> {cp_number}", style)
                ],
                [
                    Paragraph(f"<b>Origin:</b> {origin_barangays}", style),
                    Paragraph(f"<b>Destination:</b> {destination}", style)
                ],
                [
                    Paragraph("<b>Source Farm/s:</b> VARIOUS FARMS", style),
                    Paragraph(f"<b>Company Address:</b> {company_address}", style)
                ]
            ]

            table_details = Table(details_data, colWidths=[9.0 * cm, 9.0 * cm])
            table_details.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            
            tw, th = table_details.wrapOn(p, width - 3.0 * cm, 10 * cm)
            current_y -= th
            table_details.drawOn(p, 1.5 * cm, current_y)
            current_y -= 0.6 * cm

            # Animal Breakdown Table Title
            p.setFont("Helvetica-Bold", 10)
            p.setFillColor(PRIMARY_GREEN)
            p.drawString(1.5 * cm, current_y, "ANIMAL DESCRIPTION & BREAKDOWN")
            current_y -= 0.4 * cm

            # Table for Animals
            table_headers = ["SPECIE", "NAME OF OWNER", "BARANGAY", "NO. OF ANIMALS", "REMARKS"]
            table_rows = [table_headers]
            for o in origins:
                breakdown = []
                if o.inahin: breakdown.append(f"{o.inahin} Breeder(Sow)")
                if o.barako: breakdown.append(f"{o.barako} Breeder(Boar)")
                if o.fattener: breakdown.append(f"{o.fattener} Fattener")
                if o.grower: breakdown.append(f"{o.grower} Grower")
                if o.bulaw: breakdown.append(f"{o.bulaw} Bulaw")
                if o.starter: breakdown.append(f"{o.starter} Starter")
                remarks_str = ", ".join(breakdown) if breakdown else "FATTENER"
                
                table_rows.append([
                    "SWINE",
                    (application.farmer.get_full_name() or application.farmer.username).upper(),
                    o.barangay.name.upper(),
                    str(o.number_of_pigs),
                    remarks_str.upper()
                ])
            table_rows.append(["NOTHING FOLLOWS", "", "", "", ""])

            table_animals = Table(table_rows, colWidths=[3.0 * cm, 4.0 * cm, 3.5 * cm, 3.0 * cm, 4.5 * cm])
            table_animals.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_GREEN),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8.5),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                ('TOPPADDING', (0, 0), (-1, 0), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('SPAN', (0, -1), (-1, -1)),
                ('FONTNAME', (0, -1), (0, -1), 'Helvetica-Bold'),
            ]))
            
            tw_a, th_a = table_animals.wrapOn(p, width - 3.0 * cm, 8 * cm)
            current_y -= th_a
            table_animals.drawOn(p, 1.5 * cm, current_y)
            current_y -= 0.6 * cm

            # Issuance Text
            p.setFillColor(TEXT_MAIN)
            p.setFont("Helvetica-Bold", 9)
            date_str = issued_permit.date_issued.strftime("%B %d, %Y")
            p.drawString(1.5 * cm, current_y, f"Issued this {date_str}, as transport requirement in the Province of Quezon and valid within 48 hours.")
            current_y -= 1.0 * cm

            # Footer / Signatures
            sig_y = current_y
            
            # Left Footer Block
            p.setFont("Helvetica-Bold", 8)
            p.drawString(1.5 * cm, sig_y, "AIC No.")
            p.setFont("Helvetica", 8)
            p.drawString(4.0 * cm, sig_y, issued_permit.aic_number or "PENDING")
            
            p.setFont("Helvetica-Bold", 8)
            p.drawString(1.5 * cm, sig_y - 0.4 * cm, "Official Receipt No.")
            p.setFont("Helvetica", 8)
            p.drawString(4.0 * cm, sig_y - 0.4 * cm, or_num)

            p.setFont("Helvetica-Bold", 8)
            p.drawString(1.5 * cm, sig_y - 0.8 * cm, "Date Issued")
            p.setFont("Helvetica", 8)
            p.drawString(4.0 * cm, sig_y - 0.8 * cm, date_str)

            # Processed By
            p.setFont("Helvetica-Bold", 8)
            p.drawString(1.5 * cm, sig_y - 1.6 * cm, "Processed by:")
            p.line(1.5 * cm, sig_y - 2.5 * cm, 7.5 * cm, sig_y - 2.5 * cm)
            p.setFont("Helvetica-Bold", 8.5)
            p.drawCentredString(4.5 * cm, sig_y - 2.9 * cm, processed_by)
            p.setFont("Helvetica-Oblique", 7.5)
            p.drawCentredString(4.5 * cm, sig_y - 3.3 * cm, "Signature over Printed Name")

            # Signatory
            p.line(width - 7.5 * cm, sig_y - 2.5 * cm, width - 1.5 * cm, sig_y - 2.5 * cm)
            p.setFont("Helvetica-Bold", 9)
            p.drawCentredString(width - 4.5 * cm, sig_y - 2.9 * cm, oic_name.upper())
            p.setFont("Helvetica", 8)
            p.setFillColor(TEXT_MUTED)
            p.drawCentredString(width - 4.5 * cm, sig_y - 3.3 * cm, oic_title)
            p.drawCentredString(width - 4.5 * cm, sig_y - 3.7 * cm, "Date Signed: " + date_str)

            p.showPage()
            p.save()

            buffer.seek(0)
            filename = f"AIC_{issued_permit.permit_number}.pdf"
            issued_permit.aic_pdf.save(filename, File(buffer), save=True)
            logger.info(f"Successfully generated AIC PDF for application {permit_application_id}")
            return f"AIC PDF Generated: {filename}"
            
    except PermitApplication.DoesNotExist:
        logger.error(f"PermitApplication {permit_application_id} not found.")
    except Exception as e:
        if current_attempt < 3:
            wait_time = 10 * current_attempt
            logger.warning(
                f"Failed to generate AIC PDF for {permit_application_id}. "
                f"Retrying in {wait_time}s... (Attempt {current_attempt})"
            )
            generate_aic_pdf.using(run_after=timedelta(seconds=wait_time)).enqueue(
                permit_application_id, current_attempt=current_attempt + 1
            )
        else:
            logger.error(
                f"Max attempts reached for AIC PDF generation on application {permit_application_id}: {str(e)}"
            )
            raise e


def generate_collection_report_pdf(start_date, end_date, requesting_user=None):
    """
    Generates an Executive Summary PDF report of collections between two dates.
    Formats as an official Philippine LGU Memorandum Report.
    """
    payments = (
        PaymentHistory.objects.filter(
            status=PaymentHistory.Status.SUCCESS,
            created_at__date__range=[start_date, end_date],
        )
    )

    total_amount = payments.aggregate(Sum("amount"))["amount__sum"] or 0
    total_transactions = payments.count()

    # Breakdown by gateway
    online_payments = payments.filter(method='ONLINE')
    online_amount = online_payments.aggregate(Sum("amount"))["amount__sum"] or 0
    online_count = online_payments.count()

    manual_payments = payments.exclude(method='ONLINE')
    manual_amount = manual_payments.aggregate(Sum("amount"))["amount__sum"] or 0
    manual_count = manual_payments.count()

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Branding Colors
    PRIMARY_GREEN = colors.HexColor("#166534")
    TEXT_MAIN = colors.HexColor("#1c1917")  # Stone-900
    TEXT_MUTED = colors.HexColor("#57534e")  # Stone-600
    BORDER_COLOR = colors.HexColor("#d6d3d1")  # Stone-300
    ACCENT_BG = colors.HexColor("#fafaf9")  # Stone-50

    # Resolve the assets path relative to the backend project root
    ASSET_DIR = os.path.join(settings.BASE_DIR.parent, "asset")
    OFFICIAL_LOGO = os.path.join(ASSET_DIR, "sariaya-official-logo.jpg")
    AGRI_LOGO = os.path.join(ASSET_DIR, "sariaya-agri-logo.jpg")

    # Header Section
    logo_size = 2.0 * cm
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

    # Header Text (Centered LGU Format)
    p.setFillColor(TEXT_MUTED)
    p.setFont("Helvetica", 9)
    p.drawCentredString(width / 2, height - 1.0 * cm, "Republic of the Philippines")
    p.setFont("Helvetica-Bold", 10)
    p.drawCentredString(width / 2, height - 1.4 * cm, "PROVINCE OF QUEZON")
    p.drawCentredString(width / 2, height - 1.8 * cm, "Municipality of Sariaya")
    
    p.setFont("Helvetica-Bold", 12)
    p.setFillColor(PRIMARY_GREEN)
    p.drawCentredString(width / 2, height - 2.3 * cm, "OFFICE OF THE MUNICIPAL AGRICULTURIST")

    p.setStrokeColor(PRIMARY_GREEN)
    p.setLineWidth(1.5)
    p.line(1 * cm, height - 2.6 * cm, width - 1 * cm, height - 2.6 * cm)

    from_name = "ADMINISTRATIVE STAFF"
    if requesting_user:
        from_name = (requesting_user.get_full_name() or requesting_user.username).upper()

    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 14)
    p.drawCentredString(width / 2, height - 3.2 * cm, "COLLECTION SUMMARY REPORT")

    date_range_str = (
        f"{start_date.strftime('%B %d, %Y')} — {end_date.strftime('%B %d, %Y')}"
    )
    if start_date == end_date:
        date_range_str = start_date.strftime("%B %d, %Y")
    p.setFont("Helvetica-Bold", 9)
    p.setFillColor(TEXT_MUTED)
    p.drawCentredString(
        width / 2, height - 3.7 * cm, f"PERIOD: {date_range_str.upper()}"
    )

    current_y = height - 4.2 * cm

    # Section I: Summary of Key Metrics
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 9)
    p.drawString(1.5 * cm, current_y, "I. SUMMARY OF KEY FINANCIAL METRICS")
    current_y -= 0.4 * cm

    metric_data = [
        ["METRIC DESCRIPTION", "REPORTED VALUE"],
        ["TOTAL REVENUE COLLECTED", f"PHP {total_amount:,.2f}"],
        ["TOTAL SUCCESSFUL TRANSACTIONS", f"{total_transactions} payments"],
    ]
    metric_table = Table(metric_data, colWidths=[12 * cm, 6 * cm])
    metric_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f5f4")),
        ("TEXTCOLOR", (0, 0), (-1, 0), TEXT_MAIN),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ]))
    m_tw, m_th = metric_table.wrapOn(p, width, height)
    metric_table.drawOn(p, 1.5 * cm, current_y - m_th)
    current_y -= (m_th + 0.6 * cm)

    # Section II: Breakdown Table
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 9)
    p.drawString(1.5 * cm, current_y, "II. DETAILED CHANNEL RECAPITULATION")
    current_y -= 0.4 * cm

    data = [
        ["PAYMENT CHANNEL", "TRANSACTION COUNT", "TOTAL COLLECTED"],
        ["ONLINE (PAYMONGO)", f"{online_count} payments", f"PHP {online_amount:,.2f}"],
        ["OVER-THE-COUNTER (OTC)", f"{manual_count} payments", f"PHP {manual_amount:,.2f}"],
        ["TOTAL COLLECTION", f"{total_transactions} payments", f"PHP {total_amount:,.2f}"]
    ]
    table = Table(data, colWidths=[8 * cm, 5 * cm, 5 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#f5f5f4")),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
    ]))
    tw, th = table.wrapOn(p, width, height)
    table.drawOn(p, 1.5 * cm, current_y - th)
    current_y -= (th + 0.6 * cm)

    # Section III: Certification
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 9)
    p.drawString(1.5 * cm, current_y, "III. OFFICIAL OFFICE CERTIFICATION")
    current_y -= 0.4 * cm

    text = (
        f"This certifies that for the period from {start_date.strftime('%B %d, %Y')} to "
        f"{end_date.strftime('%B %d, %Y')}, a total of {total_transactions} payment transactions "
        f"were processed, yielding an aggregate collection of PHP {total_amount:,.2f}. All online payments "
        f"have been verified against the PayMongo checkout gateway, and manual payments have been "
        f"reconciled with the Municipal Treasurer's collection registers."
    )
    summary_style = ParagraphStyle(
        name='SummaryStyle_Collection',
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_MAIN
    )
    p_summary = Paragraph(text, summary_style)
    p_w, p_h = p_summary.wrap(17.2 * cm, height)
    
    padding = 10
    box_h = p_h + padding * 2
    
    p.setFillColor(ACCENT_BG)
    p.rect(1.5 * cm, current_y - box_h, 18 * cm, box_h, fill=True, stroke=True)
    p_summary.drawOn(p, 1.9 * cm, current_y - box_h + padding)
    current_y -= (box_h + 1.2 * cm)

    # Signatory Block
    sig_y = current_y
    if sig_y < 3.5 * cm:
        p.showPage()
        sig_y = height - 4.0 * cm
    
    # Prepared By
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(4.0 * cm, sig_y, "Prepared By:")
    p.line(1.5 * cm, sig_y - 1.2 * cm, 6.5 * cm, sig_y - 1.2 * cm)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(4.0 * cm, sig_y - 1.6 * cm, from_name)
    p.setFont("Helvetica", 7.5)
    p.setFillColor(TEXT_MUTED)
    p.drawCentredString(4.0 * cm, sig_y - 2.0 * cm, "Revenue Collector / Agri Staff")

    # Certified Correct
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(10.0 * cm, sig_y, "Certified Correct By:")
    p.line(7.5 * cm, sig_y - 1.2 * cm, 12.5 * cm, sig_y - 1.2 * cm)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(10.0 * cm, sig_y - 1.6 * cm, "ENGR. LEONARDO R. ABUSTAN")
    p.setFont("Helvetica", 7.5)
    p.setFillColor(TEXT_MUTED)
    p.drawCentredString(10.0 * cm, sig_y - 2.0 * cm, "Municipal Agriculturist")

    # Noted By
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(16.0 * cm, sig_y, "Noted By:")
    p.line(13.5 * cm, sig_y - 1.2 * cm, 18.5 * cm, sig_y - 1.2 * cm)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(16.0 * cm, sig_y - 1.6 * cm, "GLORIA M. VALBUENA")
    p.setFont("Helvetica", 7.5)
    p.setFillColor(TEXT_MUTED)
    p.drawCentredString(16.0 * cm, sig_y - 2.0 * cm, "Municipal Treasurer")

    # Footer
    p.setFillColor(colors.grey)
    p.setFont("Helvetica-Oblique", 7.5)
    p.drawString(
        1 * cm,
        1 * cm,
        f"Generated by FarmPass System on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
    )

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer


def generate_inspector_report_pdf(start_date, end_date, requesting_user=None):
    """
    Generates an Executive Summary PDF report of inspector activity between two dates.
    Formats as an official Philippine LGU Memorandum Report.
    """
    logs = (
        InspectorLogs.objects.filter(scanned_at__date__range=[start_date, end_date])
    )

    total_verifications = logs.count()
    active_inspectors = logs.values("inspector").distinct().count()
    total_permits_checked = logs.values("application").distinct().count()

    # Breakdown by inspector
    inspector_counts = logs.values(
        "inspector__username", "inspector__first_name", "inspector__last_name"
    ).annotate(count=Count("id")).order_by("-count")[:5]

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Branding Colors
    PRIMARY_PURPLE = colors.HexColor("#6b21a8")  # LGU Purple
    TEXT_MAIN = colors.HexColor("#1c1917")  # Stone-900
    TEXT_MUTED = colors.HexColor("#57534e")  # Stone-600
    BORDER_COLOR = colors.HexColor("#d6d3d1")  # Stone-300
    ACCENT_BG = colors.HexColor("#fafaf9")  # Stone-50

    # Resolve the assets path
    ASSET_DIR = os.path.join(settings.BASE_DIR.parent, "asset")
    OFFICIAL_LOGO = os.path.join(ASSET_DIR, "sariaya-official-logo.jpg")
    AGRI_LOGO = os.path.join(ASSET_DIR, "sariaya-agri-logo.jpg")

    # Header Section
    logo_size = 2.0 * cm
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

    # Header Text (Centered LGU Format)
    p.setFillColor(TEXT_MUTED)
    p.setFont("Helvetica", 9)
    p.drawCentredString(width / 2, height - 1.0 * cm, "Republic of the Philippines")
    p.setFont("Helvetica-Bold", 10)
    p.drawCentredString(width / 2, height - 1.4 * cm, "PROVINCE OF QUEZON")
    p.drawCentredString(width / 2, height - 1.8 * cm, "Municipality of Sariaya")
    
    p.setFont("Helvetica-Bold", 12)
    p.setFillColor(PRIMARY_PURPLE)
    p.drawCentredString(width / 2, height - 2.3 * cm, "OFFICE OF THE MUNICIPAL AGRICULTURIST")

    p.setStrokeColor(PRIMARY_PURPLE)
    p.setLineWidth(1.5)
    p.line(1 * cm, height - 2.6 * cm, width - 1 * cm, height - 2.6 * cm)

    from_name = "FIELD SERVICE OFFICER"
    if requesting_user:
        from_name = (requesting_user.get_full_name() or requesting_user.username).upper()

    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 14)
    p.drawCentredString(width / 2, height - 3.2 * cm, "INSPECTION SUMMARY REPORT")

    date_range_str = (
        f"{start_date.strftime('%B %d, %Y')} — {end_date.strftime('%B %d, %Y')}"
    )
    if start_date == end_date:
        date_range_str = start_date.strftime("%B %d, %Y")
    p.setFont("Helvetica-Bold", 9)
    p.setFillColor(TEXT_MUTED)
    p.drawCentredString(
        width / 2, height - 3.7 * cm, f"PERIOD: {date_range_str.upper()}"
    )

    current_y = height - 4.2 * cm

    # Section I: Summary of Key Metrics
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 9)
    p.drawString(1.5 * cm, current_y, "I. SUMMARY OF KEY ENFORCEMENT METRICS")
    current_y -= 0.4 * cm

    metric_data = [
        ["METRIC DESCRIPTION", "REPORTED VALUE"],
        ["TOTAL FIELD SCANS LOGGED", f"{total_verifications} scans"],
        ["ACTIVE ENFORCEMENT OFFICERS", f"{active_inspectors} active officers"],
        ["UNIQUE PERMITS VERIFIED", f"{total_permits_checked} unique permits"],
    ]
    metric_table = Table(metric_data, colWidths=[12 * cm, 6 * cm])
    metric_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f5f4")),
        ("TEXTCOLOR", (0, 0), (-1, 0), TEXT_MAIN),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ]))
    m_tw, m_th = metric_table.wrapOn(p, width, height)
    metric_table.drawOn(p, 1.5 * cm, current_y - m_th)
    current_y -= (m_th + 0.6 * cm)

    # Section II: Breakdown Table
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 9)
    p.drawString(1.5 * cm, current_y, "II. TOP VERIFYING ENFORCEMENT OFFICERS")
    current_y -= 0.4 * cm

    data = [["INSPECTOR USERNAME", "OFFICER FULL NAME", "VERIFICATIONS LOGGED"]]
    for c in inspector_counts:
        first = c.get("inspector__first_name") or ""
        last = c.get("inspector__last_name") or ""
        full = f"{first} {last}".strip() or "N/A"
        data.append([
            c["inspector__username"].upper(),
            full.upper(),
            f"{c['count']} verifications"
        ])
    if len(data) == 1:
        data.append(["NO ACTIVITY", "NO ACTIVE INSPECTORS RECORDED", "0 verifications"])

    table = Table(data, colWidths=[6 * cm, 7 * cm, 5 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_PURPLE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("ALIGN", (2, 1), (2, -1), "RIGHT"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
    ]))
    tw, th = table.wrapOn(p, width, height)
    table.drawOn(p, 1.5 * cm, current_y - th)
    current_y -= (th + 0.6 * cm)

    # Section III: Certification
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 9)
    p.drawString(1.5 * cm, current_y, "III. OFFICIAL OFFICE CERTIFICATION")
    current_y -= 0.4 * cm

    text = (
        f"This certifies that for the period from {start_date.strftime('%B %d, %Y')} to "
        f"{end_date.strftime('%B %d, %Y')}, livestock inspectors logged a total of {total_verifications} "
        f"checkpoint verifications across municipal transport corridors. A total of {active_inspectors} "
        f"enforcement officers participated in duties, validating {total_permits_checked} unique transport permits "
        f"via the FarmPass verification scan module."
    )
    summary_style = ParagraphStyle(
        name='SummaryStyle_Inspector',
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_MAIN
    )
    p_summary = Paragraph(text, summary_style)
    p_w, p_h = p_summary.wrap(17.2 * cm, height)
    
    padding = 10
    box_h = p_h + padding * 2
    
    p.setFillColor(ACCENT_BG)
    p.rect(1.5 * cm, current_y - box_h, 18 * cm, box_h, fill=True, stroke=True)
    p_summary.drawOn(p, 1.9 * cm, current_y - box_h + padding)
    current_y -= (box_h + 1.2 * cm)

    # Signatory Block
    sig_y = current_y
    if sig_y < 3.5 * cm:
        p.showPage()
        sig_y = height - 4.0 * cm
    
    # Prepared By
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(4.0 * cm, sig_y, "Prepared By:")
    p.line(1.5 * cm, sig_y - 1.2 * cm, 6.5 * cm, sig_y - 1.2 * cm)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(4.0 * cm, sig_y - 1.6 * cm, from_name)
    p.setFont("Helvetica", 7.5)
    p.setFillColor(TEXT_MUTED)
    p.drawCentredString(4.0 * cm, sig_y - 2.0 * cm, "Livestock Inspector / Agri Officer")

    # Certified Correct
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(10.0 * cm, sig_y, "Verified By:")
    p.line(7.5 * cm, sig_y - 1.2 * cm, 12.5 * cm, sig_y - 1.2 * cm)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(10.0 * cm, sig_y - 1.6 * cm, "DR. RENATO C. ALPAY")
    p.setFont("Helvetica", 7.5)
    p.setFillColor(TEXT_MUTED)
    p.drawCentredString(10.0 * cm, sig_y - 2.0 * cm, "Municipal Veterinarian / Agri Officer")

    # Approved By
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(16.0 * cm, sig_y, "Approved By:")
    p.line(13.5 * cm, sig_y - 1.2 * cm, 18.5 * cm, sig_y - 1.2 * cm)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(16.0 * cm, sig_y - 1.6 * cm, "ENGR. LEONARDO R. ABUSTAN")
    p.setFont("Helvetica", 7.5)
    p.setFillColor(TEXT_MUTED)
    p.drawCentredString(16.0 * cm, sig_y - 2.0 * cm, "Municipal Agriculturist")

    # Footer
    p.setFillColor(colors.grey)
    p.setFont("Helvetica-Oblique", 7.5)
    p.drawString(
        1 * cm,
        1 * cm,
        f"Official Audit Document • Generated {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
    )

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer


def generate_permit_issuance_report_pdf(start_date, end_date, requesting_user=None):
    """
    Generates an Executive Summary PDF report of issued permits between two dates.
    Formats as an official Philippine LGU Memorandum Report.
    """
    permits = (
        IssuedPermit.objects.filter(date_issued__range=[start_date, end_date])
    )

    total_permits = permits.count()
    
    # Aggregated livestock statistics
    total_pigs = TransportOrigin.objects.filter(
        application__issued_permit__in=permits
    ).aggregate(Sum("number_of_pigs"))["number_of_pigs__sum"] or 0

    active_routes = TransportOrigin.objects.filter(
        application__issued_permit__in=permits
    ).values("barangay").distinct().count()

    # Breakdown by Origin Barangay
    origin_counts = TransportOrigin.objects.filter(
        application__issued_permit__in=permits
    ).values("barangay__name").annotate(
        permit_count=Count("application", distinct=True), 
        pig_count=Sum("number_of_pigs")
    ).order_by("-pig_count")[:5]

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Branding Colors
    PRIMARY_GREEN = colors.HexColor("#166534")
    TEXT_MAIN = colors.HexColor("#1c1917")  # Stone-900
    TEXT_MUTED = colors.HexColor("#57534e")  # Stone-600
    BORDER_COLOR = colors.HexColor("#d6d3d1")  # Stone-300
    ACCENT_BG = colors.HexColor("#fafaf9")  # Stone-50

    # Resolve the assets path
    ASSET_DIR = os.path.join(settings.BASE_DIR.parent, "asset")
    OFFICIAL_LOGO = os.path.join(ASSET_DIR, "sariaya-official-logo.jpg")
    AGRI_LOGO = os.path.join(ASSET_DIR, "sariaya-agri-logo.jpg")

    # Header Section
    logo_size = 2.0 * cm
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

    # Header Text (Centered LGU Format)
    p.setFillColor(TEXT_MUTED)
    p.setFont("Helvetica", 9)
    p.drawCentredString(width / 2, height - 1.0 * cm, "Republic of the Philippines")
    p.setFont("Helvetica-Bold", 10)
    p.drawCentredString(width / 2, height - 1.4 * cm, "PROVINCE OF QUEZON")
    p.drawCentredString(width / 2, height - 1.8 * cm, "Municipality of Sariaya")
    
    p.setFont("Helvetica-Bold", 12)
    p.setFillColor(PRIMARY_GREEN)
    p.drawCentredString(width / 2, height - 2.3 * cm, "OFFICE OF THE MUNICIPAL AGRICULTURIST")

    p.setStrokeColor(PRIMARY_GREEN)
    p.setLineWidth(1.5)
    p.line(1 * cm, height - 2.6 * cm, width - 1 * cm, height - 2.6 * cm)

    from_name = "ADMINISTRATIVE OFFICER"
    if requesting_user:
        from_name = (requesting_user.get_full_name() or requesting_user.username).upper()

    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 14)
    p.drawCentredString(width / 2, height - 3.2 * cm, "PERMIT ISSUANCE SUMMARY REPORT")

    date_range_str = (
        f"{start_date.strftime('%B %d, %Y')} — {end_date.strftime('%B %d, %Y')}"
    )
    if start_date == end_date:
        date_range_str = start_date.strftime("%B %d, %Y")
    p.setFont("Helvetica-Bold", 9)
    p.setFillColor(TEXT_MUTED)
    p.drawCentredString(
        width / 2, height - 3.7 * cm, f"PERIOD: {date_range_str.upper()}"
    )

    current_y = height - 4.2 * cm

    # Section I: Summary of Key Metrics
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 9)
    p.drawString(1.5 * cm, current_y, "I. SUMMARY OF KEY DISTRIBUTION METRICS")
    current_y -= 0.4 * cm

    metric_data = [
        ["METRIC DESCRIPTION", "REPORTED VALUE"],
        ["TOTAL TRANSPORT PERMITS ISSUED", f"{total_permits} issued permits"],
        ["TOTAL LIVESTOCK VOLUME SHIPPED", f"{total_pigs} head (pigs)"],
        ["ACTIVE TRANSPORT CORRIDOR ROUTES", f"{active_routes} routes"],
    ]
    metric_table = Table(metric_data, colWidths=[12 * cm, 6 * cm])
    metric_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f5f4")),
        ("TEXTCOLOR", (0, 0), (-1, 0), TEXT_MAIN),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ]))
    m_tw, m_th = metric_table.wrapOn(p, width, height)
    metric_table.drawOn(p, 1.5 * cm, current_y - m_th)
    current_y -= (m_th + 0.6 * cm)

    # Section II: Breakdown Table
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 9)
    p.drawString(1.5 * cm, current_y, "II. TOP TRANSPORT ORIGINS BY VOLUME")
    current_y -= 0.4 * cm

    data = [["ORIGIN BARANGAY", "PERMITS GRANTED", "PIGS SHIPPED"]]
    for o in origin_counts:
        data.append([
            o["barangay__name"].upper(),
            f"{o['permit_count']} permits",
            f"{o['pig_count']} head"
        ])
    if len(data) == 1:
        data.append(["NO TRANSPORT RECORDED", "0 permits", "0 head"])

    table = Table(data, colWidths=[8 * cm, 5 * cm, 5 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
    ]))
    tw, th = table.wrapOn(p, width, height)
    table.drawOn(p, 1.5 * cm, current_y - th)
    current_y -= (th + 0.6 * cm)

    # Section III: Certification
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 9)
    p.drawString(1.5 * cm, current_y, "III. OFFICIAL OFFICE CERTIFICATION")
    current_y -= 0.4 * cm

    text = (
        f"This certifies that for the period from {start_date.strftime('%B %d, %Y')} to "
        f"{end_date.strftime('%B %d, %Y')}, the Municipal Agriculture Office issued a total of "
        f"{total_permits} Livestock Transport Permits covering a total volume of {total_pigs} pigs "
        f"transported across {active_routes} active origin barangay routes. All permits were issued "
        f"subsequent to health certificate validation by the Office of the Provincial Veterinarian."
    )
    summary_style = ParagraphStyle(
        name='SummaryStyle_Permit',
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_MAIN
    )
    p_summary = Paragraph(text, summary_style)
    p_w, p_h = p_summary.wrap(17.2 * cm, height)
    
    padding = 10
    box_h = p_h + padding * 2
    
    p.setFillColor(ACCENT_BG)
    p.rect(1.5 * cm, current_y - box_h, 18 * cm, box_h, fill=True, stroke=True)
    p_summary.drawOn(p, 1.9 * cm, current_y - box_h + padding)
    current_y -= (box_h + 1.2 * cm)

    # Signatory Block
    sig_y = current_y
    if sig_y < 3.5 * cm:
        p.showPage()
        sig_y = height - 4.0 * cm
    
    # Prepared By
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(4.0 * cm, sig_y, "Prepared By:")
    p.line(1.5 * cm, sig_y - 1.2 * cm, 6.5 * cm, sig_y - 1.2 * cm)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(4.0 * cm, sig_y - 1.6 * cm, from_name)
    p.setFont("Helvetica", 7.5)
    p.setFillColor(TEXT_MUTED)
    p.drawCentredString(4.0 * cm, sig_y - 2.0 * cm, "Livestock Division Staff / Agri Officer")

    # Certified Correct
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(10.0 * cm, sig_y, "Certified Correct By:")
    p.line(7.5 * cm, sig_y - 1.2 * cm, 12.5 * cm, sig_y - 1.2 * cm)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(10.0 * cm, sig_y - 1.6 * cm, "DR. RENATO C. ALPAY")
    p.setFont("Helvetica", 7.5)
    p.setFillColor(TEXT_MUTED)
    p.drawCentredString(10.0 * cm, sig_y - 2.0 * cm, "Municipal Veterinarian / Agri Officer")

    # Approved By
    p.setFillColor(TEXT_MAIN)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(16.0 * cm, sig_y, "Approved By:")
    p.line(13.5 * cm, sig_y - 1.2 * cm, 18.5 * cm, sig_y - 1.2 * cm)
    p.setFont("Helvetica-Bold", 8)
    p.drawCentredString(16.0 * cm, sig_y - 1.6 * cm, "ENGR. LEONARDO R. ABUSTAN")
    p.setFont("Helvetica", 7.5)
    p.setFillColor(TEXT_MUTED)
    p.drawCentredString(16.0 * cm, sig_y - 2.0 * cm, "Municipal Agriculturist")

    # Footer
    p.setFillColor(colors.grey)
    p.setFont("Helvetica-Oblique", 7.5)
    p.drawString(
        1 * cm,
        1 * cm,
        f"Generated by FarmPass System on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
    )

    buffer.seek(0)
    return buffer


def generate_barangay_distribution_pdf(start_date, end_date):
    """
    Generates a PDF showing livestock movement volume (total pigs) per origin barangay
    for a given date range.
    """
    # Count all transported pigs per origin barangay in the date range
    origin_stats = (
        TransportOrigin.objects.filter(
            application__created_at__date__range=[start_date, end_date]
        )
        .values("barangay__name")
        .annotate(
            total_pigs=Sum("number_of_pigs"),
            total_applications=Count("application", distinct=True),
        )
        .order_by("-total_pigs")
    )

    buffer = BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1 * cm,
        rightMargin=1 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.2 * cm,
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        alignment=1,  # Center
        textColor=colors.HexColor("#1c1917")
    )
    subtitle_style = ParagraphStyle(
        'HeaderSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        alignment=1,  # Center
        textColor=colors.HexColor("#57534e")
    )
    period_style = ParagraphStyle(
        'HeaderPeriod',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        alignment=1,  # Center
        textColor=colors.HexColor("#57534e")
    )

    date_range_str = (
        f"{start_date.strftime('%b %d, %Y')} — {end_date.strftime('%b %d, %Y')}"
    )
    if start_date == end_date:
        date_range_str = start_date.strftime("%B %d, %Y")

    # Branding Colors
    ACCENT_BLUE = colors.HexColor("#1e3a5f")

    # Logos
    ASSET_DIR = os.path.join(settings.BASE_DIR.parent, "asset")
    OFFICIAL_LOGO = os.path.join(ASSET_DIR, "sariaya-official-logo.jpg")
    AGRI_LOGO = os.path.join(ASSET_DIR, "sariaya-agri-logo.jpg")

    official_img = ""
    if os.path.exists(OFFICIAL_LOGO):
        official_img = Image(OFFICIAL_LOGO, width=2.0 * cm, height=2.0 * cm)

    agri_img = ""
    if os.path.exists(AGRI_LOGO):
        agri_img = Image(AGRI_LOGO, width=2.0 * cm, height=2.0 * cm)

    middle_flowables = [
        Paragraph("SARIAYA MUNICIPAL AGRICULTURE OFFICE", title_style),
        Spacer(1, 4),
        Paragraph("BARANGAY VOLUME DISTRIBUTION", subtitle_style),
        Spacer(1, 2),
        Paragraph(f"PERIOD: {date_range_str.upper()}", period_style)
    ]

    header_table = Table([[official_img, middle_flowables, agri_img]], colWidths=[2.2 * cm, 14.6 * cm, 2.2 * cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))

    story = [
        header_table,
        Spacer(1, 1.5 * cm)
    ]

    # Build table
    data = [["BARANGAY", "TOTAL APPLICATIONS", "TOTAL PIGS TRANSPORTED"]]
    grand_total_pigs = 0
    grand_total_apps = 0

    for stat in origin_stats:
        barangay_name = stat["barangay__name"] or "Unknown"
        total_pigs = stat["total_pigs"] or 0
        total_apps = stat["total_applications"] or 0
        grand_total_pigs += total_pigs
        grand_total_apps += total_apps
        data.append([barangay_name.upper(), str(total_apps), str(total_pigs)])

    data.append(["TOTAL", str(grand_total_apps), str(grand_total_pigs)])

    table = Table(data, colWidths=[8 * cm, 5 * cm, 6 * cm], repeatRows=1)
    style = TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), ACCENT_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
            ("GRID", (0, 0), (-1, -2), 0.5, colors.HexColor("#e5e7eb")),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#f3f4f6")),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ]
    )
    table.setStyle(style)
    story.append(table)

    canvas_factory = make_numbered_canvas(
        report_title="Barangay Volume Distribution",
        report_subtitle="BARANGAY VOLUME DISTRIBUTION",
        date_range_str=date_range_str,
        footer_text=f"Generated by FarmPass System on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
        primary_color=ACCENT_BLUE
    )

    doc.build(story, canvasmaker=canvas_factory)

    buffer.seek(0)
    return buffer


def generate_permit_issuance_csv(start_date, end_date):
    """
    Generates a plain CSV of all issued permits in a given date range.
    Returns a string that can be streamed back as a file download.
    """
    permits = (
        IssuedPermit.objects.filter(date_issued__range=[start_date, end_date])
        .select_related("application__farmer")
        .prefetch_related("application__origins__barangay")
        .order_by("-date_issued")
    )

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow(
        [
            "Permit Number",
            "Farmer Name",
            "Origin(s)",
            "Destination",
            "Total Pigs",
            "Transport Date",
            "Date Issued",
            "Valid Until",
        ]
    )

    for issued in permits:
        application = issued.application
        origins = application.origins.all()
        origin_names = ", ".join(o.barangay.name for o in origins)
        total_pigs = sum(o.number_of_pigs for o in origins)

        writer.writerow(
            [
                issued.permit_number,
                application.farmer.get_full_name(),
                origin_names,
                application.destination,
                total_pigs,
                application.transport_date.strftime("%Y-%m-%d"),
                issued.date_issued.strftime("%Y-%m-%d"),
                issued.valid_until.strftime("%Y-%m-%d") if issued.valid_until else "",
            ]
        )

    output.seek(0)
    return output
