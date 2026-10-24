"""The demo command runs only against pytest-django's isolated PostgreSQL DB."""

import base64
import datetime
import re
import subprocess
import sys
import zlib
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from threading import Barrier
from unittest.mock import Mock

import pytest
from django.core.management import call_command
from django.db import close_old_connections, connection
from django.utils import timezone

from apps.maps.services import HogSurveyService
from scripts import seed_realistic_operations as seed


pytestmark = pytest.mark.django_db(transaction=True)
NOW = datetime.datetime(2026, 10, 24, 12, tzinfo=datetime.timezone.utc)


@pytest.fixture(autouse=True)
def demo_environment(settings, monkeypatch, tmp_path):
    settings.DEBUG = True
    settings.FRONTEND_URL = "https://demo.example.com"
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    settings.STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage",
                    "OPTIONS": {"location": str(tmp_path)}},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
    monkeypatch.delenv("FARMPASS_DEMO_SEED_ENABLED", raising=False)
    monkeypatch.setattr(timezone, "now", lambda: NOW)
    # Catch accidental external integrations without mocking application logic.
    request = Mock(side_effect=AssertionError("Unexpected outbound HTTP request"))
    monkeypatch.setattr("requests.sessions.Session.request", request)
    return tmp_path


@pytest.fixture
def barangays():
    names = ["Bucal", "Castanas", "Lutucan 1", "Antipolo", "Balubal"]
    names += [f"Reference Barangay {i:02d}" for i in range(38)]
    return [seed.Barangay.objects.create(name=name, latitude=13.96, longitude=121.52)
            for name in names]


def invoke():
    call_command("runscript", "seed_realistic_operations", verbosity=0)


def snapshot():
    models = (seed.User, seed.Barangay, seed.MunicipalConfig, *seed.OPERATIONAL_MODELS)
    return {model.__name__: list(model.objects.order_by("pk").values()) for model in models}


