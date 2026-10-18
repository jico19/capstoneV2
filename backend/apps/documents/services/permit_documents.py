import logging
import os
import html
from datetime import timedelta
from io import BytesIO

import qrcode
from django.conf import settings
from django.core.files import File
from django.db import transaction
from django.tasks import task
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, Paragraph, Image as RLImage
from reportlab.lib.styles import ParagraphStyle

from apps.documents.pdf_builder import (
    GREEN as PDF_GREEN,
    TEXT_MAIN as PDF_TEXT_MAIN,
    TEXT_MUTED as PDF_TEXT_MUTED,
    BORDER_COLOR as PDF_BORDER_COLOR,
    ACCENT_BG as PDF_ACCENT_BG,
    OFFICIAL_LOGO,
    AGRI_LOGO,
)

from apps.permits.models import (
    PermitApplication,
    SubmittedDocument,
    ApplicationSignatory,
)

logger = logging.getLogger(__name__)


def _retry_pdf_task(task_fn, task_name, permit_application_id, current_attempt, error, extra_kwargs=None):
    if current_attempt < 3:
        wait_time = 10 * current_attempt
        logger.warning(
            f"Failed to generate {task_name} PDF for {permit_application_id}. "
            f"Retrying in {wait_time}s... (Attempt {current_attempt})"
        )
        task_fn.using(run_after=timedelta(seconds=wait_time)).enqueue(
            permit_application_id, current_attempt=current_attempt + 1, **(extra_kwargs or {})
        )
    else:
        logger.error(
            f"Max attempts reached for {task_name} PDF generation on application {permit_application_id}: {str(error)}"
        )
        raise error

