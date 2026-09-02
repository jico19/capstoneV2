import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError, PermissionDenied, NotAuthenticated, AuthenticationFailed

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler that normalizes all exceptions into a
    consistent {"error": "...", "code": "..."} response envelope.
    
    Falls back to DRF's default handler for any exception not explicitly handled.
    """
    response = exception_handler(exc, context)

    if response is not None:
        # Normalize ValidationError: DRF returns a dict or list for field errors
        if isinstance(exc, ValidationError):
            detail = exc.detail
            if isinstance(detail, list):
                # Single-field error list: take first message
                error_msg = detail[0] if detail else "Validation error."
                if hasattr(error_msg, 'string'):
                    error_msg = str(error_msg)
            elif isinstance(detail, dict):
                # Multi-field errors: flatten into a readable string
                parts = []
                for field, errors in detail.items():
                    if isinstance(errors, list):
                        parts.append(f"{field}: {errors[0]}")
                    else:
                        parts.append(f"{field}: {errors}")
                error_msg = " | ".join(parts)
            else:
                error_msg = str(detail)

            response.data = {
                "error": error_msg,
                "code": getattr(exc, 'default_code', 'validation_error'),
            }

        elif isinstance(exc, (PermissionDenied,)):
            response.data = {
                "error": str(exc.detail) if hasattr(exc, 'detail') else str(exc),
                "code": "permission_denied",
            }

        elif isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
            response.data = {
                "error": "Authentication credentials were not provided or are invalid.",
                "code": "not_authenticated",
            }

    else:
        # Unhandled exception — return a generic 500
        logger.exception("Unhandled exception in view: %s", exc)
        response = Response(
            {"error": "An unexpected server error occurred.", "code": "server_error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response
