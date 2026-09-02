from django.core.cache import cache
from rest_framework.exceptions import ValidationError
from . import models
from .utils import generate_otp, normalize_phone_number
from apps.sms.services import send_sms

def verify_otp(phone_no, otp_input):
    if not phone_no or not otp_input:
        raise ValidationError("Phone number and OTP are required.")

    phone_no = normalize_phone_number(phone_no)

    try:
        otp_input = int(otp_input)
    except (ValueError, TypeError):
        raise ValidationError("OTP must be a numeric value.")

    cached_otp = cache.get(f"otp_{phone_no}")

    if not cached_otp:
        raise ValidationError("OTP has expired or hasn't been requested.")

    if int(cached_otp) != otp_input:
        raise ValidationError("Invalid verification code.")

    cache.delete(f"otp_{phone_no}")
    return True

def send_otp(phone_no):
    if not phone_no:
        raise ValidationError("No phone number provided.")

    normalized_phone = normalize_phone_number(phone_no)

    if len(phone_no) >= 9:
        core_phone = phone_no[-9:]
        if models.User.objects.filter(phone_no__contains=core_phone).exists():
            raise ValidationError("This mobile number is already registered to another account.")

    otp = generate_otp(normalized_phone)

    success = send_sms(
        phone_number=normalized_phone,
        message=f"Your FarmPass OTP is: {otp}. Valid for 5 minutes."
    )

    if not success:
        raise ValidationError("SMS provider error. Please try again later.", code="sms_error")

    return normalized_phone