def format_heads_in_words(n):
    """Convert an integer head count to formal words."""
    if not n or n <= 0:
        return "ZERO"
    ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
            "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
            "SEVENTEEN", "EIGHTEEN", "NINETEEN"]
    tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"]

    def convert_chunk(num):
        res = []
        if num >= 100:
            res.append(ones[num // 100] + " HUNDRED")
            num %= 100
        if 0 < num < 20:
            res.append(ones[num])
        elif num >= 20:
            t = tens[num // 10]
            o = ones[num % 10]
            res.append(f"{t}-{o}" if o else t)
        return " ".join(res)

    parts = []
    if n >= 1000000:
        parts.append(f"{convert_chunk(n // 1000000)} MILLION")
        n %= 1000000
    if n >= 1000:
        parts.append(f"{convert_chunk(n // 1000)} THOUSAND")
        n %= 1000
    if n > 0:
        parts.append(convert_chunk(n))
    return " ".join(parts).strip()


@task()
def generate_permit_pdf(permit_application_id, current_attempt=1):
    """
    Background task to generate an official executive Livestock Transport Permit.
    Uses formal Republic of the Philippines / Municipality of Sariaya letterhead,
    dual municipal seals, official double border, dynamic auto-wrapping tables
    for long destinations/origins/purposes, high-resolution QR verification,
    and official Municipal Agriculturist attestation.
    """
    try:
        with transaction.atomic():
            application = (
                PermitApplication.objects.select_related("farmer", "issued_permit")
                .prefetch_related("origins__barangay")
                .get(pk=permit_application_id)
            )
            issued_permit = application.issued_permit

            # Origins and swine aggregations
            origins = list(application.origins.all())
            total_pigs = sum(o.number_of_pigs for o in origins)
            origin_barangays = ", ".join(o.barangay.name for o in origins)

            # Categorized breakdown
            inahin_total = sum(o.inahin for o in origins)
            barako_total = sum(o.barako for o in origins)
            fattener_total = sum(o.fattener for o in origins)
            grower_total = sum(o.grower for o in origins)
            bulaw_total = sum(o.bulaw for o in origins)
            starter_total = sum(o.starter for o in origins)

            breakdown_parts = []
            if inahin_total > 0:
                breakdown_parts.append(f"Sow (Inahin): {inahin_total}")
            if barako_total > 0:
                breakdown_parts.append(f"Boar (Barako): {barako_total}")
            if fattener_total > 0:
                breakdown_parts.append(f"Fattener: {fattener_total}")
            if grower_total > 0:
                breakdown_parts.append(f"Grower: {grower_total}")
            if bulaw_total > 0:
                breakdown_parts.append(f"Bulaw: {bulaw_total}")
            if starter_total > 0:
                breakdown_parts.append(f"Starter: {starter_total}")

            breakdown_str = " | ".join(breakdown_parts) if breakdown_parts else f"Live Swine (Commercial Hogs): {total_pigs}"

            # Signatory config — resolved per application/document type
            from apps.permits.services.signatory import resolve_signatory
            oic_name, oic_title = resolve_signatory(
                application, ApplicationSignatory.DocumentType.PERMIT
            )

            farmer_name = (
                application.farmer.get_full_name() or application.farmer.username
            ).upper()

            date_issued_str = (
                issued_permit.date_issued.strftime("%B %d, %Y")
                if issued_permit.date_issued
                else timezone.now().strftime("%B %d, %Y")
            )
            valid_until_str = (
                issued_permit.valid_until.strftime("%B %d, %Y")
                if issued_permit.valid_until
                else "N/A"
            )
            transport_date_str = (
                application.transport_date.strftime("%B %d, %Y")
                if application.transport_date
                else "N/A"
            )
            in_words_str = f"{format_heads_in_words(total_pigs)} HEADS ONLY"

            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4

            PRIMARY_GREEN = PDF_GREEN
            TEXT_MAIN = PDF_TEXT_MAIN
            TEXT_MUTED = PDF_TEXT_MUTED
            BORDER_COLOR = PDF_BORDER_COLOR
            ACCENT_BG = PDF_ACCENT_BG

            # 1. Page Background & Double Formal Certificate Border
            p.setFillColor(colors.white)
            p.rect(0, 0, width, height, fill=True, stroke=False)

            # Outer frame (green)
            p.setStrokeColor(PRIMARY_GREEN)
            p.setLineWidth(1.5)
            p.rect(1.0 * cm, 1.0 * cm, width - 2.0 * cm, height - 2.0 * cm, fill=False, stroke=True)

            # Inner hairline frame
            p.setStrokeColor(BORDER_COLOR)
            p.setLineWidth(0.5)
            p.rect(1.18 * cm, 1.18 * cm, width - 2.36 * cm, height - 2.36 * cm, fill=False, stroke=True)

            # 2. Letterhead Logos & Typography
            logo_size = 2.0 * cm
            if os.path.exists(OFFICIAL_LOGO):
                p.drawImage(
                    OFFICIAL_LOGO,
                    1.6 * cm,
                    height - 3.5 * cm,
                    width=logo_size,
                    height=logo_size,
                    mask="auto",
                )

            if os.path.exists(AGRI_LOGO):
                p.drawImage(
                    AGRI_LOGO,
                    width - 1.6 * cm - logo_size,
                    height - 3.5 * cm,
                    width=logo_size,
                    height=logo_size,
                    mask="auto",
                )

            p.setFillColor(TEXT_MUTED)
            p.setFont("Helvetica", 8.5)
            p.drawCentredString(width / 2, height - 1.6 * cm, "Republic of the Philippines")
            p.drawCentredString(width / 2, height - 2.0 * cm, "Province of Quezon")
            p.setFont("Helvetica-Bold", 10.5)
            p.setFillColor(TEXT_MAIN)
            p.drawCentredString(width / 2, height - 2.45 * cm, "MUNICIPALITY OF SARIAYA")
            p.setFont("Helvetica-Bold", 11.5)
            p.setFillColor(PRIMARY_GREEN)
            p.drawCentredString(width / 2, height - 2.95 * cm, "OFFICE OF THE MUNICIPAL AGRICULTURIST")

            # Green decorative separator line
            p.setStrokeColor(PRIMARY_GREEN)
            p.setLineWidth(1.5)
            p.line(1.5 * cm, height - 3.35 * cm, width - 1.5 * cm, height - 3.35 * cm)

            # 3. Document Title
            p.setFillColor(TEXT_MAIN)
            p.setFont("Helvetica-Bold", 16)
            p.drawCentredString(width / 2, height - 4.0 * cm, "LIVESTOCK TRANSPORT PERMIT")
            p.setFont("Helvetica-Bold", 7.5)
            p.setFillColor(TEXT_MUTED)
            p.drawCentredString(width / 2, height - 4.45 * cm, "OFFICIAL LIVESTOCK MOVEMENT CLEARANCE & MANIFEST")

            # 4. Top Reference Banner Table (Permit #, Date Issued, Valid Until)
            ref_label_style = ParagraphStyle(
                'RefLabel',
                fontName='Helvetica-Bold',
                fontSize=7,
                leading=8,
                textColor=TEXT_MUTED,
                alignment=1,
            )
            ref_val_style = ParagraphStyle(
                'RefVal',
                fontName='Helvetica-Bold',
                fontSize=11,
                leading=13,
                textColor=PRIMARY_GREEN,
                alignment=1,
            )
            ref_val_dark = ParagraphStyle(
                'RefValDark',
                fontName='Helvetica-Bold',
                fontSize=10,
                leading=12,
                textColor=TEXT_MAIN,
                alignment=1,
            )

            ref_table_data = [
                [
                    Paragraph("PERMIT NUMBER", ref_label_style),
                    Paragraph("DATE ISSUED", ref_label_style),
                    Paragraph("VALID UNTIL", ref_label_style),
                ],
                [
                    Paragraph(html.escape(issued_permit.permit_number), ref_val_style),
                    Paragraph(html.escape(date_issued_str), ref_val_dark),
                    Paragraph(html.escape(valid_until_str), ref_val_style),
                ]
            ]
            ref_table = Table(ref_table_data, colWidths=[6.0 * cm, 6.0 * cm, 6.0 * cm])
            ref_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), ACCENT_BG),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))

            current_y = height - 4.7 * cm
            rw, rh = ref_table.wrapOn(p, 18.0 * cm, 3 * cm)
            current_y -= rh
            ref_table.drawOn(p, 1.5 * cm, current_y)

            current_y -= 0.35 * cm

            # Style definitions for data tables
            val_style = ParagraphStyle(
                'PermitValBold',
                fontName='Helvetica-Bold',
                fontSize=8.5,
                leading=10.5,
                textColor=TEXT_MAIN,
                wordWrap='CJK',
            )
            val_style_norm = ParagraphStyle(
                'PermitValNorm',
                fontName='Helvetica',
                fontSize=8.5,
                leading=10.5,
                textColor=TEXT_MAIN,
                wordWrap='CJK',
            )
            section_hdr_style = ParagraphStyle(
                'PermitSecHdr',
                fontName='Helvetica-Bold',
                fontSize=7.5,
                leading=9,
                textColor=PRIMARY_GREEN,
            )

            # 5. Section I: Permittee & Route Specifications (Dynamic Auto-wrapping)
            p_data_1 = [
                [
                    Paragraph("<b>I. PERMITTEE & TRANSPORT ROUTE</b>", section_hdr_style),
                    "",
                ],
                [
                    Paragraph(f"<font color='#57534e'><b>REGISTERED PERMITTEE (FARMER):</b></font><br/>{html.escape(farmer_name)}", val_style),
                    Paragraph(f"<font color='#57534e'><b>SYSTEM APPLICATION ID:</b></font><br/>{html.escape(application.application_id)}", val_style),
                ],
                [
                    Paragraph(f"<font color='#57534e'><b>POINT(S) OF ORIGIN (SARIAYA BARANGAY):</b></font><br/>{html.escape(origin_barangays)}", val_style_norm),
                    Paragraph(f"<font color='#57534e'><b>FINAL DESTINATION ADDRESS:</b></font><br/>{html.escape(application.destination or 'N/A')}", val_style_norm),
                ],
                [
                    Paragraph(f"<font color='#57534e'><b>SCHEDULED TRANSPORT DATE:</b></font><br/>{html.escape(transport_date_str)}", val_style),
                    Paragraph(f"<font color='#57534e'><b>AUTHORIZED PURPOSE:</b></font><br/>{html.escape(application.purpose or 'LIVESTOCK TRADE/TRANSPORT')}", val_style_norm),
                ],
            ]
            t_route = Table(p_data_1, colWidths=[9.0 * cm, 9.0 * cm])
            t_route.setStyle(TableStyle([
                ('SPAN', (0, 0), (1, 0)),
                ('BACKGROUND', (0, 0), (1, 0), colors.HexColor("#f0fdf4")),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            tw1, th1 = t_route.wrapOn(p, 18.0 * cm, 8 * cm)
            current_y -= th1
            t_route.drawOn(p, 1.5 * cm, current_y)

            current_y -= 0.35 * cm

            # 6. Section II: Consignment Breakdown Table
            p_data_2 = [
                [
                    Paragraph("<b>II. LIVESTOCK CONSIGNMENT & CLASSIFICATION</b>", section_hdr_style),
                    "",
                ],
                [
                    Paragraph(f"<font color='#57534e'><b>TOTAL SWINE HEADCOUNT:</b></font><br/><font color='#166534'><b>{total_pigs} HEADS</b></font>", val_style),
                    Paragraph(f"<font color='#57534e'><b>HEADCOUNT IN WORDS:</b></font><br/>{html.escape(in_words_str)}", val_style),
                ],
                [
                    Paragraph(f"<font color='#57534e'><b>CLASSIFIED BREAKDOWN:</b></font><br/>{html.escape(breakdown_str)}", val_style_norm),
                    Paragraph(f"<font color='#57534e'><b>REGULATORY STATUS:</b></font><br/><font color='#166534'><b>OFFICIALLY CLEARED FOR MOVEMENT</b></font>", val_style),
                ],
            ]
            t_consignment = Table(p_data_2, colWidths=[9.0 * cm, 9.0 * cm])
            t_consignment.setStyle(TableStyle([
                ('SPAN', (0, 0), (1, 0)),
                ('BACKGROUND', (0, 0), (1, 0), colors.HexColor("#f0fdf4")),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            tw2, th2 = t_consignment.wrapOn(p, 18.0 * cm, 6 * cm)
            current_y -= th2
            t_consignment.drawOn(p, 1.5 * cm, current_y)

            current_y -= 0.35 * cm

            # 7. Section III: Digital Security & Field Verification (QR Code)
            qr_url = f"{settings.FRONTEND_URL}/inspector/verify/{issued_permit.qr_token}"
            qr = qrcode.QRCode(version=1, box_size=10, border=1)
            qr.add_data(qr_url)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            qr_buffer = BytesIO()
            qr_img.save(qr_buffer, format="PNG")
            qr_buffer.seek(0)

            qr_rl_img = RLImage(qr_buffer, width=3.8 * cm, height=3.8 * cm)

            qr_notice_style = ParagraphStyle(
                'QRNotice',
                fontName='Helvetica',
                fontSize=7.5,
                leading=10,
                textColor=TEXT_MUTED,
            )
            qr_title_style = ParagraphStyle(
                'QRTitle',
                fontName='Helvetica-Bold',
                fontSize=9,
                leading=11,
                textColor=TEXT_MAIN,
            )
            token_style = ParagraphStyle(
                'TokenStyle',
                fontName='Courier-Bold',
                fontSize=8,
                leading=10,
                textColor=PRIMARY_GREEN,
            )

            qr_card_data = [
                [
                    Paragraph("<b>III. DIGITAL SECURITY & FIELD VERIFICATION</b>", section_hdr_style),
                    "",
                ],
                [
                    qr_rl_img,
                    [
                        Paragraph("<b>SECURE FIELD INSPECTION QR VERIFICATION</b>", qr_title_style),
                        Paragraph(
                            "This permit is cryptographically protected and registered with the FarmPass municipal livestock transport tracking system.",
                            qr_notice_style
                        ),
                        Paragraph(
                            "Authorized Checkpoint Officers, Police, and Abattoir Inspectors must scan this QR code using the official FarmPass Inspector App to authenticate active status in real-time.",
                            qr_notice_style
                        ),
                        Paragraph(
                            f"<b>SECURITY TOKEN:</b> {html.escape(str(issued_permit.qr_token))}",
                            token_style
                        ),
                    ]
                ]
            ]

            t_qr = Table(qr_card_data, colWidths=[4.2 * cm, 13.8 * cm])
            t_qr.setStyle(TableStyle([
                ('SPAN', (0, 0), (1, 0)),
                ('BACKGROUND', (0, 0), (1, 0), colors.HexColor("#f0fdf4")),
                ('BACKGROUND', (0, 1), (-1, -1), ACCENT_BG),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('ALIGN', (0, 1), (0, 1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            tw3, th3 = t_qr.wrapOn(p, 18.0 * cm, 6 * cm)
            current_y -= th3
            t_qr.drawOn(p, 1.5 * cm, current_y)

            current_y -= 0.35 * cm

            # 8. Section IV: Official Certification & Signatory Block
            attest_style = ParagraphStyle(
                'AttestStyle',
                fontName='Helvetica-Oblique',
                fontSize=7.5,
                leading=9.5,
                textColor=TEXT_MAIN,
                alignment=1,
            )
            attest_text = (
                "This certifies that the livestock movement specified herein has complied with municipal animal welfare guidelines, "
                "veterinary quarantine health clearances, and local transport ordinances of the Municipality of Sariaya, Province of Quezon."
            )
            p_attest = Paragraph(attest_text, attest_style)
            aw, ah = p_attest.wrapOn(p, 18.0 * cm, 2 * cm)
            current_y -= ah
            p_attest.drawOn(p, 1.5 * cm, current_y)

            current_y -= 0.3 * cm

            # Signatory Line
            sig_box_width = 8.5 * cm
            sig_x = width - 1.5 * cm - sig_box_width
            sig_y = current_y

            p.setStrokeColor(TEXT_MAIN)
            p.setLineWidth(0.8)
            p.line(sig_x, sig_y - 0.9 * cm, sig_x + sig_box_width, sig_y - 0.9 * cm)

            p.setFont("Helvetica-Bold", 10)
            p.setFillColor(TEXT_MAIN)
            p.drawCentredString(sig_x + (sig_box_width / 2), sig_y - 1.3 * cm, oic_name.upper())

            p.setFont("Helvetica", 8)
            p.setFillColor(TEXT_MUTED)
            p.drawCentredString(sig_x + (sig_box_width / 2), sig_y - 1.7 * cm, oic_title)
            p.drawCentredString(sig_x + (sig_box_width / 2), sig_y - 2.05 * cm, "Office of the Municipal Agriculturist — Sariaya, Quezon")

            # Left side: Issuance timestamp note
            p.setFont("Helvetica-Bold", 7.5)
            p.setFillColor(TEXT_MUTED)
            p.drawString(1.5 * cm, sig_y - 0.8 * cm, "OFFICIAL MUNICIPAL CLEARANCE")
            p.setFont("Helvetica", 7)
            p.drawString(1.5 * cm, sig_y - 1.2 * cm, f"Electronic Authorization Ref: #{application.pk:05d}")
            p.drawString(1.5 * cm, sig_y - 1.55 * cm, f"Certified Issued: {date_issued_str}")
            p.drawString(1.5 * cm, sig_y - 1.9 * cm, "Valid for transport within stated validity window.")

            # 9. Micro-Footer
            p.setStrokeColor(BORDER_COLOR)
            p.setLineWidth(0.5)
            p.line(1.5 * cm, 1.35 * cm, width - 1.5 * cm, 1.35 * cm)

            p.setFont("Helvetica", 6.5)
            p.setFillColor(TEXT_MUTED)
            p.drawString(
                1.5 * cm,
                1.15 * cm,
                f"FarmPass Electronic Livestock Clearance System • Municipality of Sariaya • Generated {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}"
            )
            p.drawRightString(
                width - 1.5 * cm,
                1.15 * cm,
                "Computer-generated clearance. Any alteration, tampering, or erasure voids this permit."
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
        _retry_pdf_task(generate_permit_pdf, "permit", permit_application_id, current_attempt, e)

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
            # Signatory config — resolved per application/document type
            from apps.permits.services.signatory import resolve_signatory
            oic_name, oic_title = resolve_signatory(
                application, ApplicationSignatory.DocumentType.AIC
            )
            
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
            PRIMARY_GREEN, TEXT_MAIN, TEXT_MUTED, BORDER_COLOR, ACCENT_BG = (
                PDF_GREEN, PDF_TEXT_MAIN, PDF_TEXT_MUTED, PDF_BORDER_COLOR, PDF_ACCENT_BG
            )

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

            in_words_str = f"{format_heads_in_words(total_pigs)} HEADS ONLY"
            
            details_data = [
                [
                    Paragraph(f"<b>Total Number of Heads:</b> {total_pigs}<br/>In words: {html.escape(in_words_str)}", style),
                    Paragraph(f"<b>Classification:</b><br/>{html.escape(', '.join(class_str))}", style)
                ],
                [
                    Paragraph(f"<b>Name of Shipper:</b> {html.escape(str(shipper_name))}", style),
                    Paragraph(f"<b>Address of Shipper:</b> {html.escape(str(shipper_address))}", style)
                ],
                [
                    Paragraph(f"<b>Livestock Handlers License:</b> {html.escape(str(handlers_lic))}", style),
                    Paragraph(f"<b>Expiration Date:</b> {html.escape(str(handlers_expiry))}", style)
                ],
                [
                    Paragraph(f"<b>Transport Carrier Accreditation:</b> {html.escape(str(carrier_acc))}", style),
                    Paragraph(f"<b>Expiration Date:</b> {html.escape(str(carrier_expiry))}", style)
                ],
                [
                    Paragraph(f"<b>Plate Number:</b> {html.escape(str(plate_number))}", style),
                    Paragraph(f"<b>CP #:</b> {html.escape(str(cp_number))}", style)
                ],
                [
                    Paragraph(f"<b>Origin:</b> {html.escape(str(origin_barangays))}", style),
                    Paragraph(f"<b>Destination:</b> {html.escape(str(destination))}", style)
                ],
                [
                    Paragraph("<b>Source Farm/s:</b> VARIOUS FARMS", style),
                    Paragraph(f"<b>Company Address:</b> {html.escape(str(company_address))}", style)
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
        _retry_pdf_task(
            generate_aic_pdf, "AIC", permit_application_id, current_attempt, e,
            extra_kwargs={"issued_by_user_id": issued_by_user_id},
        )


def get_ordinal_day(day: int) -> str:
    """Return ordinal day string e.g. 24th, 1st, 2nd, 3rd."""
    if 11 <= (day % 100) <= 13:
        suffix = 'th'
    else:
        suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')
    return f"{day}{suffix}"


@task()
def generate_mao_certificate_pdf(permit_application_id, current_attempt=1, issued_by_user_id=None):
    """
    Background task to generate an official Office of the Municipal Agriculturist (OMA / MAO)
    ASF-Free & Swine Health Monitoring Certification PDF.
    Matches the official physical certification layout from Municipality of Sariaya OMA.
    """
    try:
        with transaction.atomic():
            application = (
                PermitApplication.objects.select_related("farmer")
                .prefetch_related("origins__barangay")
                .get(pk=permit_application_id)
            )
            issued_permit = getattr(application, "issued_permit", None)

            # Ensure MAO Certificate number and issue timestamp on application
            if not application.mao_certificate_number:
                from apps.permits.services.numbers import get_mao_cert_number
                application.mao_certificate_number = get_mao_cert_number(application)
                application.mao_cert_issued_at = timezone.now()
                application.save(update_fields=["mao_certificate_number", "mao_cert_issued_at"])
            elif not application.mao_cert_issued_at:
                application.mao_cert_issued_at = timezone.now()
                application.save(update_fields=["mao_cert_issued_at"])

            if issued_permit and not issued_permit.mao_certificate_number:
                issued_permit.mao_certificate_number = application.mao_certificate_number
                issued_permit.save(update_fields=["mao_certificate_number"])

            # 1. Fetch municipal configuration or defaults
            # Signatory config — resolved per application/document type
            from apps.permits.services.signatory import resolve_signatory
            oic_name, oic_title = resolve_signatory(
                application, ApplicationSignatory.DocumentType.MAO_CERTIFICATE
            )

            # 2. Extract barangay origin(s)
            origins = list(application.origins.all())
            barangay_names = []
            for o in origins:
                b_name = o.barangay.name if o.barangay else ""
                if b_name and b_name not in barangay_names:
                    barangay_names.append(b_name.upper())

            if not barangay_names:
                barangays_display = "BRGY. LUTUAN BATA"
            elif len(barangay_names) == 1:
                barangays_display = f"BRGY. {barangay_names[0]}"
            elif len(barangay_names) == 2:
                barangays_display = f"BRGY. {barangay_names[0]} AND BRGY. {barangay_names[1]}"
            else:
                barangays_display = f"BARANGAYS {', '.join(barangay_names[:-1])} AND {barangay_names[-1]}"

            # 3. Identify encoder / processed by staff
            processed_by = "OMA - SARIAYA"
            if issued_by_user_id:
                try:
                    from apps.api.models import User
                    staff_user = User.objects.get(pk=issued_by_user_id)
                    name = staff_user.get_full_name() or staff_user.username
                    if name:
                        processed_by = name.upper()
                except Exception:
                    pass
            elif issued_permit and issued_permit.issued_by:
                name = issued_permit.issued_by.get_full_name() or issued_permit.issued_by.username
                if name:
                    processed_by = name.upper()

            # 4. Dates
            issue_date = application.mao_cert_issued_at or timezone.now()
            day_ordinal = get_ordinal_day(issue_date.day)
            month_name = issue_date.strftime("%B")
            year_str = issue_date.strftime("%Y")
            date_signed_str = issue_date.strftime("%m-%d-%y")

            # 5. Canvas setup
            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4

            PRIMARY_GREEN = PDF_GREEN
            TEXT_MAIN = PDF_TEXT_MAIN
            TEXT_MUTED = PDF_TEXT_MUTED

            # 6. Center Watermark
            watermark_logo = AGRI_LOGO if os.path.exists(AGRI_LOGO) else OFFICIAL_LOGO
            if os.path.exists(watermark_logo):
                p.saveState()
                p.setFillAlpha(0.08)
                wm_size = 13.0 * cm
                p.drawImage(
                    watermark_logo,
                    (width - wm_size) / 2,
                    (height - wm_size) / 2 - 1.0 * cm,
                    width=wm_size,
                    height=wm_size,
                    mask="auto",
                )
                p.restoreState()

            # 7. Letterhead Logos & Typography
            logo_size = 2.2 * cm
            header_top_y = height - 1.5 * cm

            if os.path.exists(OFFICIAL_LOGO):
                p.drawImage(
                    OFFICIAL_LOGO,
                    1.8 * cm,
                    header_top_y - 2.3 * cm,
                    width=logo_size,
                    height=logo_size,
                    mask="auto",
                )

            if os.path.exists(AGRI_LOGO):
                p.drawImage(
                    AGRI_LOGO,
                    width - 1.8 * cm - logo_size,
                    header_top_y - 2.3 * cm,
                    width=logo_size,
                    height=logo_size,
                    mask="auto",
                )

            p.setFillColor(TEXT_MUTED)
            p.setFont("Helvetica", 9)
            p.drawCentredString(width / 2, header_top_y - 0.5 * cm, "Republic of the Philippines")
            p.drawCentredString(width / 2, header_top_y - 0.95 * cm, "Region IV-A (CALABARZON)")
            p.drawCentredString(width / 2, header_top_y - 1.4 * cm, "Province of Quezon")
            p.setFont("Helvetica-Bold", 10.5)
            p.setFillColor(TEXT_MAIN)
            p.drawCentredString(width / 2, header_top_y - 1.9 * cm, "MUNICIPALITY OF SARIAYA")
            p.setFont("Helvetica-Bold", 11.5)
            p.setFillColor(PRIMARY_GREEN)
            p.drawCentredString(width / 2, header_top_y - 2.65 * cm, "OFFICE OF THE MUNICIPAL AGRICULTURIST")

            # Reference Number (left-aligned, subtle)
            ref_num = application.mao_certificate_number or "OMA-ANN-ASFCert-PENDING"
            p.setFillColor(colors.HexColor("#78716c"))
            p.setFont("Helvetica", 7.5)
            p.drawString(1.8 * cm, header_top_y - 3.4 * cm, ref_num)

            # 8. Document Title: CERTIFICATION
            p.setFillColor(TEXT_MAIN)
            p.setFont("Helvetica-Bold", 20)
            p.drawCentredString(width / 2, header_top_y - 4.6 * cm, "C E R T I F I C A T I O N")

            # 9. Body Paragraphs using ReportLab Flowable Paragraph for crisp justification & word-wrapping
            content_width = width - 4.4 * cm
            body_style = ParagraphStyle(
                'CertBody',
                fontName='Helvetica',
                fontSize=10.5,
                leading=17,
                textColor=TEXT_MAIN,
                alignment=4,  # Justified
                firstLineIndent=28,
            )

            current_y = header_top_y - 6.0 * cm

            # Paragraph 1
            p1_text = (
                f"This is to certify that <b>{html.escape(barangays_display)}, SARIAYA, QUEZON</b> "
                f"has no confirmed case of reportable swine diseases in the area, no reported case "
                f"of unusual swine mortalities, nor any suspected ASF case being investigated on "
                f"swine population within the farm."
            )
            para1 = Paragraph(p1_text, body_style)
            w1, h1 = para1.wrapOn(p, content_width, 10 * cm)
            current_y -= h1
            para1.drawOn(p, 2.2 * cm, current_y)
            current_y -= 0.9 * cm

            # Paragraph 2
            p2_text = (
                "This certification is issued as partial compliance to the requirements "
                "for the local transport of live pigs only from within the farm vicinity."
            )
            para2 = Paragraph(p2_text, body_style)
            w2, h2 = para2.wrapOn(p, content_width, 10 * cm)
            current_y -= h2
            para2.drawOn(p, 2.2 * cm, current_y)
            current_y -= 0.9 * cm

            # Paragraph 3
            p3_text = (
                f"Issued on this {day_ordinal} day of {month_name}, {year_str} at Sariaya, Quezon "
                f"for whatever legal purpose it may serve."
            )
            para3 = Paragraph(p3_text, body_style)
            w3, h3 = para3.wrapOn(p, content_width, 10 * cm)
            current_y -= h3
            para3.drawOn(p, 2.2 * cm, current_y)
            current_y -= 2.2 * cm

            # 10. Signatory Block (Right-aligned / Center-right)
            sig_x = width - 7.5 * cm
            p.setFillColor(TEXT_MAIN)
            p.setFont("Helvetica-Bold", 10)
            p.drawString(sig_x, current_y, "Signed:")
            current_y -= 1.8 * cm

            p.setFont("Helvetica-Bold", 10.5)
            p.drawString(sig_x, current_y, oic_name.upper())
            current_y -= 0.45 * cm
            p.setFont("Helvetica", 9.5)
            p.drawString(sig_x, current_y, oic_title)
            current_y -= 0.45 * cm
            p.drawString(sig_x, current_y, f"Date Signed: {date_signed_str}")

            # 11. Verification QR Code (Bottom-right)
            qr_token = getattr(issued_permit, "qr_token", None) or str(application.application_id)
            qr_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/inspector/verify/{qr_token}"
            qr_img = qrcode.make(qr_url)
            qr_buffer = BytesIO()
            qr_img.save(qr_buffer, format="PNG")
            qr_buffer.seek(0)
            qr_reader = ImageReader(qr_buffer)
            qr_size = 2.4 * cm
            qr_x = width - 2.2 * cm - qr_size
            qr_y = 2.0 * cm
            p.drawImage(qr_reader, qr_x, qr_y, width=qr_size, height=qr_size)

            # 12. Encoder Block (Bottom-left)
            p.setFillColor(TEXT_MAIN)
            p.setFont("Helvetica-Bold", 7.5)
            p.drawString(2.2 * cm, 2.9 * cm, f"ENCODED BY: {processed_by}")
            p.setFont("Helvetica", 7.5)
            p.drawString(2.2 * cm, 2.5 * cm, "OMA -SARIAYA")

            # 13. Footer Address / Email (Bottom-center)
            p.setFillColor(TEXT_MUTED)
            p.setFont("Helvetica", 7)
            p.drawCentredString(width / 2, 1.5 * cm, "Municipal Hall, Mabini St., Poblacion 6, Sariaya, Quezon 4322")
            p.drawCentredString(width / 2, 1.15 * cm, "agriculture_sariaya@yahoo.com")

            p.showPage()
            p.save()

            buffer.seek(0)
            filename = f"MAO_Certificate_{application.application_id}.pdf"
            application.mao_certificate_pdf.save(filename, File(buffer), save=True)
            if issued_permit:
                buffer.seek(0)
                issued_permit.mao_certificate_number = application.mao_certificate_number
                issued_permit.mao_certificate_pdf.save(filename, File(buffer), save=True)

            logger.info(f"Successfully generated MAO Certificate PDF for application {permit_application_id}")
            return f"MAO Certificate PDF Generated: {filename}"

    except PermitApplication.DoesNotExist:
        logger.error(f"PermitApplication {permit_application_id} not found.")
    except Exception as e:
        _retry_pdf_task(
            generate_mao_certificate_pdf, "MAO Certificate", permit_application_id, current_attempt, e,
            extra_kwargs={"issued_by_user_id": issued_by_user_id},
        )

