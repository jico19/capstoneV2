# permit related services
from . import models, serializers
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

    required_common = ['traders_pass', 'handlers_license', 'transport_carrier_reg']
    for req in required_common:
        if req not in files:
            raise ValidationError(f"Missing required document: {req.replace('_', ' ').title()}")

    origins = list(application.origins.all()) 
    for i in range(len(origins)):
        if f'origin_{i}_cis' not in files:
            raise ValidationError(f"Missing Certificate of Inspection and Stewardship (CIS) for origin #{i+1}")
        if f'origin_{i}_endorsement_cert' not in files:
            raise ValidationError(f"Missing Barangay Endorsement Certificate for origin #{i+1}")

    document_ids = []
    
    # Map temporary origin index from request to actual DB ID
    # Since we saved the application and origins first, we can map them
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
        
        serializer = serializers.SubmittedDocumentWriteSerializer(data={
            'origin': origin.id,
            'document_type': doc_type,
            'file': file
        })
        serializer.is_valid(raise_exception=True)
        doc = serializer.save()
        document_ids.append(doc.id)
        
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
    origins = list(application.origins.all())

    if not origins:
        raise ValidationError("Application has no transport origins. Cannot resubmit documents.")

    for key, file in files.items():
        if key.startswith('origin_'):
            parts = key.split('_')
            if len(parts) < 3: continue
            origin_id = parts[1]
            doc_type = '_'.join(parts[2:])
            origin = get_object_or_404(models.TransportOrigin, id=origin_id, application=application)
        else:
            # Common documents linked to the first origin
            doc_type = key
            origin = origins[0]
        
        # Check if document already exists
        existing_doc = models.SubmittedDocument.objects.filter(origin=origin, document_type=doc_type).first()
        
        if existing_doc:
            serializer = serializers.SubmittedDocumentWriteSerializer(existing_doc, data={
                'origin': origin.id,
                'document_type': doc_type,
                'file': file
            })
        else:
            serializer = serializers.SubmittedDocumentWriteSerializer(data={
                'origin': origin.id,
                'document_type': doc_type,
                'file': file
            })
            
        serializer.is_valid(raise_exception=True)
        doc = serializer.save()
        document_ids.append(doc.id)

        # Clear OCR results for updated documents
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
