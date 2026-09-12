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
def generate_aic_pdf(permit_application_id, current_attempt=1, issued_by_user_id=None):
    """
    Background task to generate a professional PDF Animal Inspection Certificate (AIC).
    Populates fields from OCR-extracted Handler's License and Transport Carrier Accreditation.
    """
    try:
        with transaction.atomic():
            application = (
                PermitApplication.objects.select_related("farmer")
                .prefetch_related("origins__barangay")
                .get(pk=permit_application_id)
            )
            issued_permit = getattr(application, "issued_permit", None)

            # Ensure AIC number and issue timestamp on application
            if not application.aic_number:
                from apps.permits.services.numbers import get_aic_number
                application.aic_number = get_aic_number(application)
                application.aic_issued_at = timezone.now()
                application.save(update_fields=["aic_number", "aic_issued_at"])
            elif not application.aic_issued_at:
                application.aic_issued_at = timezone.now()
                application.save(update_fields=["aic_issued_at"])

            if issued_permit and not issued_permit.aic_number:
                issued_permit.aic_number = application.aic_number
                issued_permit.save(update_fields=["aic_number"])
            
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
            if issued_permit and hasattr(issued_permit, 'payment_history') and issued_permit.payment_history and issued_permit.payment_history.or_number:
                or_num = issued_permit.payment_history.or_number
                
            # Processed by
            issuer = None
            if issued_by_user_id:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                issuer = User.objects.filter(pk=issued_by_user_id).first()
            elif issued_permit and issued_permit.issued_by:
                issuer = issued_permit.issued_by
            else:
                from apps.api.models import AuditTrail
                review_audit = AuditTrail.objects.filter(
                    what_performed__icontains=f"Application #{application.application_id}"
                ).order_by("-when_performed").first()
                if review_audit and review_audit.who_performed:
                    issuer = review_audit.who_performed

            processed_by = (
                issuer.get_full_name() or issuer.username if issuer else "MUNICIPAL AGRICULTURIST STAFF"
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
            issue_date = application.aic_issued_at or (issued_permit.date_issued if issued_permit else timezone.now())
            date_str = issue_date.strftime("%B %d, %Y")
            p.drawString(1.5 * cm, current_y, f"Issued this {date_str}, as transport requirement in the Province of Quezon and valid within 48 hours.")
            current_y -= 1.0 * cm

            # Footer / Signatures
            sig_y = current_y
            
            # Left Footer Block
            p.setFont("Helvetica-Bold", 8)
            p.drawString(1.5 * cm, sig_y, "AIC No.")
            p.setFont("Helvetica", 8)
            p.drawString(4.0 * cm, sig_y, application.aic_number or "PENDING")
            
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
            filename = f"AIC_{application.application_id}.pdf"
            application.aic_pdf.save(filename, File(buffer), save=True)
            if issued_permit:
                buffer.seek(0)
                issued_permit.aic_number = application.aic_number
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
                permit_application_id, current_attempt=current_attempt + 1, issued_by_user_id=issued_by_user_id
            )
        else:
            logger.error(
                f"Max attempts reached for AIC PDF generation on application {permit_application_id}: {str(e)}"
            )
            raise e
