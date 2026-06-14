from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from apps.api.views import health_check
from .router import routers

# app viewsets
urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth Endpoints
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # App Routes
    path("dashboard/", include("apps.dashboard.urls"), name="agri_dashboard"),
    # util endpoints
    path("api/health-check/", health_check, name="health-check"),
]

urlpatterns += routers.urls
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
