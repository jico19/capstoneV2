"""MAO certification follows explicit municipal confirmation, using the worker."""
from io import StringIO
from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.documents.services import generate_mao_certificate_pdf
from apps.permits.models import (
    MaoCertNumberCounter, OPVValidation, PermitApplication, TransportOrigin,
)
from apps.permits.services.opv import approve_opv_validation
from apps.permits.services.mao import confirm_mao_certificate
from apps.maps.models import Barangay

pytestmark = pytest.mark.django_db


@pytest.fixture
def case(db, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    settings.STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
    User = get_user_model()
    users = {
        role: User.objects.create_user(
            username=f"mao-timing-{role}", role=role,
            phone_no=f"0911111111{i}", verification_status="VERIFIED",
        )
        for i, role in enumerate(["Farmer", "Agri", "Opv"])
    }
    app = PermitApplication.objects.create(
        farmer=users["Farmer"], status=PermitApplication.Status.MANUAL,
        destination="Lucena", transport_date=timezone.localdate(), purpose="Slaughter",
    )
    TransportOrigin.objects.create(
        application=app, barangay=Barangay.objects.create(name="MAO Timing"), fattener=2,
    )
    return app, users, APIClient()


def documents():
    return {
        field: SimpleUploadedFile(f"{field}.pdf", b"%PDF-1.4 test", "application/pdf")
        for field in ["veterinary_health_certificate", "transportation_pass"]
    }


def forward(app):
    app.status = PermitApplication.Status.FORWARDED_TO_OPV
    app.save(update_fields=["status"])


def assert_no_mao_certificate(app):
    app.refresh_from_db()
    assert app.mao_certificate_number == ""
    assert app.mao_cert_issued_at is None
    assert not app.mao_certificate_pdf


def test_initial_mao_approval_only_queues_aic(case, django_capture_on_commit_callbacks):
    app, users, client = case
    client.force_authenticate(users["Agri"])
    with mock.patch("apps.documents.services.generate_aic_pdf") as aic_task, \
            mock.patch("apps.documents.services.generate_mao_certificate_pdf") as mao_task:
        aic, mao = aic_task.enqueue, mao_task.enqueue
        with django_capture_on_commit_callbacks(execute=True):
            response = client.post(reverse("permitapplication-approve", args=[app.pk]))
            aic.assert_not_called()
            mao.assert_not_called()
        assert response.status_code == 200
        aic.assert_called_once()
        mao.assert_not_called()
    assert_no_mao_certificate(app)
    assert app.aic_number
    assert app.aic_issued_at
    assert not MaoCertNumberCounter.objects.exists()


def ready_for_confirmation(case, status="OPV_VALIDATED"):
    app, users, client = case
    app.status = status
    app.save(update_fields=["status"])
    OPVValidation.objects.create(
        application=app, opv_staff=users["Opv"], status="VALIDATED", **documents(),
    )
    client.force_authenticate(users["Agri"])
    return app, users, client


def test_confirmation_records_review_and_queues_once_after_commit(case, django_capture_on_commit_callbacks):
    from apps.api.models import AuditTrail
    app, users, client = ready_for_confirmation(case)
    stale = PermitApplication.objects.get(pk=app.pk)
    with mock.patch("apps.documents.services.generate_mao_certificate_pdf") as task:
        with django_capture_on_commit_callbacks(execute=True):
            response = client.post(reverse("permitapplication-confirm-mao-certificate", args=[app.pk]),
                                   {"confirmed": True, "reference": "  Records ref 456  "}, format="json")
            assert response.status_code == 200
            task.enqueue.assert_not_called()
            app.refresh_from_db()
            original = app.mao_certificate_number, app.mao_cert_issued_at, app.mao_confirmed_at
            confirm_mao_certificate(stale, users["Agri"], confirmed=True, reference="Changed ref")
        task.enqueue.assert_called_once_with(permit_application_id=app.pk, issued_by_user_id=users["Agri"].pk)
    app.refresh_from_db()
    assert app.mao_confirmed_by == users["Agri"]
    assert app.mao_confirmation_reference == "Records ref 456"
    assert (app.mao_certificate_number, app.mao_cert_issued_at, app.mao_confirmed_at) == original
    assert AuditTrail.objects.filter(what_performed__contains="[MAO CERTIFICATE CONFIRMED]").count() == 1


@pytest.mark.parametrize("payload", [
    {"reference": "Reviewed"}, {"confirmed": False, "reference": "Reviewed"},
    {"confirmed": "true", "reference": "Reviewed"}, {"confirmed": True},
    {"confirmed": True, "reference": "   "}, {"confirmed": True, "reference": "x" * 1001},
])
def test_confirmation_requires_explicit_checkbox_and_reference(case, payload):
    app, users, client = ready_for_confirmation(case)
    response = client.post(reverse("permitapplication-confirm-mao-certificate", args=[app.pk]), payload, format="json")
    assert response.status_code == 400
    assert_no_mao_certificate(app)
    assert app.mao_confirmed_at is None


@pytest.mark.parametrize("role", ["Farmer", "Opv", "Admin", "Inspector", "Barangay"])
def test_confirmation_only_allows_agri(case, role):
    app, users, client = ready_for_confirmation(case)
    user = users.get(role) or get_user_model().objects.create_user(username=role, role=role, phone_no="09999999999")
    client.force_authenticate(user)
    response = client.post(reverse("permitapplication-confirm-mao-certificate", args=[app.pk]),
                           {"confirmed": True, "reference": "Reviewed"}, format="json")
    assert response.status_code == 403
    assert_no_mao_certificate(app)


@pytest.mark.parametrize("missing", ["veterinary_health_certificate", "transportation_pass", "approval", "status"])
def test_confirmation_requires_committed_opv_return(case, missing):
    app, users, _ = ready_for_confirmation(case)
    if missing == "status":
        PermitApplication.objects.filter(pk=app.pk).update(status="FORWARDED_TO_OPV")
    elif missing == "approval":
        OPVValidation.objects.filter(application=app).update(status="REJECTED")
    else:
        OPVValidation.objects.filter(application=app).update(**{missing: ""})
    with pytest.raises(ValidationError):
        confirm_mao_certificate(app, users["Agri"], confirmed=True, reference="Reviewed")
    assert_no_mao_certificate(app)


def test_confirmation_rollback_queues_nothing(case, django_capture_on_commit_callbacks):
    app, users, _ = ready_for_confirmation(case)
    with mock.patch("apps.documents.services.generate_mao_certificate_pdf") as task, mock.patch(
        "apps.permits.services.mao.AuditTrail.objects.create", side_effect=RuntimeError("audit unavailable"),
    ):
        with django_capture_on_commit_callbacks(execute=True):
            with pytest.raises(RuntimeError):
                confirm_mao_certificate(app, users["Agri"], confirmed=True, reference="Reviewed")
        task.enqueue.assert_not_called()
    assert_no_mao_certificate(app)
    assert app.mao_confirmed_at is None


def test_confirmation_preserves_legacy_file_and_limits_review_details(case):
    app, users, client = ready_for_confirmation(case)
    app.mao_certificate_number = "OMA-EXISTING"
    app.mao_cert_issued_at = timezone.now()
    app.mao_certificate_pdf = "issued_docs/mao_cert/existing.pdf"
    app.save()
    original = app.mao_certificate_number, app.mao_cert_issued_at, app.mao_certificate_pdf.name
    confirm_mao_certificate(app, users["Agri"], confirmed=True, reference="Internal review")
    assert "already generated" in generate_mao_certificate_pdf.func(app.pk)
    app.refresh_from_db()
    assert (app.mao_certificate_number, app.mao_cert_issued_at, app.mao_certificate_pdf.name) == original
    for role in ["Agri", "Farmer", "Opv"]:
        client.force_authenticate(users[role])
        response = client.get(reverse("permitapplication-detail", args=[app.pk]))
        assert response.status_code == 200
        assert ("mao_confirmation_reference" in response.data) == (role == "Agri")


def test_retained_file_is_withheld_until_confirmation_but_released_history_downloads(case):
    from django.core.files.base import ContentFile
    from rest_framework_simplejwt.tokens import AccessToken
    app, users, client = ready_for_confirmation(case)
    app.mao_certificate_pdf.save("legacy.pdf", ContentFile(b"%PDF-1.4 historical"), save=True)
    path = app.mao_certificate_pdf.url
    token = str(AccessToken.for_user(users["Farmer"]))
    client.force_authenticate(user=None)
    assert client.get(path, {"token": token}).status_code == 403
    app.status = app.Status.RELEASED
    app.save(update_fields=["status"])
    response = client.get(path, {"token": token})
    assert response.status_code == 200
    assert b"".join(response.streaming_content).startswith(b"%PDF-")


@pytest.mark.parametrize("status", ["OPV_VALIDATED", "PAYMENT_PENDING"])
def test_old_jobs_and_certificate_files_do_not_imply_confirmation(case, status):
    from apps.permits.models import IssuedPermit
    from apps.permits.services.permit import issue_permit
    from apps.payment.services import _release_permit_and_queue_pdfs
    app, users, _ = ready_for_confirmation(case, status)
    app.mao_certificate_number = "OMA-LEGACY-1"
    app.mao_certificate_pdf = "issued_docs/mao_cert/legacy.pdf"
    app.save()
    with pytest.raises(ValidationError):
        issue_permit(app, users["Agri"])
    IssuedPermit.objects.create(application=app, issued_by=users["Agri"], permit_number="LEGACY", is_paid=True)
    assert _release_permit_and_queue_pdfs(app) is False
    assert "Skipped" in generate_mao_certificate_pdf.func(app.pk)
    app.refresh_from_db()
    assert app.status == status
    assert app.mao_certificate_number == "OMA-LEGACY-1"
    assert app.mao_certificate_pdf.name == "issued_docs/mao_cert/legacy.pdf"


def test_legacy_gateway_success_waits_then_confirmation_resumes_release(case, django_capture_on_commit_callbacks):
    from apps.payment.models import PaymentHistory
    from apps.payment.services import verify_paymongo_session
    from apps.permits.models import IssuedPermit
    app, users, client = ready_for_confirmation(case, "PAYMENT_PENDING")
    permit = IssuedPermit.objects.create(application=app, issued_by=users["Agri"], permit_number="LEGACY", permit_fee=150)
    history = PaymentHistory.objects.create(issued_permit=permit, amount=150, paymongo_session_id="cs_old", status="PENDING")
    with mock.patch("apps.payment.services.requests.get") as get:
        get.return_value.status_code = 200
        get.return_value.json.return_value = {"data": {"attributes": {"status": "paid", "amount": 15000}}}
        assert verify_paymongo_session(app.pk, users["Farmer"])[0]
    app.refresh_from_db()
    permit.refresh_from_db()
    history.refresh_from_db()
    assert history.status == "SUCCESS" and permit.is_paid
    assert app.status == "PAYMENT_PENDING"
    assert not permit.mao_certificate_number
    with mock.patch("apps.documents.services.generate_mao_certificate_pdf") as task:
        with django_capture_on_commit_callbacks(execute=True):
            confirm_mao_certificate(app, users["Agri"], confirmed=True, reference="Official review")
        task.enqueue.assert_called_once_with(permit_application_id=app.pk, issued_by_user_id=users["Agri"].pk)
    app.refresh_from_db()
    assert app.status == "RELEASED"
    assert history.status == "SUCCESS"


@pytest.mark.django_db(transaction=True)
def test_concurrent_confirmations_preserve_first_identity(case):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from django.db import connections
    app, users, _ = ready_for_confirmation(case)
    ready = Barrier(2)
    def confirm(reference):
        try:
            stale = PermitApplication.objects.get(pk=app.pk)
            ready.wait(timeout=10)
            result = confirm_mao_certificate(stale, users["Agri"], confirmed=True, reference=reference)
            return result.mao_certificate_number, result.mao_confirmation_reference
        finally:
            connections.close_all()
    with mock.patch("apps.documents.services.generate_mao_certificate_pdf") as task:
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(confirm, ["Review A", "Review B"]))
        task.enqueue.assert_called_once()
    assert results[0] == results[1]
    assert MaoCertNumberCounter.objects.get().last_number == 1


