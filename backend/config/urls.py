from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.static import serve
import re
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from apps.api.views import health_check, CustomTokenObtainPairView, secure_serve_media, LogoutView
from apps.payment.views import paymongo_webhook
from .router import router

# app viewsets
urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth Endpoints
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="token_logout"),
    # Payment Webhooks
    path("payment/webhook/", paymongo_webhook, name="paymongo_webhook"),
    # App Routes
    path("dashboard/", include("apps.dashboard.urls"), name="agri_dashboard"),
    # util endpoints
    path("api/health-check/", health_check, name="health-check"),
]

urlpatterns += router.urls

if settings.MEDIA_URL.startswith("/"):
    media_pattern = r"^%s(?P<path>.*)$" % re.escape(settings.MEDIA_URL.lstrip("/"))
    urlpatterns += [
        re_path(
            media_pattern,
            xframe_options_exempt(secure_serve_media),
        ),
    ]

