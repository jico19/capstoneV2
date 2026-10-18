import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from apps.maps.models import Barangay
from apps.permits.models import (
    ApplicationSignatory,
    MunicipalConfig,
    PermitApplication,
    Signatory,
    TransportOrigin,
)
from apps.permits.services import approve_application
from apps.permits.services.signatory import resolve_signatory

User = get_user_model()

DocumentType = ApplicationSignatory.DocumentType
Position = Signatory.Position


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def roster(db):
    """An empty roster, isolated from the rows seeded by migration 0038."""
    ApplicationSignatory.objects.all().delete()
    Signatory.objects.all().delete()
    return Signatory.objects


@pytest.fixture
def farmer(db):
    return User.objects.create_user(
        username="sig_farmer", password="password", role="Farmer", phone_no="09111111111"
    )


@pytest.fixture
def agri(db):
    return User.objects.create_user(
        username="sig_agri", password="password", role="Agri", phone_no="09222222222"
    )


@pytest.fixture
def barangay(db):
    return Barangay.objects.create(name="Signatory Test Barangay")


def make_application(farmer, barangay, status=PermitApplication.Status.SUBMITTED):
    application = PermitApplication.objects.create(
        farmer=farmer,
        status=status,
        destination="Lucena City",
        transport_date=timezone.now().date(),
        purpose="Slaughter",
    )
    TransportOrigin.objects.create(
        application=application, barangay=barangay, number_of_pigs=5, fattener=5
    )
    return application


def make_default(position, name):
    return Signatory.objects.create(
        name=name, title=f"{name} title", position=position, is_default=True
    )


# ─────────────────────────────────────────
# RESOLUTION PRECEDENCE
# ─────────────────────────────────────────


@pytest.mark.django_db
def test_historical_pin_wins_over_roster_default(roster, farmer, barangay):
    make_default(Position.MUNICIPAL_VETERINARIAN, "DEFAULT VET")
    chosen = Signatory.objects.create(
        name="OVERRIDE VET", title="Acting Veterinarian", position=Position.OIC
    )
    application = make_application(farmer, barangay)
    ApplicationSignatory.objects.create(
        application=application, document_type=DocumentType.AIC, signatory=chosen
    )

    assert resolve_signatory(application, DocumentType.AIC) == (
        "OVERRIDE VET",
        "Acting Veterinarian",
    )


@pytest.mark.django_db
def test_falls_back_to_position_default(roster, farmer, barangay):
    make_default(Position.MUNICIPAL_VETERINARIAN, "DEFAULT VET")
    make_default(Position.MUNICIPAL_AGRICULTURIST, "DEFAULT AGRI")
    application = make_application(farmer, barangay)

    # AIC is signed by the veterinarian, the permit by the agriculturist.
    assert resolve_signatory(application, DocumentType.AIC)[0] == "DEFAULT VET"
    assert resolve_signatory(application, DocumentType.PERMIT)[0] == "DEFAULT AGRI"


@pytest.mark.django_db
def test_falls_back_to_global_config_when_roster_empty(roster, farmer, barangay):
    MunicipalConfig.objects.all().delete()
    MunicipalConfig.objects.create(
        oic_name="GLOBAL OFFICER", oic_title="Global Title"
    )
    application = make_application(farmer, barangay)

    assert resolve_signatory(application, DocumentType.MAO_CERTIFICATE) == (
        "GLOBAL OFFICER",
        "Global Title",
    )


@pytest.mark.django_db
def test_inactive_signatory_is_not_used_as_default(roster, farmer, barangay):
    Signatory.objects.create(
        name="RETIRED VET",
        title="Former Veterinarian",
        position=Position.MUNICIPAL_VETERINARIAN,
        is_default=True,
        is_active=False,
    )
    application = make_application(farmer, barangay)

    # Falls past the inactive row to the global config / literal.
    assert resolve_signatory(application, DocumentType.AIC)[0] != "RETIRED VET"


