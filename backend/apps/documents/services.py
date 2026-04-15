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
            application = get_object_or_404(PermitApplication, pk=permit_application_id)
            issued_permit = application.issued_permit
            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4

            # --- Primary Color Palette ---
            PRIMARY_GREEN = colors.HexColor('#166534') # Tailwind Green-800
            BORDER_GRAY = colors.HexColor('#e5e7eb')  # Tailwind Gray-200
            TEXT_DARK = colors.HexColor('#111827')    # Tailwind Gray-900

            # 1. Clean Background (No tint for better printing)
            p.setFillColor(colors.white)
            p.rect(0, 0, width, height, fill=True, stroke=False)

            # 2. Left Accent Border (Official aesthetic)
            p.setFillColor(PRIMARY_GREEN)
            p.rect(0, 0, 0.8*cm, height, fill=True, stroke=False)

            # 3. Header Section (Top Right ID)
            p.setFillColor(TEXT_DARK)
            p.setFont('Helvetica-Bold', 8)
            p.drawRightString(width - 1.5*cm, height - 1.5*cm, f"SYSTEM REF: {application.application_id}")

            # 4. Main Title Block
            p.setFont('Helvetica-Bold', 22)
            p.drawString(2*cm, height - 3.5*cm, "LIVESTOCK TRANSPORT PERMIT")
            
            p.setFont('Helvetica', 10)
            p.setFillColor(colors.grey)
            p.drawString(2*cm, height - 4.1*cm, "SARIAYA MUNICIPAL AGRICULTURE OFFICE • QUEZON PROVINCE")

            # 5. The "Permit ID" Box (High visibility)
            p.setFillColor(PRIMARY_GREEN)
            p.rect(2*cm, height - 6*cm, 7*cm, 1.2*cm, fill=True, stroke=False)
            p.setFillColor(colors.white)
            p.setFont('Helvetica-Bold', 14)
            p.drawString(2.5*cm, height - 5.3*cm, issued_permit.permit_number)

            # 6. Details Grid Structure
            def draw_data_box(x, y, label, value, w=8*cm):
                # Flat box
                p.setStrokeColor(BORDER_GRAY)
                p.setLineWidth(0.5)
                p.rect(x, y, w, 1.2*cm, fill=False, stroke=True)
                # Label
                p.setFillColor(colors.grey)
                p.setFont('Helvetica-Bold', 7)
                p.drawString(x + 0.3*cm, y + 0.8*cm, label.upper())
                # Value
                p.setFillColor(TEXT_DARK)
                p.setFont('Helvetica-Bold', 10)
                p.drawString(x + 0.3*cm, y + 0.3*cm, str(value))

            # Row 1
            draw_data_box(2*cm, height - 8*cm, "Consignor (Farmer)", application.farmer.get_full_name() or "N/A", w=11*cm)
            draw_data_box(13.5*cm, height - 8*cm, "Pig Count", application.number_of_pigs, w=5*cm)

            # Row 2
            draw_data_box(2*cm, height - 9.5*cm, "Origin Barangay", application.origin_barangay.name, w=8*cm)
            draw_data_box(10.5*cm, height - 9.5*cm, "Target Destination", application.destination, w=8*cm)

            # Row 3
            draw_data_box(2*cm, height - 11*cm, "Transport Date", application.transport_date.strftime('%d %B %Y'), w=8*cm)
            draw_data_box(10.5*cm, height - 11*cm, "Valid Until", issued_permit.valid_until.strftime('%d %B %Y'), w=8*cm)

            # Row 4 (Purpose)
            draw_data_box(2*cm, height - 12.5*cm, "Authorized Purpose", application.purpose or "LIVESTOCK TRADE/TRANSPORT", w=16.5*cm)

            # 7. Verification Zone (Sidebar Box)
            p.setFillColor(colors.HexColor('#f9fafb'))
            p.rect(13*cm, 3*cm, 5.5*cm, 7*cm, fill=True, stroke=True)
            
            # QR Generation
            qr_url = f"{settings.FRONTEND_URL}/inspector/verify/{issued_permit.qr_token}"
            qr = qrcode.QRCode(version=1, box_size=10, border=1)
            qr.add_data(qr_url)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color='black', back_color='white')
            qr_buffer = BytesIO()
            qr_img.save(qr_buffer, format='PNG')
            qr_buffer.seek(0)

            p.drawImage(ImageReader(qr_buffer), 13.75*cm, 5*cm, width=4*cm, height=4*cm)
            
            p.setFillColor(TEXT_DARK)
            p.setFont('Helvetica-Bold', 8)
            p.drawCentredString(15.75*cm, 4.5*cm, "SECURE VERIFICATION")
            p.setFont('Helvetica', 6)
            p.drawCentredString(15.75*cm, 4.1*cm, "Scan using Inspector App")

            # 8. Signature Section
            p.setFillColor(TEXT_DARK)
            p.setFont('Helvetica-Bold', 10)
            p.drawString(2*cm, 5*cm, "APPROVED BY:")
            p.line(2*cm, 4*cm, 8*cm, 4*cm)
            p.setFont('Helvetica', 8)
            p.drawString(2*cm, 3.6*cm, "MUNICIPAL AGRICULTURE OFFICER")
            p.drawString(2*cm, 3.2*cm, f"Issued on: {issued_permit.date_issued.strftime('%Y-%m-%d')}")

            # 9. Footer Security Note
            p.setStrokeColor(PRIMARY_GREEN)
            p.setLineWidth(2)
            p.line(2*cm, 2*cm, width - 2*cm, 2*cm)
            
            p.setFillColor(colors.grey)
            p.setFont('Helvetica-Oblique', 7)
            p.drawString(2*cm, 1.5*cm, "This is a computer-generated document. Unauthorized alteration is punishable by law.")
            p.drawRightString(width - 2*cm, 1.5*cm, f"Token: {issued_permit.qr_token[:16]}...")

            p.showPage()
            p.save()

            buffer.seek(0)
            filename = f"PERMIT_{issued_permit.permit_number}.pdf"
            
            application.is_issued = True
            application.issued_at = timezone.now()
            application.save()
            
            issued_permit.permit_pdf.save(filename, File(buffer), save=True)

            return f"PDF Generated: {filename}"
    except Exception as e:
        raise e