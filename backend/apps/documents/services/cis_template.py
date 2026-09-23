"""Blank CIS (Certificate of Immediate Slaughter) form PDF generation.

Builds the standardized barangay CIS form: a single-page A4 document with
the barangay name pre-filled and every data field left as an underlined
blank for the barangay official to handwrite. Mirrors the printed boilerplate
of the sampled barangay-issued certificate.
"""

from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

BODY_FONT = "Times-Roman"
BODY_BOLD = "Times-Bold"

# Blank widths on the body lines, in points.
WORD_BLANK = 4.4 * cm
DIGIT_BLANK = 1.6 * cm
ORIGIN_BLANK = 6.4 * cm
DATE_BLANK = 3.2 * cm
DESTINATION_BLANK = 5.2 * cm


def _draw_centered(p, y, text, font=BODY_FONT, size=11):
    p.setFont(font, size)
    p.drawCentredString(A4[0] / 2, y, text)
    return y - (size * 1.5)


def generate_cis_template(barangay_name: str) -> bytes:
    """Return PDF bytes for a blank CIS form pre-filled with the barangay name."""
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    p.setTitle("Certificate of Immediate Slaughter for Slaughter Animals")
    p.setAuthor("FarmPass - Municipal Agriculture Office")
    p.setFillColorRGB(0, 0, 0)
    p.setStrokeColorRGB(0, 0, 0)

    y = height - 1.6 * cm

    # Letterhead block
    y = _draw_centered(p, y, "Republic of the Philippines", size=9)
    y = _draw_centered(p, y, "MUNICIPALITY OF SARIAYA", font=BODY_BOLD, size=11)
    y = _draw_centered(p, y, "Province of Quezon", size=9)
    rule_width = 9 * cm
    p.line((width - rule_width) / 2, y - 0.15 * cm, (width + rule_width) / 2, y - 0.15 * cm)
    y -= 0.9 * cm

    # Title
    y = _draw_centered(p, y, "CERTIFICATE OF IMMEDIATE SLAUGHTER", font=BODY_BOLD, size=17)
    y = _draw_centered(p, y, "FOR SLAUGHTER ANIMALS", font=BODY_BOLD, size=17)
    y -= 0.3 * cm
    y = _draw_centered(p, y, f"Barangay {barangay_name}, Sariaya, Quezon", font=BODY_BOLD, size=13)
    y -= 1.5 * cm

    # Body paragraph: each field is an underlined blank. Lines are centered as a
    # block so the certificate reads symmetrically on the page.
    p.setFont(BODY_FONT, 14)
    line_height = 1.0 * cm

    line_width = p.stringWidth("This is to certify that ", BODY_FONT, 14)
    line1_total = line_width + WORD_BLANK + p.stringWidth("  (", BODY_FONT, 14) + DIGIT_BLANK + p.stringWidth(") of swine", BODY_FONT, 14)
    x = (width - line1_total) / 2
    p.drawString(x, y, "This is to certify that ")
    x += line_width
    p.line(x, y - 2, x + WORD_BLANK, y - 2)
    x += WORD_BLANK
    p.drawString(x, y, "  (")
    x += p.stringWidth("  (", BODY_FONT, 14)
    p.line(x, y - 2, x + DIGIT_BLANK, y - 2)
    x += DIGIT_BLANK
    p.drawString(x, y, ") of swine")
    y -= line_height

    line2_total = p.stringWidth("from ", BODY_FONT, 14) + ORIGIN_BLANK + p.stringWidth(" shipped on ", BODY_FONT, 14) + DATE_BLANK
    x = (width - line2_total) / 2
    p.drawString(x, y, "from ")
    x += p.stringWidth("from ", BODY_FONT, 14)
    p.line(x, y - 2, x + ORIGIN_BLANK, y - 2)
    x += ORIGIN_BLANK
    p.drawString(x, y, " shipped on ")
    x += p.stringWidth(" shipped on ", BODY_FONT, 14)
    p.line(x, y - 2, x + DATE_BLANK, y - 2)
    y -= line_height

    line3_total = p.stringWidth("to ", BODY_FONT, 14) + DESTINATION_BLANK + p.stringWidth(" are for immediate slaughter within", BODY_FONT, 14)
    x = (width - line3_total) / 2
    p.drawString(x, y, "to ")
    x += p.stringWidth("to ", BODY_FONT, 14)
    p.line(x, y - 2, x + DESTINATION_BLANK, y - 2)
    x += DESTINATION_BLANK
    p.drawString(x, y, " are for immediate slaughter within")
    y -= line_height

    y = _draw_centered(p, y, "twenty-four (24) hours.", size=14)
    y -= 2.0 * cm

    # Signature block
    sig_width = 8 * cm
    sig_x = 1.6 * cm
    p.line(sig_x, y - 2, sig_x + sig_width, y - 2)
    y -= 0.45 * cm
    p.setFont(BODY_BOLD, 10)
    p.drawString(sig_x, y, "PROPRIETOR / SHIPPER")
    y -= 0.45 * cm
    p.line(sig_x, y - 2, sig_x + sig_width, y - 2)
    y -= 0.7 * cm

    # Footer
    p.setFont(BODY_FONT, 9)
    p.drawCentredString(width / 2, 1.4 * cm, "This certificate is valid for twenty-four (24) hours from the date of shipment.")

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer.getvalue()