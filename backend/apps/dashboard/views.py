from rest_framework import views, status
from rest_framework.response import Response
from apps.permits import models as permits
from apps.maps import models as maps
from apps.inspector import models as inspector
from django.db.models import Count, Q, Avg, Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from datetime import timedelta

from rest_framework.permissions import IsAuthenticated

class AgriDashboardView(views.APIView):
    """
    Dashboard metrics for Agricultural Officers.
    Includes system health KPIs and trend charts.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. KPIs (Pipeline and Automation)
        pending_agri = permits.PermitApplication.objects.filter(
            status__in=[permits.PermitApplication.Status.SUBMITTED, permits.PermitApplication.Status.OCR_VALIDATED, permits.PermitApplication.Status.MANUAL]
        ).count()
        awaiting_payment = permits.PermitApplication.objects.filter(status=permits.PermitApplication.Status.PAYMENT_PENDING).count()
        at_opv = permits.PermitApplication.objects.filter(status=permits.PermitApplication.Status.FORWARDED_TO_OPV).count()
        
        total_ocr = permits.OCRValidationResult.objects.count()
        success_ocr = permits.OCRValidationResult.objects.filter(status='PASSED', manually_overridden=False).count()
        digital_verification_rate = (success_ocr / total_ocr) * 100 if total_ocr > 0 else 0

        # 2. Charts: Density Trend (Avg pigs per survey)
        density_trend = (
            maps.HogSurvey.objects.annotate(date=TruncMonth('survey_date'))
            .values('date').annotate(avg=Avg('total_pigs')).order_by('date')
        )

        # 3. Charts: Monthly Application Volume (System Growth)
        submission_trend = (
            permits.PermitApplication.objects.annotate(date=TruncMonth('created_at'))
            .values('date').annotate(count=Count('id')).order_by('date')
        )

        # 4. Charts: Application Status Distribution
        status_dist = permits.PermitApplication.objects.values('status').annotate(count=Count('id'))

        return Response({
            "kpis": {
                "pending_agri_review": pending_agri,
                "awaiting_payment": awaiting_payment,
                "currently_at_opv": at_opv,
                "digital_verification_rate": round(digital_verification_rate, 1),
            },
            "charts": {
                "density_trend": density_trend,
                "submission_trend": submission_trend,
                "status_distribution": status_dist,
            }
        }, status=status.HTTP_200_OK)

class FarmerDashboardView(views.APIView):
    """
    Dashboard metrics for Farmers.
    Includes personal business KPIs and transport volume charts.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        my_apps = permits.PermitApplication.objects.filter(farmer=user)
        
        # 1. Personal KPIs
        total_apps = my_apps.count()
        active_permits = my_apps.filter(status=permits.PermitApplication.Status.RELEASED).count()
        needs_payment = my_apps.filter(status=permits.PermitApplication.Status.PAYMENT_PENDING).count()

        # 2. Charts: Monthly Transport Volume (Sum of pigs per month)
        transport_volume = (
            my_apps.annotate(date=TruncMonth('created_at'))
            .values('date').annotate(total_pigs=Sum('origins__number_of_pigs')).order_by('date')
        )

        # 3. Charts: Status Distribution (Personal)
        status_dist = my_apps.values('status').annotate(count=Count('id'))

        return Response({
            "kpis": {
                "total_applications": total_apps,
                "active_permits": active_permits,
                "pending_payments": needs_payment,
            },
            "charts": {
                "transport_volume": transport_volume,
                "status_distribution": status_dist,
            },
            "recent_applications": my_apps.order_by('-updated_at')[:5].values('id','application_id', 'status', 'updated_at')
        }, status=status.HTTP_200_OK)

