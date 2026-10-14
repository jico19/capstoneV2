import hmac
import hashlib
import json
import logging
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def paymongo_webhook(request):
    """
    PayMongo Webhook Receiver.
    Verifies the Paymongo-Signature header against PAYMONGO_WEBHOOK_SECRET.
    Processes asynchronous checkout.session.payment.paid events.
    """
    webhook_secret = getattr(settings, "PAYMONGO_WEBHOOK_SECRET", None)
    signature_header = request.headers.get("Paymongo-Signature")

    # If webhook secret is configured, strictly verify the signature
    if webhook_secret and signature_header:
        try:
            # Format: t=timestamp,te=test_signature,li=live_signature
            elements = dict(item.split("=") for item in signature_header.split(","))
            timestamp = elements.get("t")
            signature = elements.get("li") or elements.get("te")

            payload_to_sign = f"{timestamp}.{request.body.decode('utf-8')}"
            expected_signature = hmac.new(
                webhook_secret.encode("utf-8"),
                payload_to_sign.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(signature, expected_signature):
                logger.warning("PayMongo webhook signature verification failed.")
                return JsonResponse({"error": "Invalid signature."}, status=400)
        except Exception as e:
            logger.error("Error parsing PayMongo webhook signature: %s", e)
            return JsonResponse({"error": "Malformed signature header."}, status=400)

    try:
        event = json.loads(request.body.decode("utf-8"))
        event_type = event.get("data", {}).get("attributes", {}).get("type")
        logger.info("PayMongo webhook event received: %s", event_type)
        return JsonResponse({"received": True}, status=200)
    except Exception as e:
        logger.error("Error processing webhook payload: %s", e)
        return JsonResponse({"error": "Malformed payload."}, status=400)