def test_opv_approval_does_not_assign_or_queue_mao(case, django_capture_on_commit_callbacks):
    app, users, client = case
    forward(app)
    client.force_authenticate(users["Opv"])
    with mock.patch("apps.documents.services.generate_mao_certificate_pdf") as pdf_task:
        task = pdf_task.enqueue
        with django_capture_on_commit_callbacks(execute=True):
            response = client.post(
                reverse("opvvalidation-approve", args=[app.pk]),
                {"aic_verified": "true", **documents()}, format="multipart",
            )
            assert response.status_code == 200
            task.assert_not_called()
            app.refresh_from_db()
            assert app.status == PermitApplication.Status.OPV_VALIDATED
            assert app.opv_validation.veterinary_health_certificate
            assert app.opv_validation.transportation_pass
            assert not app.mao_certificate_number
            assert not app.mao_cert_issued_at
            assert not app.mao_certificate_pdf
        task.assert_not_called()


@pytest.mark.parametrize("missing", ["veterinary_health_certificate", "transportation_pass", "aic_verified"])
def test_incomplete_opv_return_cannot_create_mao(case, missing, django_capture_on_commit_callbacks):
    app, users, client = case
    forward(app)
    client.force_authenticate(users["Opv"])
    data = {"aic_verified": "true", **documents()}
    del data[missing]
    with mock.patch("apps.documents.services.generate_mao_certificate_pdf") as pdf_task:
        task = pdf_task.enqueue
        with django_capture_on_commit_callbacks(execute=True):
            response = client.post(reverse("opvvalidation-approve", args=[app.pk]), data, format="multipart")
        assert response.status_code == 400
        task.assert_not_called()
    assert_no_mao_certificate(app)
    assert app.status == PermitApplication.Status.FORWARDED_TO_OPV
    assert not OPVValidation.objects.filter(application=app).exists()


