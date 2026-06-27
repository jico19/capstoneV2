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
        
        # 1. Running Header on later pages (Page 2+)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#1c1917"))
            self.drawString(1 * cm, height - 1.5 * cm, f"SARIAYA MUNICIPAL AGRICULTURE OFFICE • {self.report_title.upper()}")
            
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#57534e"))
            self.drawRightString(width - 1 * cm, height - 1.5 * cm, f"Period: {self.date_range_str}")
            
            # Divider line
            self.setStrokeColor(colors.HexColor("#e7e5e4"))
            self.setLineWidth(0.5)
            self.line(1 * cm, height - 1.8 * cm, width - 1 * cm, height - 1.8 * cm)
            
        # 2. Running Footer on all pages
        # Divider line above footer
        self.setStrokeColor(colors.HexColor("#e7e5e4"))
        self.setLineWidth(0.5)
        self.line(1 * cm, 1.8 * cm, width - 1 * cm, 1.8 * cm)
        
        # Footer text
        self.setFont("Helvetica-Oblique", 8)
        self.setFillColor(colors.HexColor("#78716c"))
        self.drawString(1 * cm, 1.2 * cm, self.footer_text)
        
        # Page numbers
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
from apps.permits.models import IssuedPermit, PermitApplication, TransportOrigin

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

            # 1. Page Background & Border
            p.setFillColor(colors.white)
            p.rect(0, 0, width, height, fill=True, stroke=False)

            # Subtle accent on the left
            p.setFillColor(PRIMARY_GREEN)
            p.rect(0, 0, 0.5 * cm, height, fill=True, stroke=False)

            # 2. Header Section
            # Draw Logos
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

            # Header Text (Centered)
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

            # 3. Main Content Grid
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

            # 4. Security & Verification Zone
            p.setFillColor(ACCENT_BG)
            p.rect(1.5 * cm, 3.5 * cm, 18 * cm, 6 * cm, fill=True, stroke=True)
            p.setStrokeColor(BORDER_COLOR)

            # QR Code Generation
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

            # 5. Signatures
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

            # 6. Footer Note
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


def generate_collection_report_pdf(start_date, end_date):
    """
    Generates a PDF report of all successful payments between two dates.
    """
    payments = (
        PaymentHistory.objects.filter(
            status=PaymentHistory.Status.SUCCESS,
            created_at__date__range=[start_date, end_date],
        )
        .select_related("issued_permit__application__farmer")
        .order_by("created_at")
    )

    total_amount = payments.aggregate(Sum("amount"))["amount__sum"] or 0

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
    PRIMARY_GREEN = colors.HexColor("#166534")

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
        Paragraph("COLLECTION REPORT", subtitle_style),
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

    # Table Data
    data = [["REF #", "FARMER", "GATEWAY", "DATE", "AMOUNT"]]
    for pay in payments:
        data.append(
            [
                f"TRX-{pay.id}",
                pay.issued_permit.application.farmer.get_full_name().upper()[:20],
                pay.method.upper(),
                pay.created_at.strftime("%Y-%m-%d"),
                f"P{pay.amount:,.2f}",
            ]
        )

    # Summary Row
    data.append(["", "", "", "TOTAL:", f"P{total_amount:,.2f}"])

    # Table Styling
    table = Table(data, colWidths=[3 * cm, 7 * cm, 3 * cm, 3 * cm, 3 * cm], repeatRows=1)
    style = TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_GREEN),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
            ("BACKGROUND", (0, -1), (-1, -1), colors.whitesmoke),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -2), 0.5, colors.grey),
            ("ALIGN", (4, 1), (4, -1), "RIGHT"),
        ]
    )
    table.setStyle(style)
    story.append(table)

    canvas_factory = make_numbered_canvas(
        report_title="Collection Report",
        report_subtitle="COLLECTION REPORT",
        date_range_str=date_range_str,
        footer_text=f"Generated by FarmPass System on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
        primary_color=PRIMARY_GREEN
    )

    doc.build(story, canvasmaker=canvas_factory)

    buffer.seek(0)
    return buffer


