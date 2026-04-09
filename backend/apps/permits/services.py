# permit related services
from . import models
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from apps.api.models import Notification
from django.db import transaction
from django.shortcuts import get_object_or_404
from apps.ocr.tasks import extract_document_info

def create_permit(files, application, user):

    if not files or len(files) < 5:
        raise ValidationError("No documents uploaded. Please upload the required documents.")

    docuement_ids = []

    for document_type,file in files.items():
            # create 5 documents
            data = models.SubmittedDocument.objects.create(
                application = application,
                document_type = document_type,
                file = file
            )
            docuement_ids.append(data.id) 
        

    Notification.objects.create(
        recipient = user,
        title = "Application Submitted",
        message = f"Your application #{application.pk} has been submitted successfully. Please wait for further updates."
    )


    # call the task to extract text from the document
    for d_id in docuement_ids:
    # This automatically respects on_commit if configured in your settings,
    # or you can wrap it in transaction.on_commit
        transaction.on_commit(lambda d_id=d_id: extract_document_info.enqueue(d_id))

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
        data = models.OPVValidation.objects.create(
            application_id = application_id,
            opv_staff = staff,
            status = models.OPVValidation.Status.REJECTED,
            remarks = data['remarks'],
        )
    except Exception:
        raise ValidationError("error creating opv validation model.")

# Status Helper
def handle_application_status_change(application, new_status, reason=None):
    """
    Centralized logic for updating application status and sending notifications.
    """
    if application.status == new_status:
        return

    application.status = new_status
    application.save()

    # Notification Logic Mapping
    notification_map = {
        models.PermitApplication.Status.OPV_REJECTED: {
            'title': 'Application Rejected',
            'message': f'Your application #{application.application_id} was rejected. Reason: {reason}.'
        },
        models.PermitApplication.Status.PAYMENT_PENDING: {
            'title': 'Permit is Ready',
            'message': f'Your application #{application.application_id} is ready! Please complete payment.'
        },
        models.PermitApplication.Status.RELEASED: {
            'title': 'Payment Confirmed — Documents Unlocked',
            'message': f'Your payment for #{application.application_id} has been confirmed!'
        }
    }

    if new_status in notification_map:
        data = notification_map[new_status]
        Notification.objects.create(
            recipient=application.farmer,
            title=data['title'],
            message=data['message']
        )
