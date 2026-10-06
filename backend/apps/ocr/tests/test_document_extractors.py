from apps.ocr.services import (
    normalize_text,
    extract_handlers_license,
    validate_handlers_license,
    extract_transport_carrier,
    validate_transport_carrier,
    extract_traders_pass,
    validate_traders_pass,
    extract_endorsement_cert,
    validate_endorsement_cert,
)
from apps.permits.models import PermitApplication, TransportOrigin
from apps.maps.models import Barangay
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

HANDLERS_REG_SAMPLE_TEXT = """\
Republic of the Philippines
Department of Agriculture
BUREAU OF ANIMAL INDUSTRY
Visayes Avenue, Diliman, Quezon City
TIN:
746-800-452
2025-DARFO-IV-A-003971
Registration Number
CERTIFICATE OF REGISTRATION
Pursuant to presidential Decree No. 07, DA BAI Administrative Order No. 12, series of 2012 and
DA-BAI Administrative Order No. B series of 2004 otherwise known as
Livestock, Poultry and By-Products Handler's Registration
DARREL C. AÑONUEVO
NAME OF APPLICANT
DARREL AÑONUEVO TRUCKING SERVICES
BUSINESS NAME
Poblacion San Antonio Quezon
ADDRESS
is registered with the BUREAU OF ANIMAL INDUSTRY as a
Livestock Handler Dealer
All Regions
AREA OF COVERAGE
October 28, 2025
DATE OF ISSUANCE
October 28, 2026
DATE OF EXPIRATION
"""

TRANSPORT_CARRIER_SAMPLE_TEXT = """\
Republic of the Philippines
Department of Agriculture
BUREAU OF ANIMAL INDUSTRY
Visayas Avenue, Dilman, Quezon City
TIN:
746-800-452
2025-DARFO-IV-A-012243
License Number
LICENSE TO OPERATE
Livestock, Poultry and By-Product Transport Carrier
DARREL C. AÑONUEVO
NAME OF APPLICANT
DARREL AÑONUEVO TRUCKING SERVICES
BUSINESS NAME
Poblacion San Antonio Quezon
ADDRESS
is registered with the BUREAU OF ANIMAL INDUSTRY as a
LAND TRANSPORT CARRIER
GENERAL PARTICULARS
VDC 486
PLATE NO.
REBUILT
MAKER / BRAND
0448-98716
MOTOR VEHICLE
NO.
JITNEY
BODY TYPE
N/A
TEMPORARY/CONDUCTION STICKER
October 28, 2025
October 28, 2026
DATE OF ISSUANCE
DATE OF EXPIRATION
"""

TRADERS_PASS_SAMPLE_TEXT = """\
PGQ-OPV-F-047
Rev. No.: 1
Issue Date: 08/06/2025
Republic of the Philippines
Province of Quezon
OFFICE OF THE PROVINCIAL VETERINARIAN
TRADER'S PASS
TrPASS Code :
Name of Hauler:
Name of Business:
Business Address :
Type of Vehicle :
Plate Number :
Color :
Origin :
Destination :
TrPASS-OPV-QZN-00014-V1
Darrel Añonuevo
Darrel Añonuevo Trucking Services
Poblacion, San Antonio, Quezon
JITNEY / REBUILT
VDC 486
Silver/Gray
Quezon
CALABARZON/NCR
**This Trader's Pass MUST be displayed all the time and SHOULD be accompanied by a Trader's Pass Certification.
VALID ONLY within Quezon Province.
"""


def test_normalize_text_darfo_year_preserves_darfo():
    # 2O25 has letter O in year, DARFO has letter O in acronym
    raw = "2O25-DARFO-IV-A-003971"
    normalized = normalize_text(raw)
    assert "2025-DARFO-IV-A-003971" in normalized
    assert "DARF0" not in normalized


def test_extract_handlers_license_from_sample():
    extracted = extract_handlers_license(HANDLERS_REG_SAMPLE_TEXT)
    assert extracted["registration_number"] == "2025-DARFO-IV-A-003971"
    assert extracted["license_number"] == "2025-DARFO-IV-A-003971"
    assert extracted["name_of_applicant"] == "DARREL C. AÑONUEVO"
    assert extracted["business_name"] == "DARREL AÑONUEVO TRUCKING SERVICES"
    assert extracted["address"] == "Poblacion San Antonio Quezon"
    assert extracted["area_of_coverage"] == "All Regions"
    assert extracted["date_of_issuance"] == "October 28, 2025"
    assert extracted["date_of_expiration"] == "October 28, 2026"


def test_validate_handlers_license_passes():
    extracted = extract_handlers_license(HANDLERS_REG_SAMPLE_TEXT)
    errors = validate_handlers_license(extracted)
    assert errors == {}


def test_extract_transport_carrier_from_sample():
    extracted = extract_transport_carrier(TRANSPORT_CARRIER_SAMPLE_TEXT)
    assert extracted["license_number"] == "2025-DARFO-IV-A-012243"
    assert extracted["name_of_applicant"] == "DARREL C. AÑONUEVO"
    assert extracted["business_name"] == "DARREL AÑONUEVO TRUCKING SERVICES"
    assert extracted["address"] == "Poblacion San Antonio Quezon"
    assert extracted["plate_no"] == "VDC 486"
    assert extracted["maker_brand"] == "REBUILT"
    assert extracted["body_type"] == "JITNEY"
    assert extracted["date_of_issuance"] == "October 28, 2025"
    assert extracted["date_of_expiration"] == "October 28, 2026"


