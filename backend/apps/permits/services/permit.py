import uuid
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.api.models import Notification, AuditTrail, User
from apps.ocr.tasks import extract_document_info
from apps.sms.services import send_sms
from .. import models, serializers

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

def verify_permit(qr_token, user):
    """
    Verification endpoint used by the Inspector App to scan QR codes.
    Takes the qr_token and returns the associated permit details if valid.
    """
    if user.role not in ["Agri", "Opv", "Inspector", "Farmer"]:
        raise PermissionDenied("Unauthorized")

    issued_permit_instance = get_object_or_404(models.IssuedPermit, qr_token=qr_token)
    application_instance = issued_permit_instance.application

    if issued_permit_instance.valid_until < timezone.now().date():
        # Audit failure
        AuditTrail.objects.create(
            who_performed=user,
            what_performed=f"[FIELD INSPECTION] - Security QR Code scan failed for Application #{application_instance.application_id}. Result: EXPIRED.",
            when_performed=timezone.now(),
        )
        raise ValidationError({
            "error": "This permit has expired. Transport is no longer authorized.",
            "expired_at": issued_permit_instance.valid_until,
        })

    if application_instance.is_checked:
        return application_instance, issued_permit_instance, True

    # --- Formal Audit Entry ---
    AuditTrail.objects.create(
        who_performed=user,
        what_performed=f"[FIELD INSPECTION] - Security QR Code scan performed for Application #{application_instance.application_id}. Result: VERIFIED.",
        when_performed=timezone.now(),
    )

    # 1. Notify Agri and Opv via system notifications
    admin_users = User.objects.filter(role__in=["Agri", "Opv"])
    for admin in admin_users:
        Notification.objects.create(
            recipient=admin,
            type=Notification.Type.INFO,
            title="Permit Scanned",
            message=f"Permit #{application_instance.application_id} has been scanned and verified by {user.get_full_name() or user.username}.",
        )

    # 2. Notify Farmer via SMS
    farmer = application_instance.farmer
    if farmer.phone_no:
        from apps.sms.task import send_scan_notification_sms
        timestamp_str = timezone.now().strftime('%Y-%m-%d %H:%M')
        transaction.on_commit(lambda: send_scan_notification_sms.enqueue(
            farmer.phone_no,
            application_instance.application_id,
            timestamp_str
        ))

    return application_instance, issued_permit_instance, False

def issue_permit(application, user):
    if user.role != "Agri":
        raise PermissionDenied("Only Agri officers can issue permits.")

    # Guard: Ensure the application has been validated by OPV
    if application.status != models.PermitApplication.Status.OPV_VALIDATED:
        raise ValidationError(
            f"Cannot issue permit for application with status: {application.status}. It must be OPV_VALIDATED."
        )

    # Guard: Prevent duplicate IssuedPermit for the same application (OneToOne constraint)
    if hasattr(application, "issued_permit"):
        raise ValidationError("A permit has already been issued for this application.")

    with transaction.atomic():
        issued_permit = models.IssuedPermit.objects.create(
            permit_number=uuid.uuid4().hex[:13].upper(),
            application=application,
            issued_by=user,
            qr_token=uuid.uuid4(),
        )

        # Advance status to Payment Pending
        from .application import handle_application_status_change
        handle_application_status_change(application, models.PermitApplication.Status.PAYMENT_PENDING)

        # --- Formal Audit Entry ---
        AuditTrail.objects.create(
            who_performed=user,
            what_performed=f"[PERMIT ISSUANCE] - Final Transport Permit {issued_permit.permit_number} issued for Application #{application.application_id} by {user.get_full_name()}. Status: PAYMENT_PENDING.",
            when_performed=timezone.now(),
        )
    return issued_permit

def get_issued_permit_details(application, user):
    # Ownership check for Farmer
    if user.role == "Farmer" and application.farmer != user:
        raise PermissionDenied("Unauthorized access to this permit.")

    # Guard: Check if OPV validation exists
    try:
        opv_docs_instance = application.opv_validation
    except models.OPVValidation.DoesNotExist:
        raise ValidationError(
            "OPV validation records not found for this application.", code="not_found"
        )

    # Guard: Check if IssuedPermit exists
    try:
        issued_permit_instance = application.issued_permit
    except models.IssuedPermit.DoesNotExist:
        raise ValidationError(
            "No permit has been issued for this application.", code="not_found"
        )

    # Guard: Only allow retrieval if paid
    if not issued_permit_instance.is_paid:
        raise PermissionDenied("This permit has not been paid for yet.")

    # Guard: Ensure PDF has been generated
    if not issued_permit_instance.permit_pdf:
        raise ValidationError(
            "Permit PDF is still being generated. Please try again in a moment.", code="pdf_generating"
        )

    return opv_docs_instance, issued_permit_instance
