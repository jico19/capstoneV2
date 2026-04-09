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
from apps.permits.models import IssuedPermit
from django.db import transaction

@task()
def generate_permit_pdf(permit_id):
    try:
        with transaction.atomic():
            permit = get_object_or_404(
                IssuedPermit, pk=permit_id
            )

            application = permit.application
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
                ('Permit No',           permit.permit_number),
                ('Farmer Name',         application.farmer.get_full_name() or "N/A"),
                ('Origin Barangay',     application.origin_barangay.name),
                ('Destination',         application.destination),
                ('Number of Pigs',      str(application.number_of_pigs)),
                ('Transport Date',      application.transport_date.strftime('%B %d, %Y')),
                ('Purpose',             application.purpose or '—'),
                ('Issued By',           permit.issued_by.get_full_name() if permit.issued_by else 'System'),
                ('Date Issued',         permit.date_issued.strftime('%B %d, %Y')),
                ('Valid Until',         permit.valid_until.strftime('%B %d, %Y')),
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
            qr_url  = f"{settings.FRONTEND_URL}/verify/{permit.qr_token}"
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
                f'Verify at: {settings.FRONTEND_URL}/verify/{permit.qr_token}')
            p.drawCentredString(width / 2, 1.2*cm,
                'Sariaya Municipal Agriculture Office — Sariaya, Quezon')

            p.showPage()
            p.save()

            buffer.seek(0)

            # Save PDF to permit model
            filename = f"permit_{permit.qr_token}.pdf"
            permit.permit_pdf.save(filename, File(buffer), save=True)

            return f"Permit PDF generated and saved for ID: {permit.id}"
    except Exception as e:
        # Handle the case where the permit hasn't hit the DB yet
        raise e