def test_validate_transport_carrier_passes():
    extracted = extract_transport_carrier(TRANSPORT_CARRIER_SAMPLE_TEXT)
    errors = validate_transport_carrier(extracted)
    assert errors == {}


def test_extract_traders_pass_has_no_fabricated_expiration():
    extracted = extract_traders_pass(TRADERS_PASS_SAMPLE_TEXT)
    assert extracted["license_number"] == "TrPASS-OPV-QZN-00014-V1"
    assert extracted["name_of_applicant"] == "Darrel Añonuevo"
    assert extracted["business_name"] == "Darrel Añonuevo Trucking Services"
    assert extracted["address"] == "Poblacion, San Antonio, Quezon"
    assert extracted["plate_no"] == "VDC 486"
    assert extracted["vehicle_type"] == "JITNEY / REBUILT"
    # Document has no expiration date field -> key should not exist or be None
    assert "date_of_expiration" not in extracted or extracted.get("date_of_expiration") is None


def test_validate_traders_pass_passes_without_expiration():
    extracted = extract_traders_pass(TRADERS_PASS_SAMPLE_TEXT)
    errors = validate_traders_pass(extracted)
    assert errors == {}


ENDORSEMENT_LETTER_1_SAMPLE_TEXT = """\
REPUBLIC OF PHILIPPINES
PROVINCE OF QUEZON
MUNCIPALITY OF SARIAYA
BRGY. JANAGDONG 1
ENDORSEMENT
This is to respectfully endorse to your good office RICHELLE T. BABIA with business name, JEICIA'S
MEAT SHOP with business address BRGY.A LUCBAN, QUEZON
Enumerated below:
Name of Swine Raiser
Sitio/
Barangay
No.
of
Hea
ds
Hau
led
Company
Name
(Destination)
Complete Company Address
(Destination)
(st.,purok,brgy,bayan,probinsya)
ANTONINO M. RAZON
ILAYA
12
LUCBAN
SLAUGHTERHOUSE
BRGY. KALYATT LUCBAN
QUEZON
TEODORO VALDEZ
Barangay Chairman
"""

ENDORSEMENT_LETTER_2_SAMPLE_TEXT = """\
REPUBLIC OF PHILIPPINES
PROVINCE OF QUEZON
MUNCIPALITY OF SARIAYA
BRGY. JANAGDONG 1
PAGPAPATUNAY
Ito ay pagpapatunay na si RICHELLE T. BABIA may sapat na taong gulang, residente ng BRGY. 4 LUCBAN, QUEZON
PANGALAN
ANTONINO M. RAZON
BILANG
12
Contact No.
09640969620
TEODORO V VALDEZ
Punong Barangay
"""


def test_extract_endorsement_letter_1_english():
    extracted = extract_endorsement_cert(ENDORSEMENT_LETTER_1_SAMPLE_TEXT)
    assert extracted["barangay"] == "JANAGDONG 1"
    assert extracted["raiser_name"] == "ANTONINO M. RAZON"
    assert extracted["number_of_animals"] == 12
    assert extracted["hauler_name"] == "RICHELLE T. BABIA"
    assert extracted["official_name"] == "TEODORO VALDEZ"


def test_extract_endorsement_letter_2_tagalog():
    extracted = extract_endorsement_cert(ENDORSEMENT_LETTER_2_SAMPLE_TEXT)
    assert extracted["barangay"] == "JANAGDONG 1"
    assert extracted["raiser_name"] == "ANTONINO M. RAZON"
    assert extracted["number_of_animals"] == 12
    assert extracted["hauler_name"] == "RICHELLE T. BABIA"
    assert extracted["official_name"] == "TEODORO V VALDEZ"


def test_validate_endorsement_cert_passes(db):
    farmer = User.objects.create_user(username="farmer_endorsed", password="password", role="Farmer")
    barangay = Barangay.objects.create(name="Janagdong 1")
    application = PermitApplication.objects.create(
        farmer=farmer,
        status=PermitApplication.Status.SUBMITTED,
        destination="Lucban, Quezon",
        transport_date=timezone.now().date(),
    )
    origin = TransportOrigin.objects.create(
        application=application,
        barangay=barangay,
        fattener=12,
    )
    extracted = extract_endorsement_cert(ENDORSEMENT_LETTER_1_SAMPLE_TEXT)
    errors = validate_endorsement_cert(extracted, origin)
    assert errors == {}


def test_validate_endorsement_cert_count_mismatch(db):
    farmer = User.objects.create_user(username="farmer_endorsed_2", password="password", role="Farmer")
    barangay = Barangay.objects.create(name="Janagdong 1")
    application = PermitApplication.objects.create(
        farmer=farmer,
        status=PermitApplication.Status.SUBMITTED,
        destination="Lucban, Quezon",
        transport_date=timezone.now().date(),
    )
    origin = TransportOrigin.objects.create(
        application=application,
        barangay=barangay,
        fattener=5,  # Mismatch (declared 5, endorsement has 12)
    )
    extracted = extract_endorsement_cert(ENDORSEMENT_LETTER_1_SAMPLE_TEXT)
    errors = validate_endorsement_cert(extracted, origin)
    assert "number_of_animals" in errors

