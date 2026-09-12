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

from apps.documents.services import make_numbered_canvas

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

    date_range_str = (
        f"{start_date.strftime('%B %d, %Y')} — {end_date.strftime('%B %d, %Y')}"
    )
    if start_date == end_date:
        date_range_str = start_date.strftime("%B %d, %Y")

    pdf = OfficialMemorandumPDF()
    p, width, height = pdf.p, pdf.width, pdf.height
    PRIMARY_GREEN, TEXT_MAIN = PDF_GREEN, PDF_TEXT_MAIN
    TEXT_MUTED, BORDER_COLOR = PDF_TEXT_MUTED, PDF_BORDER_COLOR
    ACCENT_BG = PDF_ACCENT_BG
    pdf.draw_header("COLLECTION SUMMARY REPORT", date_range_str, PRIMARY_GREEN, requesting_user)

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

# Signatory Block, footer, and finalize
    pdf.draw_signatories(
        prepared_by_role="Revenue Collector / Agri Staff",
        certified_label="Certified Correct By:",
        certified_name="DR. RENATO C. ALPAY",
        certified_role="Municipal Veterinarian / Agri Officer",
        third_label="Noted By:",
        third_name="GLORIA M. VALBUENA",
        third_role="Municipal Treasurer",
        sig_y=current_y,
    )
    return pdf.finalize(
        f"Generated by FarmPass System on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}"
    )

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

    date_range_str = (
        f"{start_date.strftime('%B %d, %Y')} — {end_date.strftime('%B %d, %Y')}"
    )
    if start_date == end_date:
        date_range_str = start_date.strftime("%B %d, %Y")

    pdf = OfficialMemorandumPDF()
    p, width, height = pdf.p, pdf.width, pdf.height
    PRIMARY_PURPLE, TEXT_MAIN = PDF_PURPLE, PDF_TEXT_MAIN
    TEXT_MUTED, BORDER_COLOR = PDF_TEXT_MUTED, PDF_BORDER_COLOR
    ACCENT_BG = PDF_ACCENT_BG
    pdf.from_name = "FIELD SERVICE OFFICER"
    pdf.draw_header("INSPECTION SUMMARY REPORT", date_range_str, PRIMARY_PURPLE, requesting_user)

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

    # Signatory Block, footer, and finalize
    pdf.draw_signatories(
        prepared_by_role="Livestock Inspector / Agri Officer",
        certified_label="Verified By:",
        certified_name="DR. RENATO C. ALPAY",
        certified_role="Municipal Veterinarian / Agri Officer",
        third_label="Approved By:",
        third_name="ENGR. LEONARDO R. ABUSTAN",
        third_role="Municipal Agriculturist",
        sig_y=current_y,
    )
    return pdf.finalize(
        f"Official Audit Document • Generated {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}"
    )

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

    date_range_str = (
        f"{start_date.strftime('%B %d, %Y')} — {end_date.strftime('%B %d, %Y')}"
    )
    if start_date == end_date:
        date_range_str = start_date.strftime("%B %d, %Y")

    pdf = OfficialMemorandumPDF()
    p, width, height = pdf.p, pdf.width, pdf.height
    PRIMARY_GREEN, TEXT_MAIN = PDF_GREEN, PDF_TEXT_MAIN
    TEXT_MUTED, BORDER_COLOR = PDF_TEXT_MUTED, PDF_BORDER_COLOR
    ACCENT_BG = PDF_ACCENT_BG
    pdf.from_name = "ADMINISTRATIVE OFFICER"
    pdf.draw_header("PERMIT ISSUANCE SUMMARY REPORT", date_range_str, PRIMARY_GREEN, requesting_user)

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

    # Signatory Block, footer, and finalize
    pdf.draw_signatories(
        prepared_by_role="Livestock Division Staff / Agri Officer",
        certified_label="Certified Correct By:",
        certified_name="DR. RENATO C. ALPAY",
        certified_role="Municipal Veterinarian / Agri Officer",
        third_label="Approved By:",
        third_name="ENGR. LEONARDO R. ABUSTAN",
        third_role="Municipal Agriculturist",
        sig_y=current_y,
    )
    return pdf.finalize(
        f"Generated by FarmPass System on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}"
    )

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

