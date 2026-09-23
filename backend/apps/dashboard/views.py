from rest_framework import views, status
from rest_framework.response import Response
from apps.permits import models as permits
from apps.maps import models as maps
from apps.inspector import models as inspector
from apps.payment.models import PaymentHistory
from django.db.models import Count, Q, Avg, Sum
from django.db.models.functions import TruncDate, TruncMonth, ExtractHour
from django.utils import timezone
from datetime import timedelta
from rest_framework.permissions import IsAuthenticated, BasePermission
from .insights_engine import get_or_generate_insight
from .serializers import CachedInsightSerializer

class RoleAllowed(BasePermission):
    """Allow only the roles listed in the view's ``allowed_roles``."""
    allowed_roles = ()

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) in view.allowed_roles
        )

class AgriDashboardView(views.APIView):
    """
    Dashboard metrics for Agricultural Officers.
    Includes system health KPIs, municipal swine density, revenue, and transport volume.
    """
    permission_classes = [RoleAllowed]
    allowed_roles = ('Agri', 'Admin')

    def get(self, request):
        from .services import get_agri_dashboard_data
        data = get_agri_dashboard_data()
        return Response(data, status=status.HTTP_200_OK)

class FarmerDashboardView(views.APIView):
    """
    Dashboard metrics for Farmers.
    Includes personal business KPIs and transport volume charts.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .services import get_farmer_dashboard_data
        data = get_farmer_dashboard_data(request.user)
        return Response(data, status=status.HTTP_200_OK)

class OPVDashboardView(views.APIView):
    """
    Dashboard metrics for OPV Staff.
    Includes validation productivity, workload, rejection reasons, and tactical livestock movement.
    """
    permission_classes = [RoleAllowed]
    allowed_roles = ('Opv', 'Admin')

    def get(self, request):
        from .services import get_opv_dashboard_data
        data = get_opv_dashboard_data()
        return Response(data, status=status.HTTP_200_OK)

class OPVAnalyticsView(views.APIView):
    """
    Tactical analytics for OPV Staff.
    Focuses on volume, rejection trends, and geographic patterns.
    """
    permission_classes = [RoleAllowed]
    allowed_roles = ('Opv', 'Admin')

    def get(self, request):
        # Delegate to OPVDashboardView for consistent, unified data source
        return OPVDashboardView().get(request)

class InspectorDashboardView(views.APIView):
    """
    Dashboard metrics for Inspectors.
    Includes scan activity and verification charts.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .services import get_inspector_dashboard_data
        data = get_inspector_dashboard_data(request.user)
        return Response(data, status=status.HTTP_200_OK)


class DashboardInsightsView(views.APIView):
    """
    Returns AI-generated and metric-backed operational insights for the authenticated user's role.
    Uses cached records where valid (3-hour TTL).
    """
    permission_classes = [RoleAllowed]
    allowed_roles = ('Admin', 'Agri', 'Opv', 'Inspector', 'Barangay', 'Farmer')

    def get(self, request):
        role = getattr(request.user, 'role', 'Farmer')
        insight = get_or_generate_insight(request.user, role, force_refresh=False)
        serializer = CachedInsightSerializer(insight)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DashboardInsightsRefreshView(views.APIView):
    """
    Forces immediate recalculation and cache refresh for the user's role insights.
    """
    permission_classes = [RoleAllowed]
    allowed_roles = ('Admin', 'Agri', 'Opv', 'Inspector', 'Barangay', 'Farmer')

    def post(self, request):
        role = getattr(request.user, 'role', 'Farmer')
        insight = get_or_generate_insight(request.user, role, force_refresh=True)
        serializer = CachedInsightSerializer(insight)
        return Response(serializer.data, status=status.HTTP_200_OK)