def generate_inspector_report_pdf(start_date, end_date):
    """
    Generates a PDF report of all field verifications performed by inspectors.
    """
    logs = (
        InspectorLogs.objects.filter(scanned_at__date__range=[start_date, end_date])
        .select_related("inspector", "application__farmer")
        .order_by("-scanned_at")
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
    
    body_style = ParagraphStyle(
        'TableBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1c1917")
    )

    date_range_str = (
        f"{start_date.strftime('%b %d, %Y')} — {end_date.strftime('%b %d, %Y')}"
    )
    if start_date == end_date:
        date_range_str = start_date.strftime("%B %d, %Y")

    # Branding Colors
    PRIMARY_PURPLE = colors.HexColor("#6b21a8")

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
        Paragraph("SARIAYA MUNICIPAL FIELD VERIFICATION", title_style),
        Spacer(1, 4),
        Paragraph("INSPECTOR DUTY LOGS", subtitle_style),
        Spacer(1, 2),
        Paragraph(f"AUDIT PERIOD: {date_range_str.upper()}", period_style)
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

    # Table Data
    data = [["ID", "INSPECTOR", "FARMER", "TIMESTAMP", "REMARKS"]]
    for log in logs:
        remarks_p = Paragraph(log.notes or "VERIFIED", body_style)
        data.append(
            [
                f"LOG-{log.id}",
                log.inspector.username.upper(),
                log.application.farmer.get_full_name().upper()[:15],
                log.scanned_at.strftime("%Y-%m-%d %H:%M"),
                remarks_p,
            ]
        )

    # Table Styling
    table = Table(data, colWidths=[2.5 * cm, 3.5 * cm, 4.5 * cm, 4 * cm, 4.5 * cm], repeatRows=1)
    style = TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_PURPLE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTSIZE", (0, 1), (-2, -1), 8),
        ]
    )
    table.setStyle(style)
    story.append(table)

    canvas_factory = make_numbered_canvas(
        report_title="Inspector Duty Logs",
        report_subtitle="INSPECTOR DUTY LOGS",
        date_range_str=date_range_str,
        footer_text=f"Official Audit Document • Generated {timezone.now().strftime('%Y-%m-%d')}",
        primary_color=PRIMARY_PURPLE
    )

    doc.build(story, canvasmaker=canvas_factory)

    buffer.seek(0)
    return buffer


def generate_permit_issuance_report_pdf(start_date, end_date):
    """
    Generates a PDF list of all issued permits in a given date range.
    Shows permit number, farmer name, origin, destination, and pig count.
    """
    permits = (
        IssuedPermit.objects.filter(date_issued__range=[start_date, end_date])
        .select_related("application__farmer")
        .prefetch_related("application__origins__barangay")
        .order_by("-date_issued")
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
    PRIMARY_GREEN = colors.HexColor("#166534")

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
        Paragraph("PERMIT ISSUANCE SUMMARY", subtitle_style),
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

    # Build table rows: one row per issued permit
    data = [["PERMIT #", "FARMER", "ORIGIN", "DESTINATION", "PIGS", "DATE"]]
    for issued in permits:
        application = issued.application
        origins = application.origins.all()

        if origins.count() == 1:
            origin_label = origins.first().barangay.name
        else:
            origin_label = f"Multiple ({origins.count()})"

        total_pigs = sum(o.number_of_pigs for o in origins)

        data.append(
            [
                issued.permit_number,
                application.farmer.get_full_name().upper()[:18],
                origin_label[:16],
                application.destination[:16],
                str(total_pigs),
                issued.date_issued.strftime("%Y-%m-%d"),
            ]
        )

    total_permits = len(data) - 1  # exclude header row
    data.append(["", "", "", f"TOTAL: {total_permits} permits", "", ""])

    table = Table(
        data, colWidths=[3 * cm, 4.5 * cm, 3.5 * cm, 3.5 * cm, 1.5 * cm, 3 * cm], repeatRows=1
    )
    style = TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_GREEN),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
            ("GRID", (0, 0), (-1, -2), 0.5, colors.HexColor("#e5e7eb")),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("ALIGN", (4, 0), (4, -1), "CENTER"),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#f3f4f6")),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("ALIGN", (3, -1), (3, -1), "RIGHT"),
        ]
    )
    table.setStyle(style)
    story.append(table)

    canvas_factory = make_numbered_canvas(
        report_title="Permit Issuance Summary",
        report_subtitle="PERMIT ISSUANCE SUMMARY",
        date_range_str=date_range_str,
        footer_text=f"Generated by FarmPass System on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
        primary_color=PRIMARY_GREEN
    )

    doc.build(story, canvasmaker=canvas_factory)

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

    # CSV header row
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
