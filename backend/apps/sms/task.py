from django.tasks import task
from apps.permits import models as permits
from .models import SMSLog
from .services import send_sms
from django.shortcuts import get_object_or_404


@task()
def send_via_status(application_id):
    # TODO: Check if the user is Allowed to Send SMS

    application =  get_object_or_404(permits.PermitApplication, application_id)

    if not application.farmer.receive_sms:
        return # pass if the send sms is false


    print(f"Sending status update for {application.application_id}: {application.status}")
    message = ""
    Status = permits.PermitApplication.Status

    if application.status == Status.OPV_VALIDATED:
        message = f"LIVESTOCKPASS: Your application {application.application_id} has been validated by the Office of the Provincial Veterinarian. Please wait for further updates regarding permit issuance."
    elif application.status == Status.OPV_REJECTED:
        message = f"LIVESTOCKPASS: Your application {application.application_id} has been rejected by the OPV. Please log in to your portal account to view the remarks."
    elif application.status == Status.RESUBMISSION:
        message = f"LIVESTOCKPASS: Your application {application.application_id} requires resubmission. Please check the remarks in your portal account and update your application."
    elif application.status in [Status.PERMIT_ISSUED, Status.PAYMENT_PENDING]:
        message = f"LIVESTOCKPASS: Your permit for application {application.application_id} has been issued and is now awaiting payment. Please settle the fees to release your permit."
    elif application.status == Status.RELEASED:
        message = f"LIVESTOCKPASS: Your permit for application {application.application_id} has been released. You may now download and use your permit. Thank you!"

    if message:
        send_sms(
            phone_number=application.farmer.phone_no,
            message=message
        )
        # Create a SMS Log
        SMSLog.objects.create(
            phone_number = application.farmer.phone_no,
            message_type = SMSLog.Type.NOTIFICATION
        )