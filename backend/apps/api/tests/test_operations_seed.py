"""The simple seed command runs only in pytest's isolated database."""
import pytest
from django.core.management import call_command
from apps.maps.survey_generation import POPULATION_TARGETS
from scripts import seed_realistic_operations as seed


pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def seed_environment(settings, tmp_path):
    settings.DEBUG = True
    settings.MEDIA_ROOT = tmp_path
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    seed.Barangay.objects.bulk_create([seed.Barangay(name=name) for name in POPULATION_TARGETS])


@pytest.mark.parametrize("deployment", [False, True])
def test_plain_command_seeds_everything_once(capsys, tmp_path, settings, monkeypatch, deployment):
    settings.DEBUG = not deployment
    if deployment:
        monkeypatch.setenv("FARMPASS_SEED_ENABLED", "true")
    # A Django superuser starts with the custom role's default of Farmer.
    seed.User.objects.create_superuser(username="admin", password="existing-admin-password")
    call_command("runscript", "seed_realistic_operations", verbosity=0)
    assert seed.User.objects.count() == 25
    assert seed.HogSurvey.objects.count() > 0
    assert seed.PermitApplication.objects.count() == 160
    admin = seed.User.objects.get(username="admin")
    assert admin.role == "Admin" and admin.is_staff and admin.is_superuser
    assert admin.check_password("existing-admin-password")
    assert seed.AuditTrail.objects.filter(what_performed=seed.COMPLETION_MARKER).count() == 1
    models = (seed.User, seed.HogSurvey, seed.PermitApplication, seed.AuditTrail, seed.PaymentHistory)
    before = [list(model.objects.order_by("pk").values()) for model in models]
    files = {path: path.read_bytes() for path in tmp_path.rglob("*") if path.is_file()}
    capsys.readouterr()
    call_command("runscript", "seed_realistic_operations", verbosity=0)
    assert "Already seeded" in capsys.readouterr().out
    assert [list(model.objects.order_by("pk").values()) for model in models] == before
    assert {path: path.read_bytes() for path in tmp_path.rglob("*") if path.is_file()} == files


def test_failed_seed_rolls_back_without_completion_marker(monkeypatch):
    def fail(*args, **kwargs):
        raise OSError("Interrupted media creation")

    monkeypatch.setattr(seed, "ensure_sample_media_file", fail)
    with pytest.raises(OSError, match="Interrupted"):
        call_command("runscript", "seed_realistic_operations", verbosity=0)
    assert not seed.User.objects.exists()
    assert not seed.HogSurvey.objects.exists()
    assert not seed.PermitApplication.objects.exists()
    assert not seed.AuditTrail.objects.exists()


def test_plain_command_refuses_production(settings, monkeypatch):
    settings.DEBUG = False
    monkeypatch.delenv("FARMPASS_SEED_ENABLED", raising=False)
    with pytest.raises(RuntimeError, match="forbidden in production"):
        call_command("runscript", "seed_realistic_operations", verbosity=0)
    assert not seed.User.objects.exists()


def test_production_never_replaces_existing_data(settings, monkeypatch):
    settings.DEBUG = False
    monkeypatch.setenv("FARMPASS_SEED_ENABLED", "true")
    with pytest.raises(RuntimeError, match="Replacing existing data is forbidden"):
        seed.run("replace")
    assert not seed.User.objects.exists()