@pytest.mark.parametrize("role", ["Farmer", "Agri"])
def test_other_roles_cannot_trigger_mao(case, role, django_capture_on_commit_callbacks):
    app, users, client = case
    forward(app)
    client.force_authenticate(users[role])
    with mock.patch("apps.documents.services.generate_mao_certificate_pdf") as pdf_task:
        task = pdf_task.enqueue
        with django_capture_on_commit_callbacks(execute=True):
            response = client.post(
                reverse("opvvalidation-approve", args=[app.pk]),
                {"aic_verified": "true", **documents()}, format="multipart",
            )
        assert response.status_code == 403
        task.assert_not_called()
    assert_no_mao_certificate(app)


def test_approval_rollback_discards_mao_metadata_and_task(case, django_capture_on_commit_callbacks):
    app, users, _ = case
    forward(app)
    with mock.patch("apps.documents.services.generate_mao_certificate_pdf") as pdf_task, \
            mock.patch("apps.permits.services.opv.AuditTrail.objects.create", side_effect=RuntimeError("audit unavailable")):
        with django_capture_on_commit_callbacks(execute=True):
            with pytest.raises(RuntimeError, match="audit unavailable"):
                approve_opv_validation(app, users["Opv"], {"aic_verified": True}, documents())
        pdf_task.enqueue.assert_not_called()
    assert_no_mao_certificate(app)
    assert app.status == PermitApplication.Status.FORWARDED_TO_OPV
    assert not OPVValidation.objects.filter(application=app).exists()
    assert not MaoCertNumberCounter.objects.exists()


