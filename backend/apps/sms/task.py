import logging
from datetime import timedelta
from django.tasks import task
from apps.permits import models as permits
from .models import SMSLog
from .services import send_sms
from django.shortcuts import get_object_or_404

logger = logging.getLogger(__name__)

@task(takes_context=True)
def send_via_status(context, application_id):
    """
    Sends a status update SMS to the farmer.
    Uses django-tasks TaskContext for non-blocking retries on gateway failure.
    """
    # Fetch the application using the ID
    try:
        application = permits.PermitApplication.objects.get(pk=application_id)
    except permits.PermitApplication.DoesNotExist:
        logger.error(f"PermitApplication {application_id} not found for SMS task.")
        return

    # Respect user preference for receiving SMS
    if not application.farmer.receive_sms:
        return

    phone_no = application.farmer.phone_no
    current_status = application.status
    masked_phone = f"{phone_no[:4]}****{phone_no[-2:]}" if len(phone_no) > 6 else phone_no

    # Guard: Check if an SMS for this specific status has already been sent to this number
    already_sent = SMSLog.objects.filter(
        phone_number=phone_no,
        status_captured=current_status,
        message_type=SMSLog.Type.NOTIFICATION
    ).exists()

    if already_sent:
        logger.info(f"SMS already sent for {application.application_id} status {current_status}. Skipping.")
        return

    logger.info(f"Preparing status update for {application.application_id} (Status: {current_status})")
    
    message = ""
    Status = permits.PermitApplication.Status

    if current_status == Status.OPV_VALIDATED:
        message = f"LIVESTOCKPASS: Your application {application.application_id} has been validated by the Office of the Provincial Veterinarian. Please wait for further updates regarding permit issuance."
    elif current_status == Status.OPV_REJECTED:
        message = f"LIVESTOCKPASS: Your application {application.application_id} has been rejected by the OPV. Please log in to your portal account to view the remarks."
    elif current_status == Status.RESUBMISSION:
        message = f"LIVESTOCKPASS: Your application {application.application_id} requires resubmission. Please check the remarks in your portal account and update your application."
    elif current_status in [Status.PERMIT_ISSUED, Status.PAYMENT_PENDING]:
        message = f"LIVESTOCKPASS: Your permit for application {application.application_id} has been issued and is now awaiting payment. Please settle the fees to release your permit."
    elif current_status == Status.RELEASED:
        message = f"LIVESTOCKPASS: Your permit for application {application.application_id} has been released. You may now download and use your permit. Thank you!"

    if message:
        success = send_sms(
            phone_number=phone_no,
            message=message
        )

        if success:
            # Create a SMS Log with the captured status
            SMSLog.objects.create(
                phone_number=phone_no,
                message_type=SMSLog.Type.NOTIFICATION,
                status_captured=current_status
            )
            logger.info(f"Successfully sent and logged status update for {application.application_id}")
        else:
            # Handle failure with retry
            attempt = context.task_result.attempt_count
            MAX_ATTEMPTS = 3
            if attempt < MAX_ATTEMPTS:
                wait_time = 60 * attempt  # 60s, 120s
                logger.warning(f"SMS delivery failed for {application.application_id} to {masked_phone}. Retrying in {wait_time}s... (Attempt {attempt})")
                send_via_status.using(run_after=timedelta(seconds=wait_time)).enqueue(application_id)
            else:
                logger.error(f"Max attempts reached for SMS status update on application {application.application_id}")