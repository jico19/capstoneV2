# permit related services
from . import models
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from apps.api.models import Notification
from django.db import transaction
from django.shortcuts import get_object_or_404
from apps.ocr.tasks import extract_document_info
from apps.api.models import AuditTrail

def create_permit(files, application, user):
    # files dict keys should be structured as 'origin_<ID>_<docType>' 
    # where ID is the temporary index in the FormData
    if not files:
        raise ValidationError("No documents uploaded. Please upload the required documents.")

    document_ids = []
    
    # Map temporary origin index from request to actual DB ID
    # Since we saved the application and origins first, we can map them
    origins = list(application.origins.all()) 

    for key, file in files.items():
        # key format: 'traders_pass', 'origin_<temp_index>_<doc_type>'
        if key.startswith('origin_'):
            parts = key.split('_')
            temp_index = int(parts[1])
            doc_type = '_'.join(parts[2:])
            origin = origins[temp_index]
        else:
            # Common documents linked to the first origin (or handled appropriately)
            doc_type = key
            origin = origins[0]
        
        data = models.SubmittedDocument.objects.create(
            origin=origin,
            document_type=doc_type,
            file=file
        )
        document_ids.append(data.id)
        
    Notification.objects.create(
        type=Notification.Type.INFO,
        recipient=user,
        title="Application Submitted",
        message=f"Your application #{application.application_id} has been submitted successfully."
    )

    for d_id in document_ids:
        transaction.on_commit(lambda d_id=d_id: extract_document_info.enqueue(d_id))

def resubmit_permit(files, application, user):
    """
    Handles the logic for resubmitting an application.
    Updates existing documents linked to origins.
    """
    document_ids = []

    for key, file in files.items():
        parts = key.split('_')
        if len(parts) < 3: continue
        origin_id = parts[1]
        doc_type = '_'.join(parts[2:])

        origin = get_object_or_404(models.TransportOrigin, id=origin_id, application=application)
        
        doc, created = models.SubmittedDocument.objects.update_or_create(
            origin=origin,
            document_type=doc_type,
            defaults={'file': file}
        )
        document_ids.append(doc.id)

        if not created:
             models.OCRValidationResult.objects.filter(document=doc).delete()

    for d_id in document_ids:
        transaction.on_commit(lambda d_id=d_id: extract_document_info.enqueue(d_id))
    
    Notification.objects.create(
        type=Notification.Type.INFO,
        recipient=user,
        title="Application Resubmitted",
        message=f"Your application #{application.application_id} has been resubmitted successfully."
    )

def create_approve_opv_validation(application_id: int, files, staff, data):
    if not files or len(files) < 2:
        raise ValidationError("No documents uploaded. Please upload the required documents.")
    
    try:
        opv_validation, created = models.OPVValidation.objects.update_or_create(
            application_id=application_id,  # lookup field — find by this
            defaults={
                "opv_staff": staff,
                "status": models.OPVValidation.Status.VALIDATED,
                "remarks": data['remarks'],
                "veterinary_health_certificate": files['veterinary_health_certificate'],
                "transportation_pass": files['transportation_pass'],
            }
        )
    except Exception as e:
        raise ValidationError(f"Error saving OPV validation: {e}")

def create_reject_opv_validation(application_id: int, data: dict, staff):
    try:
        validation_obj = models.OPVValidation.objects.create(
            application_id = application_id,
            opv_staff = staff,
            status = models.OPVValidation.Status.REJECTED,
            remarks = data['remarks'],
        )
        return validation_obj
    except Exception:
        raise ValidationError("error creating opv validation model.")

# Status Helper
def handle_application_status_change(application, new_status, reason=None):
    if application.status == new_status:
        return

    application.status = new_status
    application.save()

    Status = models.PermitApplication.Status
    app_id = application.application_id

    notification_map = {
        Status.OPV_REJECTED: (
            Notification.Type.WARNING,
            'Application Rejected',
            f'Your application #{app_id} was rejected. Reason: {reason}.',
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