def test_opv_cannot_approve_before_mao_forwarding(case, django_capture_on_commit_callbacks):
    app, users, client = case
    client.force_authenticate(users["Opv"])
    with mock.patch("apps.documents.services.generate_mao_certificate_pdf") as task:
        with django_capture_on_commit_callbacks(execute=True):
            response = client.post(
                reverse("opvvalidation-approve", args=[app.pk]),
                {"aic_verified": "true", **documents()}, format="multipart",
            )
        assert response.status_code == 400
        task.enqueue.assert_not_called()
    assert_no_mao_certificate(app)


def test_stale_duplicate_approval_cannot_issue_twice(case, django_capture_on_commit_callbacks):
    app, users, _ = case
    forward(app)
    stale = PermitApplication.objects.get(pk=app.pk)
    with mock.patch("apps.documents.services.generate_mao_certificate_pdf") as pdf_task:
        task = pdf_task.enqueue
        with django_capture_on_commit_callbacks(execute=True):
            approve_opv_validation(app, users["Opv"], {"aic_verified": True}, documents())
            app.refresh_from_db()
            original = app.mao_certificate_number, app.mao_cert_issued_at
            with pytest.raises(ValidationError):
                approve_opv_validation(stale, users["Opv"], {"aic_verified": True}, documents())
        task.assert_not_called()
    app.refresh_from_db()
    assert (app.mao_certificate_number, app.mao_cert_issued_at) == original
    assert OPVValidation.objects.filter(application=app).count() == 1


