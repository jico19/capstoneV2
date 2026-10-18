import uuid
from decimal import Decimal
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.maps.models import Barangay
from apps.permits.models import IssuedPermit, PermitApplication, TransportOrigin, MunicipalConfig
from apps.documents.services.permit_documents import generate_permit_pdf

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
