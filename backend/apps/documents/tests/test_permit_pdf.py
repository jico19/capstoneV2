import uuid
from decimal import Decimal
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.maps.models import Barangay
from apps.permits.models import (
    ApplicationSignatory,
    IssuedPermit,
    PermitApplication,
    Signatory,
    TransportOrigin,
    MunicipalConfig,
    MaoCertNumberCounter,
)
from apps.permits.services.numbers import get_mao_cert_number
from apps.documents.services.permit_documents import (
    generate_aic_pdf,
    generate_permit_pdf,
    generate_mao_certificate_pdf,
)

import base64
import re
import zlib


def pdf_text(content):
    """
    Extract drawable strings from a ReportLab canvas PDF.

    ReportLab writes content streams as ASCII85 + Flate, so the signatory name
    cannot be found by searching the raw bytes.
    """
    text = ""
    for match in re.finditer(
        rb"/Filter \[ /ASCII85Decode /FlateDecode \][^>]*/Length (\d+)", content
    ):
        start = content.index(b"stream", match.end()) + 6
        while content[start:start + 1] in (b"\r", b"\n"):
            start += 1
        data = content[start:start + int(match.group(1))]
        try:
            decoded = base64.a85decode(data, adobe=True)
        except ValueError:
            stripped = data.strip()
            if stripped.endswith(b"~>"):
                stripped = stripped[:-2]
            decoded = base64.a85decode(stripped, adobe=False)
        text += zlib.decompress(decoded).decode("latin-1")
    return text

User = get_user_model()


@pytest.fixture
def test_setup(db):
    farmer = User.objects.create_user(
        username="pdf_farmer",
        first_name="Juan Miguel",
        last_name="Dela Cruz Santos Jr.",
        password="password123",
        role="Farmer",
        phone_no="09123456789",
    )
    agri = User.objects.create_user(
        username="pdf_agri",
        first_name="Amalita",
        last_name="Amores",
        password="password123",
        role="Agri",
    )
    b1 = Barangay.objects.create(name="Manggalang 1")
    b2 = Barangay.objects.create(name="Guisguis San Roque")
    b3 = Barangay.objects.create(name="Castañas")
    b4 = Barangay.objects.create(name="Concepcion Banahaw")
    b5 = Barangay.objects.create(name="Bignay 2")

    config, _ = MunicipalConfig.objects.get_or_create(
        defaults={
            "oic_name": "AMALITA C. AMORES",
            "oic_title": "OIC - Municipal Agriculturist",
            "validity_days": 3,
        }
    )

    return {
        "farmer": farmer,
        "agri": agri,
        "barangays": [b1, b2, b3, b4, b5],
        "config": config,
    }


@pytest.mark.django_db
def test_generate_permit_pdf_short_text(test_setup):
    farmer = test_setup["farmer"]
    agri = test_setup["agri"]
    b1 = test_setup["barangays"][0]

    app = PermitApplication.objects.create(
        farmer=farmer,
        status=PermitApplication.Status.PAYMENT_PENDING,
        destination="Lucena City",
        transport_date=timezone.now().date(),
        purpose="Slaughter",
    )
    TransportOrigin.objects.create(
        application=app,
        barangay=b1,
        number_of_pigs=10,
        fattener=10,
    )
    issued_permit = IssuedPermit.objects.create(
        permit_number=uuid.uuid4().hex[:13].upper(),
        application=app,
        issued_by=agri,
        qr_token=str(uuid.uuid4()),
        permit_fee=Decimal("150.00"),
    )

    result = generate_permit_pdf.func(app.pk)
    assert "PDF Generated" in result

    issued_permit.refresh_from_db()
    assert issued_permit.permit_pdf
    content = issued_permit.permit_pdf.read()
    assert content.startswith(b"%PDF-")


@pytest.mark.django_db
def test_generate_permit_pdf_long_text_does_not_break(test_setup):
    """
    Test with very long multi-origin barangays, an extensive destination address,
    and a verbose authorized purpose.
    Verifies that the PDF generator cleanly handles long text without throwing errors.
    """
    farmer = test_setup["farmer"]
    agri = test_setup["agri"]
    barangays = test_setup["barangays"]

    long_destination = (
        "Lucena City Public Slaughterhouse Compound, National Highway, "
        "Barangay Cotta, Lucena City, Quezon Province (Delivery Receiving Dock #4)"
    )
    long_purpose = (
        "Direct movement and commercial trade of market-ready slaughter fatteners and growers "
        "consigned to accredited meat processing facility and authorized livestock auction market."
    )

    app = PermitApplication.objects.create(
        farmer=farmer,
        status=PermitApplication.Status.PAYMENT_PENDING,
        destination=long_destination,
        transport_date=timezone.now().date(),
        purpose=long_purpose,
    )

    # Add 5 different origins with breakdown
    counts = [(2, 1, 5, 0, 0, 0), (0, 0, 4, 2, 0, 0), (1, 0, 3, 0, 1, 0), (0, 0, 2, 0, 0, 2), (0, 0, 5, 0, 0, 0)]
    for i, b in enumerate(barangays):
        ina, bar, fat, gro, bul, sta = counts[i]
        tot = ina + bar + fat + gro + bul + sta
        TransportOrigin.objects.create(
            application=app,
            barangay=b,
            number_of_pigs=tot,
            inahin=ina,
            barako=bar,
            fattener=fat,
            grower=gro,
            bulaw=bul,
            starter=sta,
        )

    issued_permit = IssuedPermit.objects.create(
        permit_number=uuid.uuid4().hex[:13].upper(),
        application=app,
        issued_by=agri,
        qr_token=str(uuid.uuid4()),
        permit_fee=Decimal("150.00"),
    )

    result = generate_permit_pdf.func(app.pk)
    assert "PDF Generated" in result

    issued_permit.refresh_from_db()
    assert issued_permit.permit_pdf
    content = issued_permit.permit_pdf.read()
    assert content.startswith(b"%PDF-")
    assert len(content) > 5000


