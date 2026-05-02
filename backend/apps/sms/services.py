import requests
from django.conf import settings
from apps.permits import models as permits

def send_sms(phone_number, message):
    normalized_phone = phone_number
    if phone_number.startswith("09"):
        normalized_phone = "+63" + phone_number[1:]


    print(message)

    res = requests.post(
        f"{settings.SMS_BASE_URL}/messages",
        auth=(settings.SMS_USERNAME, settings.SMS_PASSWORD),
        json={
            "textMessage": { "text": message },
            "phoneNumbers": [normalized_phone]
        },
        timeout=10
    )

    print(res.json())

    if res.status_code == 201:
        return True
    else:
        return False
    
def send_via_status(application):
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