from django.core.cache import cache
from random import randint
from datetime import datetime
from django.utils import timezone
from rest_framework.exceptions import ValidationError

def generate_otp(phone_no):
    otp = randint(100000, 999999)
    # Use phone number as the unique key for the OTP
    cache.set(f"otp_{phone_no}", otp, timeout=300)
    return otp

def normalize_phone_number(phone_no):
    """
    Normalize phone number to international format (e.g. +63...)
    """
    if not phone_no:
        return ""
    phone_no = phone_no.strip()
    if phone_no.startswith("09"):
        return "+63" + phone_no[1:]
    return phone_no

def parse_date_range_strings(start_date_str, end_date_str, default_to_today=True):
    """
    Parses start_date and end_date strings into date objects.
    Defaults to today if default_to_today is True.
    """
    today = timezone.now().date()
    start_date = today if default_to_today else None
    end_date = today if default_to_today else None

    try:
        if start_date_str:
            start_date = datetime.strptime(start_date_str.strip(), "%Y-%m-%d").date()
        if end_date_str:
            end_date = datetime.strptime(end_date_str.strip(), "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise ValidationError("Invalid date format. Use YYYY-MM-DD")

    if start_date and end_date and start_date > end_date:
        raise ValidationError("Start date cannot be after end date")

    return start_date, end_date