from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.api.models import Notification, AuditTrail
from .. import models, serializers
from .permit import resubmit_permit

def handle_application_status_change(application, new_status, reason=None):
    if application.status == new_status:
        return

    application.status = new_status
    application.save()

    Status = models.PermitApplication.Status
    app_id = application.application_id

    # Queue SMS status update task (replaces sms signals)
    monitored_statuses = [
        Status.FORWARDED_TO_OPV,
        Status.RESUBMISSION,
        Status.OPV_VALIDATED,
        Status.OPV_REJECTED,
        Status.PERMIT_ISSUED,
        Status.PAYMENT_PENDING,
        Status.RELEASED,
    ]
    if new_status in monitored_statuses:
        from django.db import transaction as db_transaction
        from apps.sms.task import send_via_status
        db_transaction.on_commit(lambda: send_via_status.enqueue(application.id))

    # When a permit is officially released (payment confirmed), deduct from HogSurvey.
    if new_status == Status.RELEASED:
        try:
            from .permit import deduct_hog_survey_for_application
            deduct_hog_survey_for_application(application)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(
                f"HogSurvey deduction failed for application #{application.application_id}: {e}"
            )

    notification_map = {
        Status.OPV_REJECTED: (
            Notification.Type.WARNING,
            'Application Rejected',
            f'Your application #{app_id} was rejected. Reason: {reason}.',
        ),
        Status.RESUBMISSION: (
            Notification.Type.WARNING,
            'Correction Required',
            f'Your application #{app_id} needs corrections. Please check the remarks: {reason}.',
        ),
        Status.PAYMENT_PENDING: (
            Notification.Type.INFO,
            'Permit is Ready',
            f'Your application #{app_id} is ready! Please complete payment.',
        ),
        Status.RELEASED: (
            Notification.Type.SUCCESS,
            'Payment Confirmed — Documents Unlocked',
            f'Your payment for #{app_id} has been confirmed!',
        ),
    }

    if new_status in notification_map:
        notif_type, title, message = notification_map[new_status]
        Notification.objects.create(
            recipient=application.farmer,
            type=notif_type,
            title=title,
            message=message,
        )

def approve_application(application, user, remarks):
    """
    Agri officer approval to forward the application to OPV and auto-generate AIC.
    """
    if user.role != "Agri":
        raise PermissionDenied("Only Agri officers can approve applications.")

    approvable_statuses = [
        models.PermitApplication.Status.SUBMITTED,
        models.PermitApplication.Status.OCR_VALIDATED,
        models.PermitApplication.Status.MANUAL,
    ]

    if application.status not in approvable_statuses:
        raise ValidationError(
            f"Cannot approve an application with status '{application.status}'."
        )

    with transaction.atomic():
        # Ensure AIC number and issue timestamp on application
        if not application.aic_number:
            from apps.payment.services import _generate_aic_number
            application.aic_number = _generate_aic_number(application)
            application.aic_issued_at = timezone.now()
            application.save(update_fields=["aic_number", "aic_issued_at"])
        elif not application.aic_issued_at:
            application.aic_issued_at = timezone.now()
            application.save(update_fields=["aic_issued_at"])

        handle_application_status_change(application, models.PermitApplication.Status.FORWARDED_TO_OPV)

        # Trigger AIC PDF generation
        from apps.documents.services import generate_aic_pdf
        transaction.on_commit(
            lambda: generate_aic_pdf.enqueue(
                permit_application_id=application.pk,
                issued_by_user_id=user.pk
            )
        )

        # Create notification for the farmer
        Notification.objects.create(
            recipient=application.farmer,
            type=Notification.Type.SUCCESS,
            title="Animal Inspection Certificate (AIC) Issued",
            message=(
                f"Your permit application #{application.application_id} has been approved by MAO (AIC #{application.aic_number}) and forwarded to OPV for provincial validation.\n\nRemarks: {remarks}"
                if remarks
                else f"Your permit application #{application.application_id} has been approved by MAO (AIC #{application.aic_number}) and forwarded to OPV."
            ),
        )

        # --- Formal Audit Entry ---
        AuditTrail.objects.create(
            who_performed=user,
            what_performed=f"[AGRI OFFICER REVIEW] - Application #{application.application_id} approved. AIC #{application.aic_number} generated and forwarded to OPV.",
            when_performed=timezone.now(),
        )

def reject_application(application, user, remarks):
    """
    Agri officer rejection - sends application back for resubmission.
    """
    if user.role != "Agri":
        raise PermissionDenied("Only Agri officers can reject applications.")

    rejectable_statuses = [
        models.PermitApplication.Status.SUBMITTED,
        models.PermitApplication.Status.OCR_VALIDATED,
        models.PermitApplication.Status.MANUAL,
    ]

    if application.status not in rejectable_statuses:
        raise ValidationError(
            f"Cannot reject an application with status '{application.status}'."
        )

    if not remarks:
        raise ValidationError("Remarks are required when rejecting an application.")

    with transaction.atomic():
        handle_application_status_change(application, models.PermitApplication.Status.RESUBMISSION, reason=remarks)

        # --- Formal Audit Entry ---
        AuditTrail.objects.create(
            who_performed=user,
            what_performed=f"[AGRI OFFICER REVIEW] - Application #{application.application_id} returned for resubmission. Reason: {remarks}.",
            when_performed=timezone.now(),
        )

def resubmit_application(application, user, serializer_data, files):
    """
    Farmer resubmission - allows updating details and documents for rejected applications.
    """
    if user.role != "Farmer":
        raise PermissionDenied("Only farmers can resubmit their applications.")

    # Guard: Only allow resubmission if status is RESUBMISSION or OPV_REJECTED
    if application.status not in [
        models.PermitApplication.Status.RESUBMISSION,
        models.PermitApplication.Status.OPV_REJECTED
    ]:
        raise ValidationError(
            f"Cannot resubmit an application with status '{application.status}'."
        )

    with transaction.atomic():
        # Update basic application data if provided
        serializer = serializers.PermitApplicationWriteSerializer(
            application, data=serializer_data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Handle document updates/replacements
        if files:
            resubmit_permit(
                files=files,
                application=application,
                user=user,
            )

        # Set status based on who rejected it
        if application.status == models.PermitApplication.Status.OPV_REJECTED:
            handle_application_status_change(application, models.PermitApplication.Status.FORWARDED_TO_OPV)
        else:
            handle_application_status_change(application, models.PermitApplication.Status.SUBMITTED)

        # --- Formal Audit Entry ---
        AuditTrail.objects.create(
            who_performed=user,
            what_performed=f"[FARMER RESUBMISSION] - Application #{application.application_id} resubmitted with updated information/documents.",
            when_performed=timezone.now(),
        )
