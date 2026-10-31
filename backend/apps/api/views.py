from django.http import JsonResponse
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

class LoginRateThrottle(SimpleRateThrottle):
    rate = '5/min'
    scope = 'login'

    def get_cache_key(self, request, view):
        username = request.data.get('username', '').strip()
        ip = self.get_ident(request)
        
        if username:
            return self.cache_format % {
                'scope': self.scope,
                'ident': f"{ip}_{username}"
            }
        return self.cache_format % {
            'scope': self.scope,
            'ident': ip
        }

class LoginIPRateThrottle(SimpleRateThrottle):
    rate = '20/min'
    scope = 'login_ip'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }

class CustomTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle, LoginIPRateThrottle]


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        except TokenError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# this will keep the render awake..
def health_check(request):
    return JsonResponse({"message": "ok!!"})


def _authenticate_media_user(request):
    """
    Authenticates a media request from:
    1. Authorization: Bearer <token> header
    2. ?token=<token> query parameter (for browser previews, downloads, img tags)
    3. Active session (request.user), only when no token was supplied
    """
    raw_token = None
    auth_header = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
    if auth_header and auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ", 1)[1].strip()

    if not raw_token:
        raw_token = request.GET.get("token")

    if raw_token:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

        jwt_auth = JWTAuthentication()
        try:
            validated_token = jwt_auth.get_validated_token(raw_token)
            return jwt_auth.get_user(validated_token)
        except (InvalidToken, TokenError, Exception):
            return None

    if getattr(request, "user", None) and request.user.is_authenticated:
        return request.user

    return None


def secure_serve_media(request, path):
    """
    Secure media serving view.
    Enforces authentication and role/ownership checks before serving uploaded files.
    Staff (Agri, Admin, Opv) can access all media.
    Farmers can access their own uploaded docs, issued permits, and AICs.
    Inspectors can access issued permits and verification docs.
    """
    user = _authenticate_media_user(request)
    if not user or not user.is_authenticated:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)

    normalized_path = path.replace("\\", "/").lstrip("/")

    # Public assets (e.g. logos) can be served to any authenticated user
    if normalized_path.startswith("asset/") or "logo" in normalized_path:
        from django.views.static import serve
        from django.conf import settings
        return serve(request, normalized_path, document_root=settings.MEDIA_ROOT)

    # Privileged staff can access all operational files
    if getattr(user, "role", None) in ["Agri", "Admin", "Opv"]:
        from django.views.static import serve
        from django.conf import settings
        return serve(request, normalized_path, document_root=settings.MEDIA_ROOT)

    # Inspectors can view issued permits, AICs, and OPV clearance docs for verification
    if getattr(user, "role", None) == "Inspector":
        if (
            normalized_path.startswith("issued_docs/")
            or normalized_path.startswith("opv_docs/")
            or normalized_path.endswith(".pdf")
        ):
            from django.views.static import serve
            from django.conf import settings
            return serve(request, normalized_path, document_root=settings.MEDIA_ROOT)
        return JsonResponse({"detail": "Access denied to requested document."}, status=403)

    # Barangay officials can view submitted documents from farmers in their barangay, and endorsement files
    if getattr(user, "role", None) == "Barangay":
        from apps.permits.models import SubmittedDocument, PermitApplicationDocument

        is_barangay_doc = (
            SubmittedDocument.objects.filter(origin__application__farmer__barangay=user.barangay, file__icontains=normalized_path).exists()
            or PermitApplicationDocument.objects.filter(application__farmer__barangay=user.barangay, file__icontains=normalized_path).exists()
            or normalized_path.startswith("endorsements/")
            or normalized_path.startswith("hog_surveys/")
        )
        if is_barangay_doc:
            from django.views.static import serve
            from django.conf import settings
            return serve(request, normalized_path, document_root=settings.MEDIA_ROOT)
        return JsonResponse({"detail": "Access denied to requested document."}, status=403)

    # Farmers can access files attached to their own applications or user profile
    if getattr(user, "role", None) == "Farmer":
        from apps.permits.models import SubmittedDocument, PermitApplicationDocument, IssuedPermit, PermitApplication, OPVValidation
        from apps.api.models import FarmerDocument

        is_owner = (
            SubmittedDocument.objects.filter(origin__application__farmer=user, file__icontains=normalized_path).exists()
            or PermitApplicationDocument.objects.filter(application__farmer=user, file__icontains=normalized_path).exists()
            or IssuedPermit.objects.filter(application__farmer=user, permit_pdf__icontains=normalized_path).exists()
            or IssuedPermit.objects.filter(application__farmer=user, aic_pdf__icontains=normalized_path).exists()
            or PermitApplication.objects.filter(farmer=user, aic_pdf__icontains=normalized_path).exists()
            or IssuedPermit.objects.filter(application__farmer=user, mao_certificate_pdf=normalized_path).exists()
            or PermitApplication.objects.filter(farmer=user, mao_certificate_pdf=normalized_path).exists()
            or OPVValidation.objects.filter(application__farmer=user, veterinary_health_certificate=normalized_path).exists()
            or OPVValidation.objects.filter(application__farmer=user, transportation_pass=normalized_path).exists()
            or FarmerDocument.objects.filter(user=user, file__icontains=normalized_path).exists()
        )
        if is_owner:
            from django.views.static import serve
            from django.conf import settings
            return serve(request, normalized_path, document_root=settings.MEDIA_ROOT)
        return JsonResponse({"detail": "You do not have permission to access this file."}, status=403)

    return JsonResponse({"detail": "Forbidden."}, status=403)
