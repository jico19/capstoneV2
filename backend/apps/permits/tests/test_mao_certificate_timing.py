"""MAO certification follows the two returned OPV documents, using the worker."""
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


def test_opv_approval_queues_mao_only_after_commit(case, django_capture_on_commit_callbacks):
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
            assert app.mao_certificate_number
            assert app.mao_cert_issued_at
            assert not app.mao_certificate_pdf
        task.assert_called_once_with(permit_application_id=app.pk)


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
        task.assert_called_once_with(permit_application_id=app.pk)
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
def test_real_worker_creates_mao_only_after_both_opv_documents(case, settings, worker_stage):
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
        task.enqueue.assert_called_once_with(permit_application_id=app.pk)
    assert sorted(results) == ["approved", "rejected"]
    app.refresh_from_db()
    assert app.mao_certificate_number
    assert MaoCertNumberCounter.objects.get().last_number == 1
