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
from rest_framework.permissions import IsAuthenticated
from .insights_engine import get_or_generate_insight
from .serializers import CachedInsightSerializer

class AgriDashboardView(views.APIView):
    """
    Dashboard metrics for Agricultural Officers.
    Includes system health KPIs, municipal swine density, revenue, and transport volume.
    """
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .services import get_opv_dashboard_data
        data = get_opv_dashboard_data()
        return Response(data, status=status.HTTP_200_OK)

class OPVAnalyticsView(views.APIView):
    """
    Tactical analytics for OPV Staff.
    Focuses on volume, rejection trends, and geographic patterns.
    """
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = request.query_params.get('role') or getattr(request.user, 'role', 'Farmer')
        insight = get_or_generate_insight(request.user, role, force_refresh=False)
        serializer = CachedInsightSerializer(insight)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DashboardInsightsRefreshView(views.APIView):
    """
    Forces immediate recalculation and cache refresh for the user's role insights.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        role = request.data.get('role') or request.query_params.get('role') or getattr(request.user, 'role', 'Farmer')
        insight = get_or_generate_insight(request.user, role, force_refresh=True)
        serializer = CachedInsightSerializer(insight)
        return Response(serializer.data, status=status.HTTP_200_OK)

