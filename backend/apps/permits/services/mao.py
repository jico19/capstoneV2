from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.api.models import AuditTrail
from .. import models


def require_mao_confirmation(application):
    """Check persisted confirmation, never certificate file/number presence."""
    if not models.PermitApplication.objects.filter(
        pk=application.pk, mao_confirmed_at__isnull=False, mao_confirmed_by__isnull=False,
    ).exclude(mao_confirmation_reference="").exists():
        raise ValidationError("MAO Certificate confirmation is required before issuance or payment/release.")


def confirm_mao_certificate(application, user, *, confirmed, reference):
    if user.role != "Agri":
        raise PermissionDenied("Only Agri officers can confirm MAO Certificates.")
    if confirmed is not True:
        raise ValidationError({"confirmed": "Explicit confirmation is required."})
    if not isinstance(reference, str) or not reference.strip() or len(reference) > 1000:
        raise ValidationError({"reference": "Provide a document reference / review note of up to 1,000 characters."})

    with transaction.atomic():
        # Match the worker/payment lock order, including legacy issued applications.
        permit = models.IssuedPermit.objects.select_for_update().filter(application_id=application.pk).first()
        app = models.PermitApplication.objects.select_for_update().get(pk=application.pk)
        # A retry preserves the first officer, reference, date, and certificate identity.
        if app.mao_confirmed_at:
            return app
        if app.status not in {app.Status.OPV_VALIDATED, app.Status.PAYMENT_PENDING}:
            raise ValidationError("MAO confirmation requires OPV_VALIDATED or PAYMENT_PENDING status.")
        opv = models.OPVValidation.objects.filter(application=app).first()
        if not opv or opv.status != opv.Status.VALIDATED or not opv.veterinary_health_certificate or not opv.transportation_pass:
            raise ValidationError("OPV approval and both returned documents are required.")

        app.mao_confirmed_by = user
        app.mao_confirmed_at = timezone.now()
        app.mao_confirmation_reference = reference.strip()
        if not app.mao_certificate_number:
            from .numbers import get_mao_cert_number
            app.mao_certificate_number = (permit.mao_certificate_number if permit else "") or get_mao_cert_number(app)
        if not app.mao_cert_issued_at:
            app.mao_cert_issued_at = app.mao_confirmed_at
        app.save(update_fields=[
            "mao_confirmed_by", "mao_confirmed_at", "mao_confirmation_reference",
            "mao_certificate_number", "mao_cert_issued_at",
        ])
        AuditTrail.objects.create(
            who_performed=user,
            what_performed=(f"[MAO CERTIFICATE CONFIRMED] - Application #{app.application_id}; "
                            f"Certificate {app.mao_certificate_number}. Reference: {app.mao_confirmation_reference}"),
            when_performed=app.mao_confirmed_at,
        )
        from apps.documents.services import generate_mao_certificate_pdf
        transaction.on_commit(lambda: generate_mao_certificate_pdf.enqueue(
            permit_application_id=app.pk, issued_by_user_id=user.pk,
        ))
        if permit and permit.is_paid and app.status == app.Status.PAYMENT_PENDING:
            from apps.payment.services import _release_permit_and_queue_pdfs
            _release_permit_and_queue_pdfs(app, queue_mao=False)
        return app
