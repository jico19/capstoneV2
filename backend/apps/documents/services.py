# services/permit_generator.py

from io import BytesIO
from django.core.files import File
from django.conf import settings
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Table, TableStyle
import qrcode
from django.tasks import task
from django.shortcuts import get_object_or_404
from apps.permits.models import PermitApplication, IssuedPermit
from apps.payment.models import PaymentHistory
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum

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
            p.drawString(2*cm, height - 4.1*cm, "SARIAYA MUNICULTURE OFFICE • QUEZON PROVINCE")

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


def generate_collection_report_pdf(start_date, end_date):
    """
    Generates a PDF report of all successful payments between two dates.
    """
    payments = PaymentHistory.objects.filter(
        status=PaymentHistory.Status.SUCCESS,
        created_at__date__range=[start_date, end_date]
    ).select_related('issued_permit__application__farmer').order_by('created_at')

    total_amount = payments.aggregate(Sum('amount'))['amount__sum'] or 0

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Branding Colors
    PRIMARY_GREEN = colors.HexColor('#166534')
    TEXT_DARK = colors.HexColor('#111827')

    # Header
    p.setFillColor(PRIMARY_GREEN)
    p.rect(0, height - 3*cm, width, 3*cm, fill=True, stroke=False)
    
    p.setFillColor(colors.white)
    p.setFont('Helvetica-Bold', 18)
    p.drawString(1*cm, height - 1.2*cm, "SARIAYA MUNICIPAL AGRICULTURE OFFICE")
    
    p.setFont('Helvetica', 10)
    date_range_str = f"{start_date.strftime('%b %d, %Y')} — {end_date.strftime('%b %d, %Y')}"
    if start_date == end_date:
        date_range_str = start_date.strftime('%B %d, %Y')
        
    p.drawString(1*cm, height - 1.8*cm, "COLLECTION REPORT")
    p.setFont('Helvetica-Bold', 10)
    p.drawString(1*cm, height - 2.4*cm, f"PERIOD: {date_range_str.upper()}")

    # Table Data
    data = [["REF #", "FARMER", "GATEWAY", "DATE", "AMOUNT"]]
    for pay in payments:
        data.append([
            f"TRX-{pay.id}",
            pay.issued_permit.application.farmer.get_full_name().upper()[:20],
            pay.method.upper(),
            pay.created_at.strftime('%Y-%m-%d'),
            f"P{pay.amount:,.2f}"
        ])

    # Summary Row
    data.append(["", "", "", "TOTAL:", f"P{total_amount:,.2f}"])

    # Table Styling
    table = Table(data, colWidths=[3*cm, 7*cm, 3*cm, 3*cm, 3*cm])
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, -1), (-1, -1), colors.whitesmoke),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -2), 0.5, colors.grey),
        ('ALIGN', (4, 1), (4, -1), 'RIGHT'),
    ])
    table.setStyle(style)

    # Place Table
    tw, th = table.wrapOn(p, width, height)
    # Check for overflow (simplification: assume 1 page for demo)
    table.drawOn(p, 1*cm, height - 5*cm - th)

    # Footer
    p.setFillColor(colors.grey)
    p.setFont('Helvetica-Oblique', 8)
    p.drawString(1*cm, 1*cm, f"Generated by LivestockPass System on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    p.showPage()
    p.save()

    buffer.seek(0)
    return buffer


def generate_inspector_report_pdf(start_date, end_date):
    """
    Generates a PDF report of all field verifications performed by inspectors.
    """
    from apps.inspector.models import InspectorLogs
    logs = InspectorLogs.objects.filter(
        scanned_at__date__range=[start_date, end_date]
    ).select_related('inspector', 'application__farmer').order_by('-scanned_at')

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Branding Colors
    PRIMARY_PURPLE = colors.HexColor('#6b21a8') # High contrast purple
    TEXT_DARK = colors.HexColor('#111827')

    # Header
    p.setFillColor(PRIMARY_PURPLE)
    p.rect(0, height - 3*cm, width, 3*cm, fill=True, stroke=False)
    
    p.setFillColor(colors.white)
    p.setFont('Helvetica-Bold', 18)
    p.drawString(1*cm, height - 1.2*cm, "SARIAYA MUNICIPAL FIELD VERIFICATION")
    
    p.setFont('Helvetica', 10)
    date_range_str = f"{start_date.strftime('%b %d, %Y')} — {end_date.strftime('%b %d, %Y')}"
    p.drawString(1*cm, height - 1.8*cm, "INSPECTOR DUTY LOGS")
    p.setFont('Helvetica-Bold', 10)
    p.drawString(1*cm, height - 2.4*cm, f"AUDIT PERIOD: {date_range_str.upper()}")

    # Table Data
    data = [["ID", "INSPECTOR", "FARMER", "TIMESTAMP", "REMARKS"]]
    for log in logs:
        data.append([
            f"LOG-{log.id}",
            log.inspector.username.upper(),
            log.application.farmer.get_full_name().upper()[:15],
            log.scanned_at.strftime('%Y-%m-%d %H:%M'),
            (log.notes[:30] + '...') if len(log.notes) > 30 else (log.notes or "VERIFIED")
        ])

    # Table Styling
    table = Table(data, colWidths=[2.5*cm, 3.5*cm, 4.5*cm, 4*cm, 4.5*cm])
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_PURPLE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ])
    table.setStyle(style)

    tw, th = table.wrapOn(p, width, height)
    table.drawOn(p, 1*cm, height - 4.5*cm - th)

    # Footer
    p.setFillColor(colors.grey)
    p.setFont('Helvetica-Oblique', 8)
    p.drawString(1*cm, 1*cm, f"Official Audit Document • Generated {timezone.now().strftime('%Y-%m-%d')}")
    
    p.showPage()
    p.save()

    buffer.seek(0)
    return buffer