def generate_formal_government_report_pdf(draft_data):
    """
    Renders an official Philippine LGU Memorandum & Accomplishment Report PDF
    using structured, formal civil service typography and layout.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=2.2 * cm,
        bottomMargin=2.0 * cm,
    )

    PRIMARY_GREEN = colors.HexColor("#166534")
    TEXT_MAIN = colors.HexColor("#1c1917")
    TEXT_MUTED = colors.HexColor("#57534e")
    BORDER_COLOR = colors.HexColor("#d6d3d1")
    BG_LIGHT = colors.HexColor("#f5f5f4")

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'FormalTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=15,
        alignment=1,
        textColor=PRIMARY_GREEN,
    )
    subtitle_style = ParagraphStyle(
        'FormalSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        alignment=1,
        textColor=TEXT_MUTED,
    )
    section_head_style = ParagraphStyle(
        'SectionHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=PRIMARY_GREEN,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        'FormalBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=TEXT_MAIN,
    )
    memo_label_style = ParagraphStyle(
        'MemoLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_MAIN,
    )
    memo_val_style = ParagraphStyle(
        'MemoVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_MAIN,
    )
    bullet_style = ParagraphStyle(
        'FormalBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_MAIN,
        leftIndent=15,
        firstLineIndent=-10,
    )

    # 1. Header with Dual Logos
    ASSET_DIR = os.path.join(settings.BASE_DIR.parent, "asset")
    OFFICIAL_LOGO = os.path.join(ASSET_DIR, "sariaya-official-logo.jpg")
    AGRI_LOGO = os.path.join(ASSET_DIR, "sariaya-agri-logo.jpg")

    logo_w = 1.8 * cm
    official_img = Image(OFFICIAL_LOGO, width=logo_w, height=logo_w) if os.path.exists(OFFICIAL_LOGO) else ""
    agri_img = Image(AGRI_LOGO, width=logo_w, height=logo_w) if os.path.exists(AGRI_LOGO) else ""

    center_header = [
        Paragraph("Republic of the Philippines", subtitle_style),
        Paragraph("Province of Quezon", subtitle_style),
        Paragraph("<b>MUNICIPALITY OF SARIAYA</b>", ParagraphStyle('Muni', parent=subtitle_style, fontName='Helvetica-Bold', fontSize=10, textColor=TEXT_MAIN)),
        Paragraph("<b>OFFICE OF THE MUNICIPAL AGRICULTURIST</b>", ParagraphStyle('Off', parent=subtitle_style, fontName='Helvetica-Bold', fontSize=11, textColor=PRIMARY_GREEN)),
    ]

    header_table = Table(
        [[official_img, center_header, agri_img]],
        colWidths=[2.2 * cm, 13.6 * cm, 2.2 * cm],
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))

    story = [
        header_table,
        Spacer(1, 4),
    ]

    divider = Table([[""]], colWidths=[18 * cm], rowHeights=[2])
    divider.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_GREEN),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(divider)
    story.append(Spacer(1, 8))

    doc_title = draft_data.get("report_title", "MEMORANDUM REPORT").upper()
    story.append(Paragraph(f"<b>{doc_title}</b>", title_style))
    period_str = draft_data.get("period_str", "")
    if period_str:
        story.append(Paragraph(f"REPORTING PERIOD: <b>{period_str.upper()}</b>", subtitle_style))
    story.append(Spacer(1, 8))

    trans = draft_data.get("transmittal", {})
    legal_bases_text = str(trans.get("legal_bases", "")).replace("\n", "<br/>")

    memo_data = [
        [Paragraph("<b>MEMORANDUM FOR:</b>", memo_label_style), Paragraph(str(trans.get("memo_for", "HON. MARCELO P. GAYETA, Municipal Mayor")), memo_val_style)],
        [Paragraph("<b>THROUGH:</b>", memo_label_style), Paragraph(str(trans.get("memo_through", "ENGR. LEONARDO R. ABUSTAN, Municipal Agriculturist")), memo_val_style)],
        [Paragraph("<b>FROM:</b>", memo_label_style), Paragraph(str(trans.get("memo_from", "Livestock Regulatory Staff")), memo_val_style)],
        [Paragraph("<b>DATE:</b>", memo_label_style), Paragraph(str(trans.get("date", timezone.now().strftime("%B %d, %Y"))), memo_val_style)],
        [Paragraph("<b>SUBJECT:</b>", memo_label_style), Paragraph(f"<b>{trans.get('subject', 'ACCOMPLISHMENT REPORT')}</b>", memo_val_style)],
        [Paragraph("<b>LEGAL BASES:</b>", memo_label_style), Paragraph(legal_bases_text, memo_val_style)],
    ]

    memo_table = Table(memo_data, colWidths=[4.2 * cm, 13.8 * cm])
    memo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(memo_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("I. EXECUTIVE SUMMARY", section_head_style))
    exec_summary = str(draft_data.get("executive_summary", "")).replace("\n", "<br/>")
    story.append(Paragraph(exec_summary, body_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("II. BIOSECURITY & REGULATORY COMPLIANCE", section_head_style))
    biosecurity = str(draft_data.get("biosecurity_findings", "")).replace("\n", "<br/>")
    story.append(Paragraph(biosecurity, body_style))
    story.append(Spacer(1, 10))

    key_metrics = draft_data.get("key_metrics", [])
    if key_metrics:
        km_data = [["METRIC DESCRIPTION", "REPORTED VALUE"]]
        for km in key_metrics:
            km_data.append([str(km.get("label", "")), str(km.get("value", ""))])
        km_table = Table(km_data, colWidths=[12 * cm, 6 * cm])
        km_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_GREEN),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(km_table)
        story.append(Spacer(1, 12))

    headers = draft_data.get("evidence_table_headers", ["COL 1", "COL 2", "COL 3", "COL 4"])
    rows = draft_data.get("evidence_table_rows", [])
    if rows:
        story.append(Paragraph("III. STATISTICAL BREAKDOWN & MOVEMENT EVIDENCE", section_head_style))
        ev_data = [headers]
        for r in rows:
            ev_data.append([str(r.get("col1", "")), str(r.get("col2", "")), str(r.get("col3", "")), str(r.get("col4", ""))])
        ev_table = Table(ev_data, colWidths=[6.5 * cm, 4.0 * cm, 4.0 * cm, 3.5 * cm])
        ev_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#292524")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(ev_table)
        story.append(Spacer(1, 12))

    obs = draft_data.get("operational_observations", [])
    if obs:
        story.append(Paragraph("IV. OPERATIONAL OBSERVATIONS & VERIFICATIONS", section_head_style))
        for o in obs:
            story.append(Paragraph(f"• &nbsp; {str(o)}", bullet_style))
        story.append(Spacer(1, 10))

    recs = draft_data.get("recommendations", [])
    if recs:
        story.append(Paragraph("V. POLICY RECOMMENDATIONS & ACTION ITEMS", section_head_style))
        for idx, r in enumerate(recs, start=1):
            story.append(Paragraph(f"<b>{idx}.</b> &nbsp; {str(r)}", bullet_style))
        story.append(Spacer(1, 14))

    sigs = draft_data.get("signatories", {})
    prep_name = sigs.get("prepared_by_name", "LIVESTOCK REGULATORY STAFF")
    prep_title = sigs.get("prepared_by_title", "Livestock Inspector / Agri Officer")
    ver_name = sigs.get("verified_by_name", "DR. RENATO C. ALPAY")
    ver_title = sigs.get("verified_by_title", "Municipal Veterinarian / Agri Officer")
    app_name = sigs.get("approved_by_name", "ENGR. LEONARDO R. ABUSTAN")
    app_title = sigs.get("approved_by_title", "Municipal Agriculturist")

    sig_cell_prep = [
        Paragraph("<b>Prepared by:</b>", memo_label_style),
        Spacer(1, 20),
        Paragraph(f"<b>{str(prep_name).upper()}</b>", memo_label_style),
        Paragraph(str(prep_title), subtitle_style),
    ]
    sig_cell_ver = [
        Paragraph("<b>Certified Correct:</b>", memo_label_style),
        Spacer(1, 20),
        Paragraph(f"<b>{str(ver_name).upper()}</b>", memo_label_style),
        Paragraph(str(ver_title), subtitle_style),
    ]
    sig_cell_app = [
        Paragraph("<b>Approved by:</b>", memo_label_style),
        Spacer(1, 20),
        Paragraph(f"<b>{str(app_name).upper()}</b>", memo_label_style),
        Paragraph(str(app_title), subtitle_style),
    ]

    sig_table = Table(
        [[sig_cell_prep, sig_cell_ver, sig_cell_app]],
        colWidths=[6.0 * cm, 6.0 * cm, 6.0 * cm],
    )
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 14))

    cf = draft_data.get("copy_furnished", [])
    if cf:
        cf_lines = "<br/>".join(f"- &nbsp; {str(c)}" for c in cf)
        cf_para = Paragraph(f"<b>Copy Furnished:</b><br/>{cf_lines}", ParagraphStyle('CF', parent=subtitle_style, fontSize=7.5, leading=11, textColor=TEXT_MUTED, alignment=0))
        story.append(cf_para)

    canvas_factory = make_numbered_canvas(
        report_title=doc_title,
        report_subtitle=doc_title,
        date_range_str=period_str,
        footer_text=f"Official LGU Memorandum • Generated by FarmPass System on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
        primary_color=PRIMARY_GREEN,
    )

    doc.build(story, canvasmaker=canvas_factory)
    buffer.seek(0)
    return buffer