@pytest.mark.django_db
def test_get_mao_cert_number(test_setup):
    today = timezone.localdate()
    date_str = today.strftime("%Y%m%d")
    cert_num_1 = get_mao_cert_number()
    assert cert_num_1 == f"OMA-ANN-ASFCert-{date_str}-01"
    cert_num_2 = get_mao_cert_number()
    assert cert_num_2 == f"OMA-ANN-ASFCert-{date_str}-02"


@pytest.mark.django_db
def test_generate_mao_certificate_pdf(test_setup):
    farmer = test_setup["farmer"]
    agri = test_setup["agri"]
    b1 = test_setup["barangays"][0]

    app = PermitApplication.objects.create(
        farmer=farmer,
        status=PermitApplication.Status.FORWARDED_TO_OPV,
        destination="Lucena City",
        transport_date=timezone.now().date(),
        purpose="Slaughter",
    )
    TransportOrigin.objects.create(
        application=app,
        barangay=b1,
        number_of_pigs=10,
        fattener=10,
    )
    issued_permit = IssuedPermit.objects.create(
        permit_number=uuid.uuid4().hex[:13].upper(),
        application=app,
        issued_by=agri,
        qr_token=str(uuid.uuid4()),
        permit_fee=Decimal("150.00"),
    )

    result = generate_mao_certificate_pdf.func(app.pk, issued_by_user_id=agri.pk)
    assert "MAO Certificate PDF Generated" in result

    app.refresh_from_db()
    assert app.mao_certificate_number.startswith("OMA-ANN-ASFCert-")
    assert app.mao_certificate_pdf
    content = app.mao_certificate_pdf.read()
    assert content.startswith(b"%PDF-")

    issued_permit.refresh_from_db()
    assert issued_permit.mao_certificate_number == app.mao_certificate_number
    assert issued_permit.mao_certificate_pdf


@pytest.mark.django_db
def test_each_document_renders_its_own_signatory(test_setup):
    """
    The three generated documents must each carry their own signatory rather
    than one shared name pulled from the global configuration.
    """
    farmer = test_setup["farmer"]
    agri = test_setup["agri"]
    b1 = test_setup["barangays"][0]

    # Start from an empty roster so each position can be seeded deliberately
    # (a default per position is otherwise provided by migration 0038).
    ApplicationSignatory.objects.all().delete()
    Signatory.objects.all().delete()

    DocumentType = ApplicationSignatory.DocumentType
    Position = Signatory.Position

    vet = Signatory.objects.create(
        name="DR. RENATO C. ALPAY",
        title="Municipal Veterinarian",
        position=Position.MUNICIPAL_VETERINARIAN,
        is_default=True,
    )
    agriculturist = Signatory.objects.create(
        name="ENGR. LEONARDO R. ABUSTAN",
        title="Municipal Agriculturist",
        position=Position.MUNICIPAL_AGRICULTURIST,
        is_default=True,
    )
    oic = Signatory.objects.create(
        name="AMALITA C. AMORES",
        title="OIC - Municipal Agriculturist",
        position=Position.OIC,
        is_default=True,
    )

    app = PermitApplication.objects.create(
        farmer=farmer,
        status=PermitApplication.Status.PAYMENT_PENDING,
        destination="Lucena City",
        transport_date=timezone.now().date(),
        purpose="Slaughter",
    )
    TransportOrigin.objects.create(
        application=app, barangay=b1, number_of_pigs=10, fattener=10
    )
    issued_permit = IssuedPermit.objects.create(
        permit_number=uuid.uuid4().hex[:13].upper(),
        application=app,
        issued_by=agri,
        qr_token=str(uuid.uuid4()),
        permit_fee=Decimal("150.00"),
    )

    ApplicationSignatory.objects.create(
        application=app, document_type=DocumentType.AIC, signatory=vet
    )
    ApplicationSignatory.objects.create(
        application=app, document_type=DocumentType.MAO_CERTIFICATE, signatory=agriculturist
    )
    ApplicationSignatory.objects.create(
        application=app, document_type=DocumentType.PERMIT, signatory=oic
    )

    generate_aic_pdf.func(app.pk)
    generate_mao_certificate_pdf.func(app.pk, issued_by_user_id=agri.pk)
    generate_permit_pdf.func(app.pk)

    app.refresh_from_db()
    issued_permit.refresh_from_db()

    aic_text = pdf_text(app.aic_pdf.read())
    assert "DR. RENATO C. ALPAY" in aic_text
    assert "ENGR. LEONARDO R. ABUSTAN" not in aic_text

    mao_text = pdf_text(app.mao_certificate_pdf.read())
    assert "ENGR. LEONARDO R. ABUSTAN" in mao_text
    assert "DR. RENATO C. ALPAY" not in mao_text

    permit_text = pdf_text(issued_permit.permit_pdf.read())
    assert "AMALITA C. AMORES" in permit_text

