import requests
from django.conf import settings
from apps.permits import models as permits
from .models import SMSLog


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