def test_creates_bounded_complete_demo_and_preserves_it_on_repeat(barangays, demo_environment, capsys):
    invoke()

    assert seed.PermitApplication.objects.count() == 100
    assert seed.HogSurvey.objects.count() == 100
    assert seed.User.objects.count() == len(seed.ACCOUNTS)
    assert set(seed.PermitApplication.objects.values_list("status", flat=True)) == set(seed.S.values)
    assert seed.AuditTrail.objects.filter(what_performed=seed.COMPLETION_MARKER).count() == 1
    assert seed.PrivacyConsentLog.objects.count() == len(seed.ACCOUNTS)
    assert not seed.User.objects.filter(receive_sms=True).exists()
    for username, role, _, _, _, state in seed.ACCOUNTS:
        user = seed.User.objects.get(username=username)
        assert user.check_password(seed.PASSWORD)
        assert user.role == role
        assert user.verification_status == state
        if role == "Farmer":
            assert user.farmer_documents.count() == 2
            assert set(user.farmer_documents.values_list("is_verified", flat=True)) == {state == seed.V.VERIFIED}

    current = seed.HogSurvey.objects.filter(survey_date=timezone.localdate())
    assert current.count() == len(barangays)
    assert current.values("barangay").distinct().count() == len(barangays)
    for survey in seed.HogSurvey.objects.all():
        assert survey.total_pigs == sum(getattr(survey, f) for f in survey.PIG_FIELDS)
        assert survey.survey_date <= timezone.localdate()
        if survey.survey_date != timezone.localdate():
            assert survey.survey_date.month in (3, 6, 9, 12)
            assert (survey.survey_date + datetime.timedelta(days=1)).day == 1
    heatmap = HogSurveyService._compute_aggregated_survey_data(None, None, None, None, None)
    assert {row["density_level"] for row in heatmap} == {"None", "Low", "Medium", "High", "Very High"}
    for origin in seed.TransportOrigin.objects.all():
        assert origin.number_of_pigs == sum(getattr(origin, f) for f in origin.PIG_FIELDS) > 0

    assert set(seed.OCRValidationResult.objects.values_list("status", flat=True)) == {"PASSED", "MANUAL", "OVERRIDDEN"}
    assert set(seed.PaymentHistory.objects.values_list("status", flat=True)) == {"PENDING", "SUCCESS", "FAILED"}
    assert set(seed.IssuedPermit.objects.filter(is_paid=True).values_list("payment_method", flat=True)) == {"ONLINE", "OFFLINE"}
    assert seed.IssuedPermit.objects.filter(is_paid=True, valid_until__lt=timezone.localdate()).exists()
    assert seed.IssuedPermit.objects.filter(is_paid=True, valid_until__gte=timezone.localdate(), application__is_checked=False).exists()
    assert seed.IssuedPermit.objects.filter(is_paid=True, valid_until__gte=timezone.localdate(), application__is_checked=True).exists()
    for permit in seed.IssuedPermit.objects.select_related("application", "payment_history"):
        app, payment = permit.application, permit.payment_history
        assert app.is_issued == permit.is_paid == (payment.status == "SUCCESS")
        assert payment.amount == permit.permit_fee == Decimal("150.00")
        assert permit.aic_pdf.name == app.aic_pdf.name
        assert permit.mao_certificate_pdf.name == app.mao_certificate_pdf.name
        assert permit.date_issued <= app.updated_at.date()
        assert not payment.paymongo_payment_id
        assert not payment.paymongo_payment_intent_id
        assert not payment.paymongo_session_id
    for app in seed.PermitApplication.objects.all():
        assert app.created_at <= app.updated_at <= timezone.localtime()
        assert (app.submitted_at is None) == (app.status == seed.S.DRAFT)
        if app.is_checked:
            assert seed.InspectorLogs.objects.get(application=app).scanned_at <= app.updated_at

    # Exercise the same read services used by the inspection and download UI.
    from apps.permits.services.permit import get_issued_permit_details, verify_permit
    from rest_framework.exceptions import ValidationError

    inspector = seed.User.objects.get(username="inspector_mario")
    valid = seed.IssuedPermit.objects.get(application__purpose__startswith="[DEMO:released_valid_unchecked]")
    scanned_app, scanned_permit, checked = verify_permit(valid.qr_token, inspector)
    assert scanned_app.pk == valid.application_id and scanned_permit.pk == valid.pk
    assert checked is False
    _, downloadable = get_issued_permit_details(valid.application, valid.application.farmer)
    assert downloadable.permit_pdf.name
    expired = seed.IssuedPermit.objects.get(application__purpose__startswith="[DEMO:released_expired]")
    with pytest.raises(ValidationError, match="expired"):
        verify_permit(expired.qr_token, inspector)

    # Parse the generated PDF's text stream using its declared standard filters.
    permit = seed.IssuedPermit.objects.get(application__purpose__startswith="[DEMO:released_valid_unchecked]")
    pdf = permit.permit_pdf.read()
    assert pdf.startswith(b"%PDF-") and pdf.rstrip().endswith(b"%%EOF")
    url = f"https://demo.example.com/inspector/verify/{permit.qr_token}".encode()
    assert url in pdf  # The clickable QR annotation contains the exact URL.
    streams = re.findall(rb"stream\r?\n(.*?)endstream", pdf, re.DOTALL)
    text = b"".join(zlib.decompress(base64.a85decode(stream.strip(), adobe=True)) for stream in streams)
    assert permit.permit_number.encode() in text
    assert permit.qr_token.encode() in text
    assert text.count(b" re ") > 100  # QR rendered as vector modules, not a blank box.

    before = snapshot()
    assets = {path.relative_to(demo_environment): path.read_bytes()
              for path in demo_environment.rglob("*") if path.is_file()}
    capsys.readouterr()
    invoke()
    output = capsys.readouterr().out
    assert "already seeded; skipping" in output
    assert "farmer_pending" in output and "password123" in output
    assert "Expired demo permits" in output
    assert snapshot() == before
    assert {path.relative_to(demo_environment): path.read_bytes()
            for path in demo_environment.rglob("*") if path.is_file()} == assets


@pytest.mark.parametrize("existing", ["survey", "audit", "username", "phone"])
def test_refuses_existing_data_without_changing_it(barangays, existing, demo_environment):
    if existing == "survey":
        seed.HogSurvey.objects.create(barangay=barangays[0], total_pigs=10)
    elif existing == "audit":
        seed.AuditTrail.objects.create(what_performed="Real audit history")
    else:
        seed.User.objects.create_user(
            username="admin" if existing == "username" else "existing_farmer",
            password="existing-password", phone_no="09990000000" if existing == "phone" else "09123456789",
        )
    before = snapshot()

    with pytest.raises(RuntimeError, match="existing operational|conflict"):
        invoke()

    assert snapshot() == before
    assert not list(demo_environment.rglob("*.pdf"))


def test_missing_barangays_fails_before_writing(demo_environment):
    before = snapshot()
    with pytest.raises(RuntimeError, match="reference barangays"):
        invoke()
    assert snapshot() == before
    assert not list(demo_environment.rglob("*.pdf"))


