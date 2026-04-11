# services/permit_generator.py

from io import BytesIO
from django.core.files import File
from django.conf import settings
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import qrcode
from django.tasks import task
from django.shortcuts import get_object_or_404
from apps.permits.models import PermitApplication, IssuedPermit
from django.utils import timezone
from django.db import transaction


@task()
def generate_permit_pdf(permit_application_id):
    try:
        with transaction.atomic():
            application_permit_instance = get_object_or_404(
                    PermitApplication,
                    pk=permit_application_id
                )
            issued_permit_instance = application_permit_instance.issued_permit
            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4

            # ── Background ──────────────────────────────
            p.setFillColor(colors.HexColor('#f0fff4'))  # light green tint
            p.rect(0, 0, width, height, fill=True, stroke=False)

            # ── Border ───────────────────────────────────
            p.setStrokeColor(colors.HexColor('#2d6a4f'))
            p.setLineWidth(3)
            p.rect(1*cm, 1*cm, width - 2*cm, height - 2*cm, fill=False)

            # ── Header ───────────────────────────────────
            p.setFillColor(colors.HexColor('#2d6a4f'))
            p.setFont('Helvetica-Bold', 11)
            p.drawCentredString(width / 2, height - 2*cm,   'Republic of the Philippines')
            p.drawCentredString(width / 2, height - 2.6*cm, 'Province of Quezon — Municipality of Sariaya')
            p.drawCentredString(width / 2, height - 3.2*cm, 'MUNICIPAL AGRICULTURE OFFICE')

            # ── Title ────────────────────────────────────
            p.setFont('Helvetica-Bold', 18)
            p.setFillColor(colors.HexColor('#1b4332'))
            p.drawCentredString(width / 2, height - 4.5*cm, 'LIVESTOCK TRANSPORT PERMIT')

            # ── Divider ──────────────────────────────────
            p.setStrokeColor(colors.HexColor('#2d6a4f'))
            p.setLineWidth(1.5)
            p.line(2*cm, height - 5*cm, width - 2*cm, height - 5*cm)


            # ── Details ──────────────────────────────────
            details = [
                ('Permit No',           issued_permit_instance.permit_number),
                ('Farmer Name',         application_permit_instance.farmer.get_full_name() or "N/A"),
                ('Origin Barangay',     application_permit_instance.origin_barangay.name),
                ('Destination',         application_permit_instance.destination),
                ('Number of Pigs',      str(application_permit_instance.number_of_pigs)),
                ('Transport Date',      application_permit_instance.transport_date.strftime('%B %d, %Y')),
                ('Purpose',             application_permit_instance.purpose or '—'),
                ('Issued By',           issued_permit_instance.issued_by.get_full_name() if issued_permit_instance.issued_by else 'System'),
                ('Date Issued',         issued_permit_instance.date_issued.strftime('%B %d, %Y')),
                ('Valid Until',         issued_permit_instance.valid_until.strftime('%B %d, %Y')),
            ]

            y = height - 7*cm
            for label, value in details:
                # Label box
                p.setFillColor(colors.HexColor('#d8f3dc'))
                p.rect(2*cm, y - 0.3*cm, 5*cm, 0.7*cm, fill=True, stroke=False)

                p.setFont('Helvetica-Bold', 9)
                p.setFillColor(colors.HexColor('#1b4332'))
                p.drawString(2.2*cm, y, label)

                # Value
                p.setFont('Helvetica', 9)
                p.setFillColor(colors.black)
                p.drawString(7.5*cm, y, value)

                y -= 1*cm

            # ── QR Code ──────────────────────────────────
            qr_url  = f"{settings.FRONTEND_URL}/verify/{issued_permit_instance.qr_token}"
            qr      = qrcode.QRCode(
                version  = 1,
                error_correction = qrcode.constants.ERROR_CORRECT_H,
                box_size = 8,
                border = 2,
            )
            qr.add_data(qr_url)
            qr.make(fit=True)
            qr_img      = qr.make_image(fill_color='black', back_color='white')

            qr_buffer   = BytesIO()
            qr_img.save(qr_buffer, format='PNG')
            qr_buffer.seek(0)

            qr_size = 4*cm
            qr_x    = width - 2*cm - qr_size
            qr_y    = height - 7*cm - qr_size

            p.drawImage(ImageReader(qr_buffer), qr_x, qr_y, width=qr_size, height=qr_size)

            p.setFont('Helvetica', 7)
            p.setFillColor(colors.grey)
            p.drawCentredString(qr_x + qr_size / 2, qr_y - 0.4*cm, 'Scan to verify')

            # ── Divider before footer ────────────────────
            p.setStrokeColor(colors.HexColor('#2d6a4f'))
            p.setLineWidth(1)
            p.line(2*cm, 4.5*cm, width - 2*cm, 4.5*cm)

            # ── Signature Line ───────────────────────────
            p.setFont('Helvetica', 9)
            p.setFillColor(colors.black)
            p.line(2*cm, 3.5*cm, 8*cm, 3.5*cm)
            p.drawString(2*cm, 3.1*cm, 'Authorized Signature')
            p.drawString(2*cm, 2.7*cm, 'Municipal Agriculture Officer')

            # ── Footer ───────────────────────────────────
            p.setFont('Helvetica', 7)
            p.setFillColor(colors.grey)
            p.drawCentredString(width / 2, 2*cm,
                'This permit is electronically generated and is valid without wet signature.')
            p.drawCentredString(width / 2, 1.6*cm,
                f'Verify at: {settings.FRONTEND_URL}/verify/{issued_permit_instance.qr_token}')
            p.drawCentredString(width / 2, 1.2*cm,
                'Sariaya Municipal Agriculture Office — Sariaya, Quezon')

            p.showPage()
            p.save()

            buffer.seek(0)

            # Save PDF to permit model
            filename = f"PERMIT_{issued_permit_instance.qr_token}.pdf"
            
            application_permit_instance.is_issued = True
            application_permit_instance.issued_at = timezone.now()
            application_permit_instance.save()
            
            issued_permit_instance.permit_pdf.save(filename, File(buffer), save=True)

            return f"Permit PDF generated and saved for ID: {application_permit_instance.id}"
    except Exception as e:
        raise e
