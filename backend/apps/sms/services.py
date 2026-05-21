import requests
import logging
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from apps.permits import models as permits
from .models import SMSLog

logger = logging.getLogger(__name__)

def send_sms(phone_number, message):
    """
    Sends an SMS using the configured gateway.
    Includes a basic rate limit of 10 messages per 24 hours per phone number.
    """
    normalized_phone = phone_number
    if phone_number.startswith("09"):
        normalized_phone = "+63" + phone_number[1:]

    # Mask phone number for logging
    masked_phone = f"{phone_number[:4]}****{phone_number[-2:]}" if len(phone_number) > 6 else phone_number

    # Security: Rate limit check (Max 10 messages per day per number)
    day_ago = timezone.now() - timedelta(days=1)
    recent_sms_count = SMSLog.objects.filter(
        phone_number=phone_number,
        send_at__gte=day_ago
    ).count()

    if recent_sms_count >= 10:
        logger.warning(f"Rate limit exceeded for {masked_phone}. SMS not sent.")
        return False

    try:
        res = requests.post(
            f"{settings.SMS_BASE_URL}/messages",
            auth=(settings.SMS_USERNAME, settings.SMS_PASSWORD),
            json={
                "textMessage": { "text": message },
                "phoneNumbers": [normalized_phone]
            },
            timeout=15  # Slightly longer timeout for network reliability
        )
        
        if res.status_code == 201:
            logger.info(f"SMS successfully sent to {masked_phone}")
            return True
        else:
            logger.error(f"SMS gateway returned error {res.status_code} for {masked_phone}: {res.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error sending SMS to {masked_phone}: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending SMS to {masked_phone}: {str(e)}")
        return False


