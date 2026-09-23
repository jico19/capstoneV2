import datetime

import pytest
from django.contrib.auth import get_user_model

from apps.documents.services.cis_template import generate_cis_template
from apps.maps.models import Barangay
from apps.ocr.services import extract_cis, validate_cis
from apps.permits.models import PermitApplication, TransportOrigin

User = get_user_model()

CIS_FULL_TEXT = """\
This is to certify that TEN (10) of swine
from Edwin Rosales, Zapote Lac Pinas City shipped on FEB 02, 2024
to Metro Manila are for immediate slaughter within
twenty-four (24) hours.

Darrel Anonuevo
PROPRIETOR / SHIPPER
Darrel Anonuevo Trucking Services
"""


def test_extract_cis_full():
    extracted = extract_cis(CIS_FULL_TEXT)
    assert extracted["number_of_animals"] == 10
    assert extracted["number_of_animals_text"] == "TEN"
    assert extracted["origin"] == "Edwin Rosales, Zapote Lac Pinas City"
    assert extracted["shipment_date"] == "2024-02-02"
    assert extracted["destination"] == "Metro Manila"
    assert extracted["proprietor_name"] == "Darrel Anonuevo"
    assert extracted["business_name"] == "Darrel Anonuevo Trucking Services"


def test_extract_cis_pig_count_word_only():
    text = CIS_FULL_TEXT.replace("TEN (10)", "TEN")
    extracted = extract_cis(text)
    assert extracted["number_of_animals"] == 10
    assert extracted["number_of_animals_text"] == "TEN"


@pytest.fixture
def transport_origin(db):
    farmer = User.objects.create_user(username="farmer_cis", password="password", role="Farmer")
    barangay = Barangay.objects.create(name="Poblacion")
    application = PermitApplication.objects.create(
        farmer=farmer,
        status=PermitApplication.Status.SUBMITTED,
        destination="Metro Manila",
        transport_date=datetime.date(2024, 2, 3),
    )
    return TransportOrigin.objects.create(
        application=application,
        barangay=barangay,
        fattener=10,
    )


def test_validate_cis_passes(transport_origin):
    extracted = extract_cis(CIS_FULL_TEXT)
    errors = validate_cis(extracted, transport_origin)
    assert errors == {}


def test_validate_cis_pig_count_mismatch(transport_origin):
    extracted = extract_cis(CIS_FULL_TEXT.replace("TEN (10)", "TWELVE (12)"))
    errors = validate_cis(extracted, transport_origin)
    assert "number_of_animals" in errors


def test_validate_cis_date_out_of_range(transport_origin):
    extracted = extract_cis(CIS_FULL_TEXT.replace("FEB 02, 2024", "FEB 09, 2024"))
    errors = validate_cis(extracted, transport_origin)
    assert "shipment_date" in errors


def test_generate_cis_template_returns_pdf():
    pdf = generate_cis_template("Poblacion")
    assert pdf.startswith(b"%PDF")