class OPVDashboardView(views.APIView):
    """
    Dashboard metrics for OPV Staff.
    Includes validation productivity, workload, and tactical livestock movement.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # 1. Pipeline KPIs
        pending_validation = permits.PermitApplication.objects.filter(status=permits.PermitApplication.Status.FORWARDED_TO_OPV).count()
        completed_today = permits.OPVValidation.objects.filter(validated_at__date=timezone.now().date(), status=permits.OPVValidation.Status.VALIDATED).count()

        # Rejection Rate & Pass Rate
        opv_processed_30 = permits.OPVValidation.objects.filter(validated_at__gte=thirty_days_ago)
        total_validated_30 = opv_processed_30.count()
        total_rejected_30 = opv_processed_30.filter(status=permits.OPVValidation.Status.REJECTED).count()
        total_passed_30 = opv_processed_30.filter(status=permits.OPVValidation.Status.VALIDATED).count()
        
        rejection_rate = (total_rejected_30 / total_validated_30 * 100) if total_validated_30 > 0 else 0
        pass_rate = (total_passed_30 / total_validated_30 * 100) if total_validated_30 > 0 else 0

        # Total Volume (Heads)
        validated_apps_30 = permits.PermitApplication.objects.filter(
            created_at__gte=thirty_days_ago,
            status__in=[
                permits.PermitApplication.Status.OPV_VALIDATED,
                permits.PermitApplication.Status.PERMIT_ISSUED,
                permits.PermitApplication.Status.PAYMENT_PENDING,
                permits.PermitApplication.Status.RELEASED
            ]
        )
        total_volume = validated_apps_30.aggregate(total=Sum('origins__number_of_pigs'))['total'] or 0

        # 2. Charts: Daily Validation Volume (Last 14 days)
        two_weeks_ago = timezone.now().date() - timedelta(days=14)
        validation_history = (
            permits.OPVValidation.objects.filter(validated_at__date__gte=two_weeks_ago)
            .annotate(date=TruncDate('validated_at'))
            .values('date').annotate(count=Count('id')).order_by('date')
        )

        # 3. Tactical Charts (Top 5)
        top_barangays = (
            validated_apps_30.values('origins__barangay__name')
            .annotate(count=Sum('origins__number_of_pigs'))
            .order_by('-count')[:5]
        )
        
        top_destinations = (
            validated_apps_30.values('destination')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )

        return Response({
            "kpis": {
                "waiting_for_opv": pending_validation,
                "validated_today": completed_today,
                "rejection_rate": round(rejection_rate, 1),
                "pass_rate": round(pass_rate, 1),
                "total_volume": total_volume,
            },
            "charts": {
                "validation_history": validation_history,
                "top_barangays": [{"name": item['origins__barangay__name'], "count": item['count']} for item in top_barangays if item['origins__barangay__name']],
                "top_destinations": [{"name": item['destination'], "count": item['count']} for item in top_destinations]
            }
        }, status=status.HTTP_200_OK)

class InspectorDashboardView(views.APIView):
    """
    Dashboard metrics for Inspectors.
    Includes scan activity and verification charts.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        my_logs = inspector.InspectorLogs.objects.filter(inspector=user)
        
        # 1. KPIs
        total_scans = my_logs.count()
        scans_today = my_logs.filter(scanned_at__date=timezone.now().date()).count()

        # System-wide active permits (What's on the road?)
        currently_active_permits = permits.IssuedPermit.objects.filter(
            is_paid=True,
            valid_until__gte=timezone.now().date()
        ).count()

        # 2. Charts: Verification Activity (Daily scans for last 14 days)
        two_weeks_ago = timezone.now().date() - timedelta(days=14)
        activity_trend = (
            my_logs.filter(scanned_at__date__gte=two_weeks_ago)
            .annotate(date=TruncDate('scanned_at'))
            .values('date').annotate(count=Count('id')).order_by('date')
        )

        return Response({
            "kpis": {
                "my_total_scans": total_scans,
                "scans_today": scans_today,
                "total_active_permits_in_system": currently_active_permits,
            },
            "charts": {
                "activity_trend": activity_trend,
            },
            "recent_activity": my_logs.order_by('-scanned_at')[:5].values('application__application_id', 'scanned_at')
        }, status=status.HTTP_200_OK)
