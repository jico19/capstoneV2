import base64
import logging
import requests
import uuid
from django.conf import settings
from apps.permits import models as permits
from . import models
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.api.utils import parse_date_range_strings
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from apps.permits.services.numbers import get_aic_number
from apps.documents.services import generate_permit_pdf, generate_aic_pdf, generate_collection_report_pdf
from apps.api.models import AuditTrail

logger = logging.getLogger(__name__)

def _release_permit_and_queue_pdfs(application):
    """Advance application to RELEASED status; queue PDF tasks after commit."""
    from django.db import transaction as db_tx
    from apps.permits.services import handle_application_status_change
    handle_application_status_change(application, permits.PermitApplication.Status.RELEASED)
    p_app_pk = application.pk
    db_tx.on_commit(lambda f=generate_permit_pdf, k=p_app_pk: f.enqueue(permit_application_id=k))
    db_tx.on_commit(lambda f=generate_aic_pdf, k=p_app_pk: f.enqueue(permit_application_id=k))


def ensure_aic_number(issued_permit):
    """Assign a unique AIC number if none is set yet. Caller persists."""
    if not issued_permit.aic_number:
        issued_permit.aic_number = get_aic_number(issued_permit)
    return issued_permit.aic_number


def _paymongo_post(url, payload):
    """POST helper: auth header, timeout, status-200 check, consistent error mapping."""
    try:
        res = requests.post(
            url, json=payload, headers=get_auth_header(), timeout=15
        )
    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
        logger.error("PayMongo connection error: %s", e)
        raise ValidationError("Payment provider is unreachable. Please try again later.")
    if res.status_code != 200:
        raise ValidationError(res.json())
    return res


