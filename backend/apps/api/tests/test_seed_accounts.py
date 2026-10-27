"""Account seeding uses only pytest's isolated PostgreSQL database."""
import pytest
from django.contrib.auth import authenticate
from django.core.management import call_command
from django.db import IntegrityError
from scripts import seed_realistic_operations as seed


pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def account_environment(settings, monkeypatch):
    settings.DEBUG = True
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    for name in ("Lutucan 1", "Castanas", "Bucal"):
        seed.Barangay.objects.create(name=name)

    def reject_media(*args, **kwargs):
        pytest.fail("Account seeding must not create media files")

    monkeypatch.setattr(seed, "ensure_sample_media_file", reject_media)


def test_apply_creates_login_accounts_without_operational_records(capsys):
    call_command("runscript", "seed_realistic_operations", script_args=["accounts-only"], verbosity=0)
    assert seed.User.objects.count() == 25
    for user in seed.User.objects.all():
        assert user.is_active and not user.receive_sms
        assert authenticate(username=user.username, password="password123").pk == user.pk
    admin = seed.User.objects.get(username="admin")
    assert admin.role == "Admin" and admin.is_staff and admin.is_superuser
    assert set(seed.User.objects.values_list("role", flat=True)) == {
        "Admin", "Agri", "Opv", "Inspector", "Barangay", "Farmer"}
    for model in (seed.PermitApplication, seed.HogSurvey, seed.FarmerDocument,
                  seed.PaymentHistory, seed.MunicipalConfig):
        assert model.objects.count() == 0
    output = capsys.readouterr().out
    assert "Accounts created: 25" in output
    assert "Password for newly created accounts: password123" in output


def test_repeat_preserves_existing_users_and_passwords(capsys):
    seed.run("mode=apply", "accounts-only")
    user = seed.User.objects.get(username="admin")
    user.set_password("my-existing-password")
    user.is_active = False
    user.save()
    before = list(seed.User.objects.order_by("pk").values())
    consent_count = seed.PrivacyConsentLog.objects.count()
    capsys.readouterr()
    seed.run("mode=apply", "accounts-only")
    assert list(seed.User.objects.order_by("pk").values()) == before
    assert seed.PrivacyConsentLog.objects.count() == consent_count
    output = capsys.readouterr().out
    assert "Accounts created: 0" in output and "Existing accounts preserved: 25" in output
    assert "Password for newly created accounts" not in output


def test_preview_explicitly_reports_no_accounts_created(capsys):
    seed.run("mode=preview", "accounts-only")
    assert not seed.User.objects.exists()
    assert not seed.PrivacyConsentLog.objects.exists()
    assert "No login accounts were created" in capsys.readouterr().out


def test_role_collision_rolls_back_account_creation():
    seed.User.objects.create_user(username="agri_user123", role="Farmer", password="existing")
    before = list(seed.User.objects.values())
    with pytest.raises(ValueError, match="expected 'Agri'"):
        seed.run("mode=apply", "accounts-only")
    assert list(seed.User.objects.values()) == before
    assert not seed.PrivacyConsentLog.objects.exists()


def test_phone_collision_rolls_back_account_creation():
    seed.User.objects.create_user(username="existing", phone_no="09171001", password="existing")
    with pytest.raises(IntegrityError):
        seed.run("mode=apply", "accounts-only")
    assert list(seed.User.objects.values_list("username", flat=True)) == ["existing"]
    assert not seed.PrivacyConsentLog.objects.exists()


def test_accounts_only_rejects_replace():
    with pytest.raises(ValueError, match="cannot be combined"):
        seed.run("mode=apply", "accounts-only", "replace")
    assert not seed.User.objects.exists()


def test_production_apply_stays_disabled(settings):
    settings.DEBUG = False
    with pytest.raises(RuntimeError, match="forbidden in production"):
        seed.run("mode=apply", "accounts-only")
    assert not seed.User.objects.exists()


def test_missing_barangay_fails_without_creating_accounts():
    seed.Barangay.objects.filter(name="Bucal").delete()
    with pytest.raises(ValueError, match="requires Lutucan 1"):
        seed.run("mode=apply", "accounts-only")
    assert not seed.User.objects.exists()