@pytest.mark.parametrize("status,opv_status,missing", [
    ("FORWARDED_TO_OPV", "VALIDATED", None),
    ("OPV_REJECTED", "REJECTED", None),
    ("OPV_VALIDATED", None, None),
    ("OPV_VALIDATED", "REJECTED", None),
    ("OPV_VALIDATED", "VALIDATED", "veterinary_health_certificate"),
    ("OPV_VALIDATED", "VALIDATED", "transportation_pass"),
])
def test_worker_skips_premature_jobs(case, status, opv_status, missing):
    app, users, _ = case
    app.status = status
    app.save(update_fields=["status"])
    if opv_status:
        fields = documents()
        if missing:
            del fields[missing]
        OPVValidation.objects.create(application=app, opv_staff=users["Opv"], status=opv_status, **fields)
    with mock.patch("apps.documents.services.permit_documents._retry_pdf_task") as retry:
        result = generate_mao_certificate_pdf.func(app.pk)
        retry.assert_not_called()
    assert "Skipped" in result
    assert_no_mao_certificate(app)


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("worker_stage", ["OPV_VALIDATED", "PAYMENT_PENDING", "RELEASED"])
def test_real_worker_creates_mao_only_after_confirmation(case, settings, worker_stage):
    from django_tasks_db.models import DBTaskResult
    from apps.payment.services import confirm_offline_payment
    from apps.permits.services.permit import issue_permit

    app, users, client = case
    forward(app)
    settings.TASKS = {
        "default": {"BACKEND": "django_tasks_db.DatabaseBackend", "QUEUES": ["default", "mao-timing-test"]},
    }
    # Only this task enters the isolated test queue. SMS and other work stay out.
    task = generate_mao_certificate_pdf.using(queue_name="mao-timing-test")
    client.force_authenticate(users["Opv"])
    with mock.patch("apps.documents.services.generate_mao_certificate_pdf", task):
        response = client.post(
            reverse("opvvalidation-approve", args=[app.pk]),
            {"aic_verified": "true", **documents()}, format="multipart",
        )
    assert response.status_code == 200
    app.refresh_from_db()
    assert app.opv_validation.veterinary_health_certificate
    assert app.opv_validation.transportation_pass
    assert not DBTaskResult.objects.filter(queue_name="mao-timing-test").exists()
    with mock.patch("apps.documents.services.generate_mao_certificate_pdf", task):
        confirm_mao_certificate(app, users["Agri"], confirmed=True, reference="Official review 123")
    app.refresh_from_db()
    original = app.mao_certificate_number, app.mao_cert_issued_at
    assert original[0] and original[1]
    assert not app.mao_certificate_pdf
    job = DBTaskResult.objects.get(queue_name="mao-timing-test")
    assert job.status == "READY"

    if worker_stage in ["PAYMENT_PENDING", "RELEASED"]:
        issue_permit(app, users["Agri"])
        app.refresh_from_db()
    if worker_stage == "RELEASED":
        confirm_offline_payment(app.pk, users["Agri"], "OR-MAO-TIMING")
        app.refresh_from_db()

    call_command("db_worker", queue_name="mao-timing-test", batch=True,
                 reload=False, startup_delay=False, interval=0, stdout=StringIO())
    job.refresh_from_db()
    assert job.status == "SUCCESSFUL", job.traceback
    app.refresh_from_db()
    assert app.mao_certificate_pdf.read().startswith(b"%PDF-")
    assert (app.mao_certificate_number, app.mao_cert_issued_at) == original

    # Repeated worker execution also preserves identity and copies to later permits.
    if worker_stage == "OPV_VALIDATED":
        issue_permit(app, users["Agri"])
    generate_mao_certificate_pdf.func(app.pk)
    app.refresh_from_db()
    permit = app.issued_permit
    assert permit.mao_certificate_number == original[0]
    assert permit.mao_certificate_pdf.read().startswith(b"%PDF-")
    assert (app.mao_certificate_number, app.mao_cert_issued_at) == original

    if worker_stage == "RELEASED":
        from apps.documents.services import generate_aic_pdf, generate_permit_pdf
        generate_aic_pdf.func(app.pk)
        generate_permit_pdf.func(app.pk)
        client.force_authenticate(users["Agri"])
        response = client.get(reverse("issuedpermit-detail", args=[app.pk]))
        assert response.status_code == 200
        assert all(response.data[key] for key in [
            "veterinary_health_certificate", "transportation_pass",
            "issued_permit_pdf", "animal_inspection_certificate", "mao_certificate",
        ])


@pytest.mark.django_db(transaction=True)
def test_concurrent_opv_approvals_issue_one_certificate(case):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from django.db import connections

    app, users, _ = case
    forward(app)
    ready = Barrier(2)

    def approve():
        try:
            stale = PermitApplication.objects.get(pk=app.pk)
            ready.wait(timeout=10)
            try:
                approve_opv_validation(stale, users["Opv"], {"aic_verified": True}, documents())
                return "approved"
            except ValidationError:
                return "rejected"
        finally:
            connections.close_all()

    with mock.patch("apps.documents.services.generate_mao_certificate_pdf") as task:
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda _: approve(), range(2)))
        task.enqueue.assert_not_called()
    assert sorted(results) == ["approved", "rejected"]
    app.refresh_from_db()
    assert_no_mao_certificate(app)
    assert not MaoCertNumberCounter.objects.exists()