def generate_permit_issuance_report_pdf(start_date, end_date):
    """
    Generates a PDF list of all issued permits in a given date range.
    Shows permit number, farmer name, origin, destination, and pig count.
    """
    permits = IssuedPermit.objects.filter(
        date_issued__range=[start_date, end_date]
    ).select_related('application__farmer').prefetch_related('application__origins__barangay').order_by('-date_issued')

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    PRIMARY_GREEN = colors.HexColor('#166534')
    TEXT_DARK = colors.HexColor('#111827')

    # Header block
    p.setFillColor(PRIMARY_GREEN)
    p.rect(0, height - 3*cm, width, 3*cm, fill=True, stroke=False)

    p.setFillColor(colors.white)
    p.setFont('Helvetica-Bold', 18)
    p.drawString(1*cm, height - 1.2*cm, "SARIAYA MUNICIPAL AGRICULTURE OFFICE")

    p.setFont('Helvetica', 10)
    date_range_str = f"{start_date.strftime('%b %d, %Y')} — {end_date.strftime('%b %d, %Y')}"
    if start_date == end_date:
        date_range_str = start_date.strftime('%B %d, %Y')

    p.drawString(1*cm, height - 1.8*cm, "PERMIT ISSUANCE SUMMARY")
    p.setFont('Helvetica-Bold', 10)
    p.drawString(1*cm, height - 2.4*cm, f"PERIOD: {date_range_str.upper()}")

    # Build table rows: one row per issued permit
    data = [["PERMIT #", "FARMER", "ORIGIN", "DESTINATION", "HEADS", "DATE"]]
    for issued in permits:
        application = issued.application
        origins = application.origins.all()

        # Summarize the origin: one barangay, or "Multiple" if more than one
        if origins.count() == 1:
            origin_label = origins.first().barangay.name
        else:
            origin_label = f"Multiple ({origins.count()})"

        # Sum total pigs across all origins
        total_pigs = sum(o.number_of_pigs for o in origins)

        data.append([
            issued.permit_number,
            application.farmer.get_full_name().upper()[:18],
            origin_label[:16],
            application.destination[:16],
            str(total_pigs),
            issued.date_issued.strftime('%Y-%m-%d'),
        ])

    total_permits = len(data) - 1  # exclude header row
    data.append(["", "", "", f"TOTAL: {total_permits} permits", "", ""])

    table = Table(data, colWidths=[3.5*cm, 4.5*cm, 3.5*cm, 3.5*cm, 1.5*cm, 3*cm])
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('GRID', (0, 0), (-1, -2), 0.5, colors.HexColor('#e5e7eb')),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (4, 0), (4, -1), 'CENTER'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f3f4f6')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('ALIGN', (3, -1), (3, -1), 'RIGHT'),
    ])
    table.setStyle(style)

    tw, th = table.wrapOn(p, width - 2*cm, height)
    table.drawOn(p, 1*cm, height - 4.5*cm - th)

    p.setFillColor(colors.grey)
    p.setFont('Helvetica-Oblique', 8)
    p.drawString(1*cm, 1*cm, f"Generated by LivestockPass System on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer


def generate_barangay_distribution_pdf(start_date, end_date):
    """
    Generates a PDF showing livestock movement volume (total pigs) per origin barangay
    for a given date range.
    """
    from apps.permits.models import TransportOrigin
    from django.db.models import Sum, Count

    # Count all transported pigs per origin barangay in the date range
    origin_stats = (
        TransportOrigin.objects
        .filter(application__created_at__date__range=[start_date, end_date])
        .values('barangay__name')
        .annotate(total_pigs=Sum('number_of_pigs'), total_applications=Count('application', distinct=True))
        .order_by('-total_pigs')
    )

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    ACCENT_BLUE = colors.HexColor('#1e3a5f')
    TEXT_DARK = colors.HexColor('#111827')

    # Header block
    p.setFillColor(ACCENT_BLUE)
    p.rect(0, height - 3*cm, width, 3*cm, fill=True, stroke=False)

    p.setFillColor(colors.white)
    p.setFont('Helvetica-Bold', 18)
    p.drawString(1*cm, height - 1.2*cm, "SARIAYA MUNICIPAL AGRICULTURE OFFICE")

    p.setFont('Helvetica', 10)
    date_range_str = f"{start_date.strftime('%b %d, %Y')} — {end_date.strftime('%b %d, %Y')}"
    if start_date == end_date:
        date_range_str = start_date.strftime('%B %d, %Y')

    p.drawString(1*cm, height - 1.8*cm, "BARANGAY VOLUME DISTRIBUTION")
    p.setFont('Helvetica-Bold', 10)
    p.drawString(1*cm, height - 2.4*cm, f"PERIOD: {date_range_str.upper()}")

    # Build table
    data = [["BARANGAY", "TOTAL APPLICATIONS", "TOTAL PIGS TRANSPORTED"]]
    grand_total_pigs = 0
    grand_total_apps = 0

    for stat in origin_stats:
        barangay_name = stat['barangay__name'] or 'Unknown'
        total_pigs = stat['total_pigs'] or 0
        total_apps = stat['total_applications'] or 0
        grand_total_pigs += total_pigs
        grand_total_apps += total_apps
        data.append([barangay_name.upper(), str(total_apps), str(total_pigs)])

    data.append(["TOTAL", str(grand_total_apps), str(grand_total_pigs)])

    table = Table(data, colWidths=[8*cm, 5*cm, 6*cm])
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -2), 0.5, colors.HexColor('#e5e7eb')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f3f4f6')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ])
    table.setStyle(style)

    tw, th = table.wrapOn(p, width - 2*cm, height)
    table.drawOn(p, 1*cm, height - 4.5*cm - th)

    p.setFillColor(colors.grey)
    p.setFont('Helvetica-Oblique', 8)
    p.drawString(1*cm, 1*cm, f"Generated by LivestockPass System on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer


def generate_permit_issuance_csv(start_date, end_date):
    """
    Generates a plain CSV of all issued permits in a given date range.
    Returns a string that can be streamed back as a file download.
    """
    import csv
    from io import StringIO

    permits = IssuedPermit.objects.filter(
        date_issued__range=[start_date, end_date]
    ).select_related('application__farmer').prefetch_related('application__origins__barangay').order_by('-date_issued')

    output = StringIO()
    writer = csv.writer(output)

    # CSV header row
    writer.writerow(["Permit Number", "Farmer Name", "Origin(s)", "Destination", "Total Pigs", "Transport Date", "Date Issued", "Valid Until"])

    for issued in permits:
        application = issued.application
        origins = application.origins.all()
        origin_names = ", ".join(o.barangay.name for o in origins)
        total_pigs = sum(o.number_of_pigs for o in origins)

        writer.writerow([
            issued.permit_number,
            application.farmer.get_full_name(),
            origin_names,
            application.destination,
            total_pigs,
            application.transport_date.strftime('%Y-%m-%d'),
            issued.date_issued.strftime('%Y-%m-%d'),
            issued.valid_until.strftime('%Y-%m-%d') if issued.valid_until else '',
        ])

    output.seek(0)
    return output
