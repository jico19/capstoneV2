import logging
from datetime import timedelta
from django.tasks import task
from apps.permits import models as permits
from .models import SMSLog
from .services import send_sms

logger = logging.getLogger(__name__)


@task()
def send_via_status(application_id, attempt=1):
    """
    Sends a status update SMS to the farmer.
    Uses django-tasks for background delivery and retries on gateway failure.
    """
    try:
        application = permits.PermitApplication.objects.get(pk=application_id)
    except permits.PermitApplication.DoesNotExist:
        logger.error(f"PermitApplication {application_id} not found for SMS task.")
        return

    if not application.farmer or not application.farmer.receive_sms or not application.farmer.phone_no:
        return

    phone_no = application.farmer.phone_no.strip()
    current_status = application.status
    masked_phone = (
        f"{phone_no[:4]}****{phone_no[-2:]}" if len(phone_no) > 6 else phone_no
    )

    # Scoped deduplication per application AND status
    already_sent = SMSLog.objects.filter(
        application=application,
        status_captured=current_status,
        message_type=SMSLog.Type.NOTIFICATION,
    ).exists()

    if already_sent:
        logger.info(
            f"SMS already sent for application {application.application_id} at status {current_status}. Skipping."
        )
        return

    logger.info(
        f"Preparing status update for {application.application_id} (Status: {current_status})"
    )

    message = ""
    Status = permits.PermitApplication.Status

    if current_status == Status.FORWARDED_TO_OPV:
        aic_str = f" (AIC #{application.aic_number})" if application.aic_number else ""
        message = f"FarmPass: Application {application.application_id} approved by MAO{aic_str}. Forwarded to OPV for provincial validation."
    elif current_status == Status.OPV_VALIDATED:
        message = f"FarmPass: Application {application.application_id} validated by OPV. Awaiting permit issuance."
    elif current_status == Status.OPV_REJECTED:
        message = f"FarmPass: Application {application.application_id} was rejected by OPV. Please check remarks on your FarmPass portal."
    elif current_status == Status.RESUBMISSION:
        message = f"FarmPass: Application {application.application_id} requires resubmission. Please check remarks on your FarmPass portal."
    elif current_status in [Status.PERMIT_ISSUED, Status.PAYMENT_PENDING]:
        message = f"FarmPass: Permit for {application.application_id} is ready and awaiting payment. Settle fees to release."
    elif current_status == Status.RELEASED:
        message = f"FarmPass: Permit for {application.application_id} has been released. You may now download it from your portal."

    if message:
        success = send_sms(phone_number=phone_no, message=message)

        if success:
            SMSLog.objects.create(
                application=application,
                phone_number=phone_no,
                message_type=SMSLog.Type.NOTIFICATION,
                status_captured=current_status,
            )
            logger.info(
                f"Successfully sent and logged status update for {application.application_id}"
            )
        else:
            MAX_ATTEMPTS = 3
            if attempt < MAX_ATTEMPTS:
                wait_time = 60 * attempt  # 60s, 120s
                logger.warning(
                    f"SMS delivery failed for {application.application_id} to {masked_phone}. Retrying in {wait_time}s... (Attempt {attempt}/{MAX_ATTEMPTS})"
                )
                send_via_status.using(run_after=timedelta(seconds=wait_time)).enqueue(
                    application_id,
                    attempt=attempt + 1
                )
            else:
                logger.error(
                    f"Max attempts reached for SMS status update on application {application.application_id}"
                )


@task()
def send_scan_notification_sms(phone_number, application_id, timestamp_str):
    """
    Sends a verification scan SMS alert in the background.
    """
    if not phone_number:
        return
    message = f"FarmPass: Permit #{application_id} was verified at a checkpoint on {timestamp_str}. Safe travels!"
    send_sms(phone_number=phone_number.strip(), message=message)


@task()
def send_source_farmer_scan_sms(phone_number, application_id, source_farmer_name, timestamp_str):
    """
    Sends a checkpoint verification scan SMS alert to the source pig owner.
    """
    if not phone_number:
        return
    farmer_label = f" ({source_farmer_name})" if source_farmer_name else ""
    message = f"FarmPass Alert: Swine from your farm{farmer_label} under Permit #{application_id} verified at checkpoint on {timestamp_str}."
    send_sms(phone_number=phone_number.strip(), message=message)

