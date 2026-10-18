from django.utils import timezone
from .models import AuditTrail


def get_client_ip(request):
    """Extracts client IP address supporting reverse proxies."""
    if not request:
        return None
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def get_client_user_agent(request):
    """Extracts client user agent string."""
    if not request:
        return ""
    return request.META.get("HTTP_USER_AGENT", "")[:500]


def log_audit_event(request, action_type, what_performed, target_user=None, user=None):
    """
    Standardized audit trail logger satisfying NPC Circular 16-01 Section 25.
    Logs who, what, when, IP address, user agent, action type, and affected citizen.
    """
    actor = user or (request.user if request and request.user.is_authenticated else None)
    ip_addr = get_client_ip(request)
    u_agent = get_client_user_agent(request)

    return AuditTrail.objects.create(
        who_performed=actor,
        target_user=target_user,
        action_type=action_type,
        what_performed=what_performed,
        ip_address=ip_addr,
        user_agent=u_agent,
        when_performed=timezone.now(),
    )