# ─────────────────────────────────────────
# APPROVAL (signatories are settings-only)
# ─────────────────────────────────────────


@pytest.mark.django_db
def test_approval_succeeds_with_empty_roster(roster, farmer, agri, barangay):
    """Approval never depends on signatories — the PDF falls back at render."""
    application = make_application(farmer, barangay)

    approve_application(application, agri, remarks="Clear")

    application.refresh_from_db()
    assert application.status == PermitApplication.Status.FORWARDED_TO_OPV
    assert ApplicationSignatory.objects.filter(application=application).count() == 0


@pytest.mark.django_db
def test_approval_does_not_pin_signatories(roster, farmer, agri, barangay):
    """Documents read the Settings roster directly; nothing is pinned."""
    make_default(Position.MUNICIPAL_VETERINARIAN, "DEFAULT VET")
    make_default(Position.MUNICIPAL_AGRICULTURIST, "DEFAULT AGRI")
    application = make_application(farmer, barangay)

    approve_application(application, agri, remarks="Clear")

    application.refresh_from_db()
    assert application.status == PermitApplication.Status.FORWARDED_TO_OPV
    assert ApplicationSignatory.objects.filter(application=application).count() == 0
    assert resolve_signatory(application, DocumentType.AIC)[0] == "DEFAULT VET"
    assert resolve_signatory(application, DocumentType.PERMIT)[0] == "DEFAULT AGRI"


@pytest.mark.django_db
def test_approval_rejected_for_non_agri(roster, farmer, barangay):
    make_default(Position.MUNICIPAL_VETERINARIAN, "DEFAULT VET")
    make_default(Position.MUNICIPAL_AGRICULTURIST, "DEFAULT AGRI")
    application = make_application(farmer, barangay)

    with pytest.raises(Exception):
        approve_application(application, farmer, remarks="Clear")


# ─────────────────────────────────────────
# ROSTER API AUTHORISATION
# ─────────────────────────────────────────


@pytest.mark.django_db
def test_roster_write_requires_agri(api_client, roster, farmer, agri):
    payload = {
        "name": "SOME VET",
        "title": "Municipal Veterinarian",
        "position": Position.MUNICIPAL_VETERINARIAN,
    }
    url = reverse("signatory-list")

    api_client.force_authenticate(user=farmer)
    assert api_client.post(url, payload, format="json").status_code == 403

    api_client.force_authenticate(user=agri)
    assert api_client.post(url, payload, format="json").status_code == 201
    assert Signatory.objects.filter(name="SOME VET").exists()


@pytest.mark.django_db
def test_roster_destroy_retires_instead_of_deleting(api_client, roster, agri):
    signatory = Signatory.objects.create(
        name="RETIRING AGRI",
        title="Municipal Agriculturist",
        position=Position.MUNICIPAL_AGRICULTURIST,
        is_default=True,
    )

    api_client.force_authenticate(user=agri)
    response = api_client.delete(reverse("signatory-detail", kwargs={"pk": signatory.pk}))

    assert response.status_code == 204
    signatory.refresh_from_db()
    assert signatory.is_active is False
    assert signatory.is_default is False


@pytest.mark.django_db
def test_only_one_default_per_position(api_client, roster, agri):
    first = make_default(Position.MUNICIPAL_AGRICULTURIST, "FIRST AGRI")
    second = Signatory.objects.create(
        name="SECOND AGRI",
        title="Municipal Agriculturist",
        position=Position.MUNICIPAL_AGRICULTURIST,
    )

    api_client.force_authenticate(user=agri)
    response = api_client.patch(
        reverse("signatory-detail", kwargs={"pk": second.pk}),
        {"is_default": True},
        format="json",
    )

    assert response.status_code == 200
    first.refresh_from_db()
    assert first.is_default is False
    assert Signatory.objects.filter(
        position=Position.MUNICIPAL_AGRICULTURIST, is_default=True
    ).count() == 1
