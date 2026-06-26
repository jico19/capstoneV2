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

class AgriDashboardView(views.APIView):
    """
    Dashboard metrics for Agricultural Officers.
    Includes system health KPIs, municipal swine density, revenue, and transport volume.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. KPIs (Pipeline and Automation)
        pending_agri = permits.PermitApplication.objects.filter(
            status__in=[permits.PermitApplication.Status.SUBMITTED, permits.PermitApplication.Status.OCR_VALIDATED, permits.PermitApplication.Status.MANUAL]
        ).count()
        awaiting_payment = permits.PermitApplication.objects.filter(status=permits.PermitApplication.Status.PAYMENT_PENDING).count()
        at_opv = permits.PermitApplication.objects.filter(status=permits.PermitApplication.Status.FORWARDED_TO_OPV).count()
        
        # Total registered pigs in the system (from survey)
        total_pigs_registered = maps.HogSurvey.objects.aggregate(total=Sum('total_pigs'))['total'] or 0

        # 2. Charts: Barangay Swine Density (Actual concentration of pigs per barangay from HogSurvey)
        barangay_density = (
            maps.HogSurvey.objects.values('barangay__name')
            .annotate(count=Sum('total_pigs'))
            .order_by('-count')[:8]
        )
        density_data = [{"name": item['barangay__name'], "count": item['count']} for item in barangay_density if item['barangay__name']]

        # 3. Charts: Monthly Livestock Transport Volume (Sum of pigs shipped on released permits)
        transport_volume = (
            permits.PermitApplication.objects.filter(status=permits.PermitApplication.Status.RELEASED)
            .annotate(date=TruncMonth('transport_date'))
            .values('date')
            .annotate(count=Sum('origins__number_of_pigs'))
            .order_by('date')
        )
        # Format transport dates to YYYY-MM
        transport_data = []
        for item in transport_volume:
            if item['date']:
                date_str = item['date'].strftime('%Y-%m') if hasattr(item['date'], 'strftime') else str(item['date'])
                transport_data.append({"date": date_str, "count": item['count']})

        # 4. Charts: Monthly Revenue Collection (Sum of payments confirmed/successful)
        revenue_trend = (
            PaymentHistory.objects.filter(status__in=[PaymentHistory.Status.CONFIRMED, PaymentHistory.Status.SUCCESS])
            .annotate(date=TruncMonth('confirmed_at'))
            .values('date')
            .annotate(amount=Sum('amount'))
            .order_by('date')
        )
        revenue_data = []
        for item in revenue_trend:
            if item['date']:
                date_str = item['date'].strftime('%Y-%m') if hasattr(item['date'], 'strftime') else str(item['date'])
                revenue_data.append({"date": date_str, "amount": item['amount']})

        # 5. Charts: Application Status Distribution
        status_dist = permits.PermitApplication.objects.values('status').annotate(count=Count('id'))

        return Response({
            "kpis": {
                "pending_agri_review": pending_agri,
                "awaiting_payment": awaiting_payment,
                "currently_at_opv": at_opv,
                "total_pigs_registered": total_pigs_registered,
            },
            "charts": {
                "density_trend": density_data,      # maps to density_trend in frontend for compatibility, but is now Barangay density
                "submission_trend": transport_data,  # maps to submission_trend but is now actual animal head count shipped
                "revenue_trend": revenue_data,       # new revenue trend chart
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
        active_permits = my_apps.filter(status=permits.PermitApplication.Status.RELEASED, is_checked=False).count()
        needs_payment = my_apps.filter(status=permits.PermitApplication.Status.PAYMENT_PENDING).count()

        # 2. Charts: Monthly Transport Volume (Sum of pigs per month for released permits)
        transport_volume = (
            my_apps.filter(status=permits.PermitApplication.Status.RELEASED)
            .annotate(date=TruncMonth('transport_date'))
            .values('date').annotate(total_pigs=Sum('origins__number_of_pigs')).order_by('date')
        )
        transport_data = []
        for item in transport_volume:
            if item['date']:
                date_str = item['date'].strftime('%Y-%m') if hasattr(item['date'], 'strftime') else str(item['date'])
                transport_data.append({"date": date_str, "total_pigs": item['total_pigs']})

        # 3. Charts: Status Distribution (Personal)
        status_dist = my_apps.values('status').annotate(count=Count('id'))

        # 4. KPI: System-wide Average processing time in hours (to manage expectations)
        validated_opv = permits.OPVValidation.objects.filter(status=permits.OPVValidation.Status.VALIDATED)
        validations = validated_opv.select_related('application')[:100]
        total_hours = 0
        count = 0
        for val in validations:
            if val.validated_at and val.application.created_at:
                diff = val.validated_at - val.application.created_at
                total_hours += diff.total_seconds() / 3600.0
                count += 1
        avg_processing_hours = round(total_hours / count, 1) if count > 0 else 4.2

        return Response({
            "kpis": {
                "total_applications": total_apps,
                "active_permits": active_permits,
                "pending_payments": needs_payment,
                "avg_processing_hours": avg_processing_hours,
            },
            "charts": {
                "transport_volume": transport_data,
                "status_distribution": status_dist,
            },
            "recent_applications": my_apps.order_by('-updated_at')[:5].values('id','application_id', 'status', 'transport_date' )
        }, status=status.HTTP_200_OK)

class OPVDashboardView(views.APIView):
    """
    Dashboard metrics for OPV Staff.
    Includes validation productivity, workload, rejection reasons, and tactical livestock movement.
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

        # Total Volume (Pigs)
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
        validation_history_formatted = []
        for item in validation_history:
            if item['date']:
                date_str = item['date'].strftime('%Y-%m-%d') if hasattr(item['date'], 'strftime') else str(item['date'])
                validation_history_formatted.append({"date": date_str, "count": item['count']})

        # 3. Charts: Rejection reasons categorized from raw text remarks
        rejections = opv_processed_30.filter(status=permits.OPVValidation.Status.REJECTED).values_list('remarks', flat=True)
        category_counts = {}
        for r in rejections:
            r_lower = r.lower() if r else ""
            if not r_lower.strip():
                cat = "Unspecified Reason"
            elif "doc" in r_lower or "paper" in r_lower or "file" in r_lower or "license" in r_lower or "pass" in r_lower:
                cat = "Incomplete/Invalid Documents"
            elif "sign" in r_lower or "vet" in r_lower or "officer" in r_lower:
                cat = "Missing Signatures"
            elif "date" in r_lower or "expire" in r_lower or "time" in r_lower:
                cat = "Invalid Schedule/Expired Dates"
            elif "pig" in r_lower or "count" in r_lower or "number" in r_lower or "head" in r_lower or "weight" in r_lower:
                cat = "Swine Count Discrepancy"
            elif "origin" in r_lower or "dest" in r_lower or "location" in r_lower or "route" in r_lower or "barangay" in r_lower:
                cat = "Quarantine / Route Restrictions"
            else:
                cat = "Other Technical Flaws"
            category_counts[cat] = category_counts.get(cat, 0) + 1
        
        rejection_reasons_data = [{"reason": k, "count": v} for k, v in category_counts.items()]
        rejection_reasons_data = sorted(rejection_reasons_data, key=lambda x: x['count'], reverse=True)[:5]

        # 4. Tactical Charts (Top 5 origin Barangays by head count of pigs)
        top_barangays = (
            validated_apps_30.values('origins__barangay__name')
            .annotate(count=Sum('origins__number_of_pigs'))
            .order_by('-count')[:5]
        )
        
        # 5. Tactical Charts (Top 5 destinations by total head count of pigs)
        top_destinations = (
            validated_apps_30.values('destination')
            .annotate(count=Sum('origins__number_of_pigs'))
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
                "validation_history": validation_history_formatted,
                "rejection_reasons": rejection_reasons_data,
                "top_barangays": [{"name": item['origins__barangay__name'], "count": item['count']} for item in top_barangays if item['origins__barangay__name']],
                "top_destinations": [{"name": item['destination'], "count": item['count']} for item in top_destinations]
            }
        }, status=status.HTTP_200_OK)

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
        activity_trend_formatted = []
        for item in activity_trend:
            if item['date']:
                date_str = item['date'].strftime('%Y-%m-%d') if hasattr(item['date'], 'strftime') else str(item['date'])
                activity_trend_formatted.append({"date": date_str, "count": item['count']})

        # 3. Charts: Peak Activity (Hourly scans for current inspector)
        peak_activity = (
            my_logs.annotate(hour=ExtractHour('scanned_at'))
            .values('hour')
            .annotate(count=Count('id'))
            .order_by('hour')
        )
        
        hour_map = {item['hour']: item['count'] for item in peak_activity}
        full_peak_activity = [
            {"hour": f"{h:02d}:00", "count": hour_map.get(h, 0)}
            for h in range(24)
        ]

        # 4. Recent activity with headcount and destination
        recent_activity = []
        for log in my_logs.select_related('application').order_by('-scanned_at')[:5]:
            total_pigs = log.application.origins.aggregate(total=Sum('number_of_pigs'))['total'] or 0
            recent_activity.append({
                "application_id": log.application.application_id,
                "scanned_at": log.scanned_at.strftime('%Y-%m-%d %H:%M') if log.scanned_at else '',
                "destination": log.application.destination,
                "total_pigs": total_pigs
            })

        return Response({
            "kpis": {
                "my_total_scans": total_scans,
                "scans_today": scans_today,
                "total_active_permits_in_system": currently_active_permits,
            },
            "charts": {
                "activity_trend": activity_trend_formatted,
                "peak_activity": full_peak_activity,
            },
            "recent_activity": recent_activity
        }, status=status.HTTP_200_OK)