def get_auth_header():
    key = settings.PAYMONGO_SECRET_KEY
    encoded = base64.b64encode(f"{key}:".encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Content-Type": "application/json"}

def create_checkout_session(application_pk: int):
    application = get_object_or_404(permits.PermitApplication, pk=application_pk)
    issued_permit_instance = get_object_or_404(permits.IssuedPermit, application=application)
    fee_pesos = int(issued_permit_instance.permit_fee)

    if issued_permit_instance.is_paid:
        if application.status == permits.PermitApplication.Status.PAYMENT_PENDING:
            with transaction.atomic():
                ensure_aic_number(issued_permit_instance)
                issued_permit_instance.save()
                _release_permit_and_queue_pdfs(application)
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
                        "amount": fee_pesos * 100,
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

    res = _paymongo_post(f"{settings.PAYMONGO_URL}/checkout_sessions", payload)

    data = res.json()["data"]

    # Create or update the payment history record
    models.PaymentHistory.objects.update_or_create(
        issued_permit=issued_permit_instance,
        defaults={
            'status': models.PaymentHistory.Status.PENDING,
            'method': 'ONLINE',
            'amount': fee_pesos,
            'paymongo_session_id': data["id"],
        }
    )

    return {
        "checkout_url": data["attributes"]["checkout_url"],
    }

def create_qrph_payment(application_pk: int):
    application = get_object_or_404(permits.PermitApplication, pk=application_pk)
    issued_permit_instance = get_object_or_404(permits.IssuedPermit, application=application)
    fee_pesos = int(issued_permit_instance.permit_fee)

    if issued_permit_instance.is_paid:
        if application.status == permits.PermitApplication.Status.PAYMENT_PENDING:
            with transaction.atomic():
                ensure_aic_number(issued_permit_instance)
                issued_permit_instance.save()
                _release_permit_and_queue_pdfs(application)
            raise ValidationError('This permit has already been paid and is now released. Please refresh the page.')
        raise ValidationError('Already paid.')

    amount_in_cents = fee_pesos * 100
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
    intent_res = _paymongo_post(f"{settings.PAYMONGO_URL}/payment_intents", intent_payload)
    intent_data = intent_res.json()["data"]
    intent_id = intent_data["id"]
    client_key = intent_data["attributes"]["client_key"]

    # 2. Create Payment Method (Max out expiry to 2.5 hours / 9000 seconds)
    method_payload = {
        "data": {
            "attributes": {
                "type": "qrph",
                "expiry_seconds": settings.QRPH_EXPIRY_SECONDS 
            }
        }
    }
    method_res = _paymongo_post(f"{settings.PAYMONGO_URL}/payment_methods", method_payload)
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
    attach_res = _paymongo_post(
        f"{settings.PAYMONGO_URL}/payment_intents/{intent_id}/attach",
        attach_payload,
    )

    attach_data = attach_res.json()["data"]
    qr_image_url = attach_data["attributes"]["next_action"]["code"]["image_url"]

    # Save to local history
    expiry_time = timezone.now() + timedelta(seconds=settings.QRPH_EXPIRY_SECONDS)
    payment_history, _ = models.PaymentHistory.objects.update_or_create(
        issued_permit=issued_permit_instance,
        defaults={
            'status': models.PaymentHistory.Status.PENDING,
            'method': models.PaymentHistory.Method.QRPH,
            'amount': fee_pesos,
            'paymongo_payment_intent_id': intent_id,
            'paymongo_session_id': "",  # clear session ID if any
            'expires_at': expiry_time
        }
    )

    return {
        "qr_image_url": qr_image_url,
        "expires_at": expiry_time.isoformat(),
        "amount": fee_pesos,
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
    is_owner_or_staff = (user.role == 'Farmer' and application.farmer_id == user.id) or user.role in ('Agri', 'Admin')
    if not is_owner_or_staff:
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
    try:
        response = requests.get(url, headers=headers, timeout=15)
    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
        logger.error("PayMongo connection error: %s", e)
        raise ValidationError("Payment provider is unreachable. Please try again later.")
    
    if response.status_code != 200:
        raise ValidationError("Failed to verify session/intent with payment provider")

    data = response.json().get('data', {})
    attributes = data.get('attributes', {})

    payment_status = attributes.get('status')
    
    # 6. Real PayMongo paid statuses:
    # - Checkout Session: 'paid'
    # - Payment Intent: 'succeeded'
    # PROTOTYPE SIMULATION (DEBUG builds only): a checkout session still
    # 'active', or an intent 'awaiting_next_action', is treated as 'paid' to
    # mimic the gateway settling instantly. Production NEVER simulates.
    is_paid = False
    if payment_history.paymongo_payment_intent_id:
        is_paid = (payment_status == 'succeeded')
        if settings.DEBUG:
            is_paid = is_paid or (payment_status == 'awaiting_next_action')
    else:
        is_paid = (payment_status == 'paid')
        if settings.DEBUG:
            is_paid = is_paid or (payment_status == 'active')
    
    # Reconcile the amount the gateway actually collected (cents) with the fee.
    gateway_amount_cents = attributes.get('amount')
    expected_cents = int(issued_permit.permit_fee * 100)
    if is_paid and gateway_amount_cents is not None and int(gateway_amount_cents) != expected_cents:
        AuditTrail.objects.create(
            who_performed=user,
            what_performed=(
                f"[PAYMENT AMOUNT MISMATCH] - Gateway reported paid with amount "
                f"{gateway_amount_cents}c but permit fee is {expected_cents}c for "
                f"Application #{application.application_id}. Release refused."
            ),
            when_performed=timezone.now(),
        )
        raise ValidationError(
            "Payment amount does not match the permit fee. Contact the MAO for assistance."
        )

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

            # Generate the unique AIC number using the atomic helper
            ensure_aic_number(issued_permit)

            issued_permit.save()

            # C. Advance the Application status to RELEASED
            _release_permit_and_queue_pdfs(application)
        
        return True, payment_history
    else:
        return False, payment_history

def farmer_simulate_payment(application_pk: int, user, payment_method: str):
    """
    Allows a Farmer to simulate a complete payment transaction in DEBUG mode.
    This mimics the full PayMongo webhook flow from the farmer's perspective:
    
    1. Creates a PaymentHistory record (as if the checkout session was opened)
    2. Marks it as SUCCESS (simulates the payment gateway callback)
    3. Marks IssuedPermit as paid
    4. Generates AIC number
    5. Advances application to RELEASED
    6. Queues PDF generation
    7. Returns structured receipt data matching the real PaymentListSerializers shape
    
    Only available when DEBUG=True. Ownership-enforced (farmer can only pay their own).
    
    Args:
        application_pk: PK of the PermitApplication
        user: The requesting Farmer user
        payment_method: One of 'gcash', 'card', 'paymaya', 'qrph'
    """
    if not settings.DEBUG:
        raise PermissionDenied("Payment simulation is not available in production.")

    if user.role != 'Farmer':
        raise PermissionDenied("Only farmers can use the farmer payment simulation.")

    VALID_METHODS = ['gcash', 'card', 'paymaya', 'qrph']
    if payment_method not in VALID_METHODS:
        raise ValidationError(
            f"Invalid payment method '{payment_method}'. Choose from: {', '.join(VALID_METHODS)}"
        )

    application = get_object_or_404(permits.PermitApplication, pk=application_pk)

    # Ownership check — farmer can only pay their own applications
    if application.farmer != user:
        raise PermissionDenied("You can only simulate payment for your own applications.")

    if application.status != permits.PermitApplication.Status.PAYMENT_PENDING:
        raise ValidationError(
            f"Application is not awaiting payment. Current status: {application.status}"
        )

    try:
        issued_permit = application.issued_permit
    except permits.IssuedPermit.DoesNotExist:
        raise ValidationError("No permit has been issued for this application yet.")

    if issued_permit.is_paid:
        raise ValidationError("This permit has already been paid.")

    with transaction.atomic():
        # Lock rows in verify-path order (PaymentHistory -> IssuedPermit -> PermitApplication)
        # and re-check guards so concurrent release attempts serialize at the DB level.
        payment_history = models.PaymentHistory.objects.select_for_update().filter(
            issued_permit=issued_permit
        ).first()
        issued_permit = permits.IssuedPermit.objects.select_for_update().get(pk=issued_permit.pk)
        application = permits.PermitApplication.objects.select_for_update().get(pk=application.pk)

        if issued_permit.is_paid:
            raise ValidationError("This permit has already been paid.")
        if application.status != permits.PermitApplication.Status.PAYMENT_PENDING:
            raise ValidationError(
                f"Application is not awaiting payment. Current status: {application.status}"
            )
        if payment_history is not None and payment_history.status == models.PaymentHistory.Status.SUCCESS:
            raise ValidationError("This permit has already been paid.")

        # Simulate the payment gateway creating a record + immediately succeeding
        fake_session_id = f"cs_sim_{uuid_hex()}"
        fake_payment_id = f"pay_sim_{uuid_hex()}"

        payment_history, _ = models.PaymentHistory.objects.update_or_create(
            issued_permit=issued_permit,
            defaults={
                'status': models.PaymentHistory.Status.SUCCESS,
                'method': payment_method,
                'amount': int(issued_permit.permit_fee),
                'paymongo_session_id': fake_session_id,
                'paymongo_payment_id': fake_payment_id,
            }
        )

        # Mark permit as paid
        issued_permit.is_paid = True
        issued_permit.payment_method = permits.IssuedPermit.PaymentMethodChoices.ONLINE

        # Assign AIC number atomically (if not already set)
        ensure_aic_number(issued_permit)

        issued_permit.save()

        # Advance to RELEASED (triggers SMS + notifications to farmer)
        _release_permit_and_queue_pdfs(application)

        AuditTrail.objects.create(
            who_performed=user,
            what_performed=(
                f"[SANDBOX PAYMENT] - Farmer simulated '{payment_method}' payment for "
                f"Permit {issued_permit.permit_number} / "
                f"Application #{application.application_id}."
            ),
            when_performed=timezone.now(),
        )

    return payment_history


def uuid_hex() -> str:
    """Returns a short random hex string for simulated IDs."""
    return uuid.uuid4().hex[:12]


def confirm_offline_payment(application_pk: int, user, or_number: str):
    """
    Agri officer confirms a walk-in (offline/cash) payment for an issued permit.

    - Sets PaymentHistory to SUCCESS with method=OFFLINE
    - Records the OR number and who confirmed it
    - Marks IssuedPermit as paid
    - Generates AIC number (atomic, no duplicates)
    - Advances application to RELEASED
    - Queues PDF generation

    Args:
        application_pk: PK of the PermitApplication
        user: The requesting user (must be Agri role)
        or_number: Official Receipt number from the cashier
    """
    if user.role != 'Agri':
        raise PermissionDenied("Only Agri officers can confirm offline payments.")

    if not or_number or not or_number.strip():
        raise ValidationError("Official Receipt (OR) number is required.")

    application = get_object_or_404(permits.PermitApplication, pk=application_pk)

    if application.status != permits.PermitApplication.Status.PAYMENT_PENDING:
        raise ValidationError(
            f"Application is not awaiting payment. Current status: {application.status}"
        )

    try:
        issued_permit = application.issued_permit
    except permits.IssuedPermit.DoesNotExist:
        raise ValidationError("No permit has been issued for this application.")

    if issued_permit.is_paid:
        raise ValidationError("This permit has already been paid.")

    with transaction.atomic():
        # Lock rows in verify-path order (PaymentHistory -> IssuedPermit -> PermitApplication)
        # and re-check guards so concurrent release attempts serialize at the DB level.
        payment_history = models.PaymentHistory.objects.select_for_update().filter(
            issued_permit=issued_permit
        ).first()
        issued_permit = permits.IssuedPermit.objects.select_for_update().get(pk=issued_permit.pk)
        application = permits.PermitApplication.objects.select_for_update().get(pk=application.pk)

        if issued_permit.is_paid:
            raise ValidationError("This permit has already been paid.")
        if application.status != permits.PermitApplication.Status.PAYMENT_PENDING:
            raise ValidationError(
                f"Application is not awaiting payment. Current status: {application.status}"
            )
        if payment_history is not None and payment_history.status == models.PaymentHistory.Status.SUCCESS:
            raise ValidationError("This permit has already been paid.")

        # Create or update a PaymentHistory record for the offline payment
        payment_history, _ = models.PaymentHistory.objects.update_or_create(
            issued_permit=issued_permit,
            defaults={
                'status': models.PaymentHistory.Status.SUCCESS,
                'method': models.PaymentHistory.Method.OFFLINE,
                'amount': int(issued_permit.permit_fee),
                'or_number': or_number.strip(),
                'confirmed_by': user,
                'confirmed_at': timezone.now(),
            }
        )

        # Mark the issued permit as paid (OFFLINE method)
        issued_permit.is_paid = True
        issued_permit.payment_method = permits.IssuedPermit.PaymentMethodChoices.OFFLINE

        # Assign AIC number atomically (if not already set)
        ensure_aic_number(issued_permit)

        issued_permit.save()

        # Advance application to RELEASED (triggers SMS + notification)
        _release_permit_and_queue_pdfs(application)

        AuditTrail.objects.create(
            who_performed=user,
            what_performed=(
                f"[OFFLINE PAYMENT CONFIRMED] - OR#{or_number.strip()} recorded for "
                f"Permit {issued_permit.permit_number} / "
                f"Application #{application.application_id} by {user.get_full_name() or user.username}."
            ),
            when_performed=timezone.now(),
        )

    return payment_history


def generate_collection_report(user, start_date_str, end_date_str):
    if user.role != 'Agri':
        raise PermissionDenied("Only Agri officers can generate collection reports.")

    start_date, end_date = parse_date_range_strings(start_date_str, end_date_str)
    pdf_buffer = generate_collection_report_pdf(start_date=start_date, end_date=end_date, requesting_user=user)
    return pdf_buffer, start_date, end_date