import base64
import requests
from django.conf import settings
from apps.permits import models as permits
from . import models
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.api.utils import parse_date_range_strings
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from apps.documents.services import generate_permit_pdf, generate_aic_pdf

def get_auth_header():
    key = settings.PAYMONGO_SECRET_KEY
    encoded = base64.b64encode(f"{key}:".encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Content-Type": "application/json"}

def create_checkout_session(application_pk: int, total_price: float):
    application = get_object_or_404(permits.PermitApplication, pk=application_pk)
    issued_permit_instance = get_object_or_404(permits.IssuedPermit, application=application)

    if issued_permit_instance.is_paid:
        if application.status == permits.PermitApplication.Status.PAYMENT_PENDING:
            with transaction.atomic():
                from apps.permits.services import handle_application_status_change
                handle_application_status_change(application, permits.PermitApplication.Status.RELEASED)
                
                # Check / generate AIC number
                if not issued_permit_instance.aic_number:
                    today = timezone.now().date()
                    mm_dd = today.strftime("%m-%d")
                    yy = today.strftime("%y")
                    prefix = f"{mm_dd}-"
                    today_count = permits.IssuedPermit.objects.filter(
                        aic_number__startswith=prefix
                    ).count()
                    issued_permit_instance.aic_number = f"{mm_dd}-{today_count + 1:03d}-{yy}"
                    issued_permit_instance.save()
                    
                if not issued_permit_instance.permit_pdf:
                    generate_permit_pdf.enqueue(permit_application_id=application.pk)
                if not issued_permit_instance.aic_pdf:
                    generate_aic_pdf.enqueue(permit_application_id=application.pk)
            raise ValidationError('This permit has already been paid and is now released. Please refresh the page.')
        raise ValidationError('Already paid.')

    farmer = application.farmer

    payload = {
        "data": {
            "attributes": {
                "billing": {
                    "name": farmer.get_full_name(),
                    "email": farmer.email,
                },
                "line_items": [
                    {
                        "currency": "PHP",
                        "amount": int(float(total_price) * 100),
                        "name": f"Livestock Transport Permit — {issued_permit_instance.permit_number}",
                        "quantity": 1,
                    }
                ],
                "payment_method_types": ["gcash", "card", "paymaya"],
                "success_url": f"{settings.FRONTEND_URL}/farmer/payment/success/{application.pk}",
                "cancel_url": f"{settings.FRONTEND_URL}/farmer/payment/cancel?application_id={application.pk}",
                "description": f"Permit fee for application #{application.application_id}",
                "metadata": {
                    "permit_id": str(issued_permit_instance.pk),
                    "permit_number": issued_permit_instance.permit_number,
                    "farmer_id": str(farmer.pk),
                }
            }
        }
    }

    res = requests.post(
        f"{settings.PAYMONGO_URL}/checkout_sessions",
        json=payload,
        headers=get_auth_header(),
    )
    
    if res.status_code != 200:
        raise ValidationError(res.json())

    data = res.json()["data"]

    # Create or update the payment history record
    models.PaymentHistory.objects.update_or_create(
        issued_permit=issued_permit_instance,
        defaults={
            'status': models.PaymentHistory.Status.PENDING,
            'method': 'ONLINE',
            'amount': total_price,
            'paymongo_session_id': data["id"],
        }
    )

    return {
        "checkout_url": data["attributes"]["checkout_url"],
    }

def create_qrph_payment(application_pk: int, total_price: float):
    application = get_object_or_404(permits.PermitApplication, pk=application_pk)
    issued_permit_instance = get_object_or_404(permits.IssuedPermit, application=application)

    if issued_permit_instance.is_paid:
        if application.status == permits.PermitApplication.Status.PAYMENT_PENDING:
            with transaction.atomic():
                from apps.permits.services import handle_application_status_change
                handle_application_status_change(application, permits.PermitApplication.Status.RELEASED)
                
                if not issued_permit_instance.aic_number:
                    today = timezone.now().date()
                    mm_dd = today.strftime("%m-%d")
                    yy = today.strftime("%y")
                    prefix = f"{mm_dd}-"
                    today_count = permits.IssuedPermit.objects.filter(
                        aic_number__startswith=prefix
                    ).count()
                    issued_permit_instance.aic_number = f"{mm_dd}-{today_count + 1:03d}-{yy}"
                    issued_permit_instance.save()
                    
                if not issued_permit_instance.permit_pdf:
                    generate_permit_pdf.enqueue(permit_application_id=application.pk)
                if not issued_permit_instance.aic_pdf:
                    generate_aic_pdf.enqueue(permit_application_id=application.pk)
            raise ValidationError('This permit has already been paid and is now released. Please refresh the page.')
        raise ValidationError('Already paid.')

    headers = get_auth_header()
    amount_in_cents = int(float(total_price) * 100)

    # 1. Create Payment Intent
    intent_payload = {
        "data": {
            "attributes": {
                "amount": amount_in_cents,
                "currency": "PHP",
                "payment_method_allowed": ["qrph"],
                "description": f"FarmPass QRPH Permit #{issued_permit_instance.permit_number}",
            }
        }
    }
    intent_res = requests.post(f"{settings.PAYMONGO_URL}/payment_intents", json=intent_payload, headers=headers)
    if intent_res.status_code != 200:
        raise ValidationError(intent_res.json())
    intent_data = intent_res.json()["data"]
    intent_id = intent_data["id"]
    client_key = intent_data["attributes"]["client_key"]

    # 2. Create Payment Method (Max out expiry to 2.5 hours / 9000 seconds)
    method_payload = {
        "data": {
            "attributes": {
                "type": "qrph",
                "expiry_seconds": 9000 
            }
        }
    }
    method_res = requests.post(f"{settings.PAYMONGO_URL}/payment_methods", json=method_payload, headers=headers)
    if method_res.status_code != 200:
        raise ValidationError(method_res.json())
    method_id = method_res.json()["data"]["id"]

    # 3. Attach Payment Method to Payment Intent
    attach_payload = {
        "data": {
            "attributes": {
                "payment_method": method_id,
                "client_key": client_key
            }
        }
    }
    attach_res = requests.post(
        f"{settings.PAYMONGO_URL}/payment_intents/{intent_id}/attach", 
        json=attach_payload, 
        headers=headers
    )
    if attach_res.status_code != 200:
        raise ValidationError(attach_res.json())
    
    attach_data = attach_res.json()["data"]
    qr_image_url = attach_data["attributes"]["next_action"]["code"]["image_url"]

    # Save to local history
    expiry_time = timezone.now() + timedelta(seconds=9000)
    payment_history, _ = models.PaymentHistory.objects.update_or_create(
        issued_permit=issued_permit_instance,
        defaults={
            'status': models.PaymentHistory.Status.PENDING,
            'method': models.PaymentHistory.Method.QRPH,
            'amount': total_price,
            'paymongo_payment_intent_id': intent_id,
            'paymongo_session_id': "",  # clear session ID if any
            'expires_at': expiry_time
        }
    )

    return {
        "qr_image_url": qr_image_url,
        "expires_at": expiry_time.isoformat(),
        "amount": total_price,
        "payment_history_id": payment_history.pk
    }

def verify_paymongo_session(application_pk: int, user):
    """
    Calls PayMongo to check the actual status of the checkout session or payment intent.
    This endpoint verifies if a payment has been successfully made.
    """
    # 1. Fetch the application and its related permit
    application = get_object_or_404(permits.PermitApplication, pk=application_pk)

    # Ownership check
    if user.role == 'Farmer' and application.farmer != user:
        raise PermissionDenied("Unauthorized access to this application")
    
    # 2. Get the issued permit and its associated payment history
    try:
        issued_permit = application.issued_permit
    except permits.IssuedPermit.DoesNotExist:
        raise ValidationError("No permit has been issued for this application yet", code="not_found")

    try:
        payment_history = issued_permit.payment_history
    except models.PaymentHistory.DoesNotExist:
        raise ValidationError("No payment session found for this permit", code="not_found")

    # 3. Verify the application is in the correct state for payment verification
    # If it's already released, we can return success immediately
    if application.status == permits.PermitApplication.Status.RELEASED:
        return True, payment_history

    if application.status != permits.PermitApplication.Status.PAYMENT_PENDING:
        raise ValidationError(f"Application is not in payment pending state (Current status: {application.status})")

    # 4. If we already know it's a success locally, skip the external API call
    if payment_history.status == models.PaymentHistory.Status.SUCCESS:
        return True, payment_history

    # 5. Query PayMongo API for checkout session or payment intent details
    if payment_history.paymongo_payment_intent_id:
        url = f"{settings.PAYMONGO_URL}/payment_intents/{payment_history.paymongo_payment_intent_id}"
    else:
        url = f"{settings.PAYMONGO_URL}/checkout_sessions/{payment_history.paymongo_session_id}"
        
    headers = get_auth_header()
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        raise ValidationError("Failed to verify session/intent with payment provider")

    data = response.json().get('data', {})
    attributes = data.get('attributes', {})

    payment_status = attributes.get('status')
    
    # 6. PROTOTYPE SIMULATION:
    # For this prototype:
    # - Checkout Session: 'active' status is treated as 'paid' to simulate success.
    # - Payment Intent: 'awaiting_next_action' or 'succeeded' status is treated as 'paid' to simulate success.
    is_paid = False
    if payment_history.paymongo_payment_intent_id:
        is_paid = (payment_status == 'succeeded')
    else:
        is_paid = (payment_status == 'active')
    
    if is_paid:
        with transaction.atomic():
            # Re-fetch payment history with a lock to prevent concurrent update issues
            payment_history = models.PaymentHistory.objects.select_for_update().get(pk=payment_history.pk)
            
            if payment_history.status == models.PaymentHistory.Status.SUCCESS:
                return True, payment_history
            
            # A. Update Payment History record
            payment_history.status = models.PaymentHistory.Status.SUCCESS
            if payment_history.paymongo_payment_intent_id:
                payment_history.method = models.PaymentHistory.Method.QRPH
            else:
                payment_history.method = 'ONLINE'
            payment_history.save()

            # B. Update the Issued Permit state
            issued_permit.is_paid = True
            issued_permit.payment_method = 'ONLINE'
            issued_permit.valid_until = timezone.now().date() + timedelta(days=3)
            
            # Generate the unique AIC number here!
            if not issued_permit.aic_number:
                today = timezone.now().date()
                mm_dd = today.strftime("%m-%d")
                yy = today.strftime("%y")
                prefix = f"{mm_dd}-"
                today_count = permits.IssuedPermit.objects.filter(
                    aic_number__startswith=prefix
                ).count()
                issued_permit.aic_number = f"{mm_dd}-{today_count + 1:03d}-{yy}"
                
            issued_permit.save()

            # C. Advance the Application status to RELEASED
            from apps.permits.services import handle_application_status_change
            handle_application_status_change(application, permits.PermitApplication.Status.RELEASED)

            # D. Queue the background tasks for PDF generation
            generate_permit_pdf.enqueue(permit_application_id=application.pk)     
            generate_aic_pdf.enqueue(permit_application_id=application.pk)
        
        return True, payment_history
    else:
        return False, payment_history

def generate_collection_report(user, start_date_str, end_date_str):
    if user.role != 'Agri':
        raise PermissionDenied("Only Agri officers can generate collection reports.")

    from apps.documents.services import generate_collection_report_pdf

    start_date, end_date = parse_date_range_strings(start_date_str, end_date_str)
    pdf_buffer = generate_collection_report_pdf(start_date=start_date, end_date=end_date, requesting_user=user)
    return pdf_buffer, start_date, end_date