def test_production_is_disabled_without_opt_in(settings, capsys):
    settings.DEBUG = False
    invoke()
    assert "Demo seeding disabled" in capsys.readouterr().out
    assert not seed.User.objects.exists()
    assert not seed.AuditTrail.objects.exists()


def test_production_opt_in_seeds_and_repeats_safely(settings, monkeypatch, barangays):
    settings.DEBUG = False
    monkeypatch.setenv("FARMPASS_DEMO_SEED_ENABLED", "true")
    config = seed.MunicipalConfig.objects.create(
        pk=1, vet_health_cert_fee=100, transport_pass_fee=50,
        local_transport_permit_fee=50, validity_days=30,
    )
    config_before = seed.MunicipalConfig.objects.filter(pk=config.pk).values().get()
    invoke()
    before = snapshot()
    invoke()
    assert seed.PermitApplication.objects.count() == 100
    assert seed.MunicipalConfig.objects.filter(pk=config.pk).values().get() == config_before
    assert set(seed.PaymentHistory.objects.values_list("amount", flat=True)) == {200}
    assert seed.IssuedPermit.objects.filter(is_paid=True, valid_until__lt=timezone.localdate()).exists()
    assert snapshot() == before


def test_storage_failure_rolls_back_then_retry_reuses_assets(barangays, monkeypatch, demo_environment):
    original_save = seed.default_storage.save
    writes = 0

    def interrupted_save(*args, **kwargs):
        nonlocal writes
        writes += 1
        if writes == 4:
            raise OSError("Simulated storage interruption")
        return original_save(*args, **kwargs)

    before = snapshot()
    with monkeypatch.context() as patch:
        patch.setattr(seed.default_storage, "save", interrupted_save)
        with pytest.raises(OSError, match="storage interruption"):
            invoke()
    assert snapshot() == before
    leftover = {path: path.read_bytes() for path in demo_environment.rglob("*.pdf")}
    assert leftover
    invoke()
    assert seed.PermitApplication.objects.count() == 100
    assert seed.AuditTrail.objects.filter(what_performed=seed.COMPLETION_MARKER).count() == 1
    for path, content in leftover.items():
        assert path.read_bytes() == content


def test_simultaneous_commands_create_one_dataset(barangays):
    barrier = Barrier(2)

    def worker():
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            invoke()
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(worker) for _ in range(2)]
        for future in futures:
            future.result(timeout=60)
    assert seed.PermitApplication.objects.count() == 100
    assert seed.HogSurvey.objects.count() == 100
    assert seed.User.objects.count() == len(seed.ACCOUNTS)
    assert seed.AuditTrail.objects.filter(what_performed=seed.COMPLETION_MARKER).count() == 1


def test_cloudinary_uploads_use_stable_ids_and_reuse_existing_assets(monkeypatch):
    monkeypatch.setenv("CLOUDINARY_URL", "cloudinary://demo:demo@demo")
    from cloudinary_storage.storage import MediaCloudinaryStorage

    storage = MediaCloudinaryStorage()
    exists = Mock(return_value=False)
    monkeypatch.setattr(storage, "exists", exists)
    monkeypatch.setattr(seed, "default_storage", storage)
    upload = Mock(side_effect=lambda *args, **kwargs: {"public_id": kwargs["public_id"]})
    monkeypatch.setattr("cloudinary.uploader.upload", upload)

    first = seed.DemoFiles().pdf("qr_sample", "Sample")
    assert upload.call_count == 1
    assert upload.call_args.kwargs["overwrite"] is False
    assert upload.call_args.kwargs["unique_filename"] is False
    assert "farmpass_demo/qr_sample-" in upload.call_args.kwargs["public_id"]
    exists.return_value = True
    second = seed.DemoFiles().pdf("qr_sample", "Sample")
    assert first == second
    assert upload.call_count == 1


def test_invalid_arguments_raise_instead_of_resetting(barangays):
    before = snapshot()
    with pytest.raises(RuntimeError, match="no reset option"):
        call_command("runscript", "seed_realistic_operations", script_args=["reset"], verbosity=0)
    assert snapshot() == before


def test_command_process_exits_nonzero_on_invalid_argument():
    # Argument validation precedes all DB access, so this child cannot seed.
    result = subprocess.run(
        [sys.executable, "manage.py", "runscript", "seed_realistic_operations", "--script-args", "reset"],
        capture_output=True, text=True, timeout=30,
    )
    assert result.returncode != 0
    assert "no reset option" in result.stderr
