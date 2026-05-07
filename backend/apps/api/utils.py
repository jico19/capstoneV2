from django.core.cache import cache
from random import randint

def generate_otp(phone_no):
    otp = randint(100000, 999999)
    # Use phone number as the unique key for the OTP
    cache.set(f"otp_{phone_no}", otp, timeout=300)
    return otp