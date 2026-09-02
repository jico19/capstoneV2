from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.api.models import AuditTrail
from .. import models
from .application import handle_application_status_change

def create_approve_opv_validation(application_id: int, files, staff, data):
    if not files or len(files) < 2:
        raise ValidationError("No documents uploaded. Please upload the required documents.")
    
    for key, file in files.items():
        if file.size > 30 * 1024 * 1024:
            raise ValidationError(f"File {file.name} exceeds the 30MB size limit.")
    
    try:
        opv_validation, created = models.OPVValidation.objects.update_or_create(
            application_id=application_id,  # lookup field — find by this
            defaults={
                "opv_staff": staff,
                "status": models.OPVValidation.Status.VALIDATED,
                "remarks": data.get('remarks', ''),
                "veterinary_health_certificate": files['veterinary_health_certificate'],
                "transportation_pass": files['transportation_pass'],
            }
        )
    except Exception as e:
        raise ValidationError(f"Error saving OPV validation: {e}")

def create_reject_opv_validation(application_id: int, data: dict, staff):
    try:
        validation_obj, created = models.OPVValidation.objects.update_or_create(
            application_id = application_id,
            defaults={
                "opv_staff": staff,
                "status": models.OPVValidation.Status.REJECTED,
                "remarks": data.get('remarks', ''),
                "veterinary_health_certificate": None,
                "transportation_pass": None,
            }
        )
        return validation_obj
    except Exception as e:
        raise ValidationError(f"error creating opv validation model: {e}")

def approve_opv_validation(application, staff, data, files):
    if staff.role != "Opv":
        raise PermissionDenied("Not Authorized")

    if application.status not in ["OPV_REJECTED", "FORWARDED_TO_OPV"]:
        raise ValidationError("This is already approved.")

    with transaction.atomic():
        create_approve_opv_validation(
            application_id=application.pk, files=files, data=data, staff=staff
        )

        handle_application_status_change(
            application,
            models.PermitApplication.Status.OPV_VALIDATED,
            reason=data.get('remarks')
        )

        # --- Formal Audit Entry ---
        AuditTrail.objects.create(
            who_performed=staff,
            what_performed=f"[PROVINCIAL VETERINARY REVIEW] - Health requirements validated for Application #{application.application_id}. Status updated to OPV_VALIDATED.",
            when_performed=timezone.now(),
        )

def handle_opv_rejection(application, staff, data, *, is_resubmission: bool = False):
    if staff.role != "Opv":
        raise PermissionDenied("Not Authorized")
    if application.status == "OPV_VALIDATED":
        raise ValidationError("This is already approved.")
    with transaction.atomic():
        create_reject_opv_validation(application_id=application.pk, staff=staff, data=data)
        handle_application_status_change(
            application,
            models.PermitApplication.Status.OPV_REJECTED,
            reason=data.get("remarks", "N/A"),
        )
        if is_resubmission:
            action_desc = f"[PROVINCIAL VETERINARY REVIEW] - Application #{application.application_id} returned for resubmission. Remarks: {data.get('remarks', 'N/A')}."
        else:
            action_desc = f"[PROVINCIAL VETERINARY REVIEW] - Application #{application.application_id} rejected by Veterinary Officer. Remarks: {data.get('remarks', 'N/A')}."
        AuditTrail.objects.create(
            who_performed=staff,
            what_performed=action_desc,
            when_performed=timezone.now(),
        )

def reject_opv_validation(application, staff, data):
    handle_opv_rejection(application, staff, data, is_resubmission=False)

def request_opv_resubmission(application, staff, data):
    handle_opv_rejection(application, staff, data, is_resubmission=True)
