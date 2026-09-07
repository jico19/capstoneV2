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
    origins = list(application.origins.all())
    if not origins:
        raise ValidationError("Application has no transport origins.")

    required_common = ['traders_pass', 'handlers_license', 'transport_carrier_reg']
    user_farmer_docs = {
        doc.document_type: doc for doc in getattr(user, 'farmer_documents', []).all()
    } if hasattr(user, 'farmer_documents') else {}

    auto_attached_docs = {}
    for req in required_common:
        if req not in files:
            if req in user_farmer_docs and user_farmer_docs[req].file:
                auto_attached_docs[req] = user_farmer_docs[req].file
            else:
                raise ValidationError(f"Missing required document: {req.replace('_', ' ').title()}")

    for i in range(len(origins)):
        if f'origin_{i}_cis' not in files:
            raise ValidationError(f"Missing Certificate of Inspection and Stewardship (CIS) for origin #{i+1}")
        if f'origin_{i}_endorsement_cert' not in files:
            raise ValidationError(f"Missing Barangay Endorsement Certificate for origin #{i+1}")

    document_ids = []

    # Map temporary origin index from request to actual DB ID
    # Since we saved the application and origins first, we can map them
    for key, file in files.items():
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

    # Save auto-attached verified documents
    for doc_type, file_field in auto_attached_docs.items():
        if not models.SubmittedDocument.objects.filter(origin=origins[0], document_type=doc_type).exists():
            doc = models.SubmittedDocument.objects.create(
                origin=origins[0],
                document_type=doc_type,
                file=file_field
            )
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

    # 3. Notify Source Farmers via SMS
    from apps.sms.task import send_source_farmer_scan_sms
    timestamp_str = timezone.now().strftime('%Y-%m-%d %H:%M')
    notified_numbers = set()
    if farmer.phone_no:
        notified_numbers.add(farmer.phone_no)

    for origin in application_instance.origins.all():
        s_phone = (origin.source_phone_no or "").strip()
        if s_phone and s_phone not in notified_numbers:
            notified_numbers.add(s_phone)
            s_name = origin.source_farmer_name or ""
            transaction.on_commit(lambda p=s_phone, n=s_name: send_source_farmer_scan_sms.enqueue(
                p,
                application_instance.application_id,
                n,
                timestamp_str
            ))

    return application_instance, issued_permit_instance, False

def issue_permit(application, user, permit_fee=None):
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

    if permit_fee is None:
        permit_fee = models.MunicipalConfig.get_fee()

    with transaction.atomic():
        issued_permit = models.IssuedPermit.objects.create(
            permit_number=uuid.uuid4().hex[:13].upper(),
            application=application,
            issued_by=user,
            qr_token=uuid.uuid4(),
            permit_fee=permit_fee,
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

    # Guard: Ensure PDFs have been generated
    if not issued_permit_instance.permit_pdf or not issued_permit_instance.aic_pdf:
        raise ValidationError(
            "Permit PDF is still being generated. Please try again in a moment.", code="pdf_generating"
        )

    return opv_docs_instance, issued_permit_instance


def deduct_hog_survey_for_application(application):
    """
    Deducts pig counts from HogSurvey for all origins of a RELEASED application.
    Matches the specific source farmer in the barangay if registered in HogSurvey;
    otherwise falls back to the latest survey for that barangay.
    Clamps counts to 0 and does not invent fake records.
    """
    import logging
    from apps.maps.models import HogSurvey
    from django.utils import timezone
    from django.db import transaction

    logger = logging.getLogger(__name__)
    current_year = timezone.now().year

    with transaction.atomic():
        for origin in application.origins.all():
            target_survey = None
            # 1. Try to find survey record matching the source farmer name in this barangay
            if origin.source_farmer_name:
                target_survey = HogSurvey.objects.select_for_update().filter(
                    barangay=origin.barangay,
                    survey_date__year=current_year,
                    farmer_name__iexact=origin.source_farmer_name.strip()
                ).order_by('-survey_date').first()

            # 2. Fallback to latest survey for the barangay
            if not target_survey:
                target_survey = HogSurvey.objects.select_for_update().filter(
                    barangay=origin.barangay,
                    survey_date__year=current_year
                ).order_by('-survey_date').first()

            if not target_survey:
                logger.warning(
                    f"deduct_hog_survey: No survey record found for barangay '{origin.barangay.name}' "
                    f"in {current_year}. Skipping deduction for origin #{origin.pk}."
                )
                continue

            # Decrement counts safely without going below 0
            target_survey.inahin = max(0, target_survey.inahin - origin.inahin)
            target_survey.barako = max(0, target_survey.barako - origin.barako)
            target_survey.fattener = max(0, target_survey.fattener - origin.fattener)
            target_survey.grower = max(0, target_survey.grower - origin.grower)
            target_survey.bulaw = max(0, target_survey.bulaw - origin.bulaw)
            target_survey.starter = max(0, target_survey.starter - origin.starter)
            target_survey.total_pigs = (
                target_survey.inahin + target_survey.barako + target_survey.fattener +
                target_survey.grower + target_survey.bulaw + target_survey.starter
            )
            target_survey.save()
            logger.info(
                f"Successfully deducted stock from HogSurvey #{target_survey.pk} "
                f"({target_survey.barangay.name} - {target_survey.farmer_name or 'General'}) "
                f"for origin #{origin.pk}."
            )
