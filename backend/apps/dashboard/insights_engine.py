import json
import logging
import requests
from datetime import timedelta
from django.conf import settings
from django.db.models import Count, Sum, Q, Avg
from django.db.models.functions import TruncMonth, TruncDate, ExtractHour
from django.utils import timezone

from apps.permits import models as permits
from apps.maps import models as maps
from apps.inspector import models as inspector
from apps.payment.models import PaymentHistory
from .models import CachedInsight

logger = logging.getLogger(__name__)


class RoleMetricExtractor:
    """
    Extracts current period vs prior period quantitative datasets
    for each FarmPass user role to drive trend analysis.
    """

    @staticmethod
    def get_period_dates(days=30):
        now = timezone.now()
        current_start = now - timedelta(days=days)
        prior_start = current_start - timedelta(days=days)
        return now, current_start, prior_start

    @classmethod
    def extract_agri_metrics(cls):
        now, cur_start, pri_start = cls.get_period_dates(30)

        # Current period (last 30 days)
        cur_apps = permits.PermitApplication.objects.filter(created_at__gte=cur_start)
        cur_submitted = cur_apps.count()
        cur_released = cur_apps.filter(status=permits.PermitApplication.Status.RELEASED).count()
        cur_rejected = cur_apps.filter(status__in=[permits.PermitApplication.Status.OPV_REJECTED, permits.PermitApplication.Status.RESUBMISSION]).count()
        cur_pigs = cur_apps.filter(status=permits.PermitApplication.Status.RELEASED).aggregate(
            total=Sum('origins__number_of_pigs')
        )['total'] or 0

        # Prior period (30 to 60 days ago)
        pri_apps = permits.PermitApplication.objects.filter(created_at__gte=pri_start, created_at__lt=cur_start)
        pri_submitted = pri_apps.count()
        pri_released = pri_apps.filter(status=permits.PermitApplication.Status.RELEASED).count()
        pri_rejected = pri_apps.filter(status__in=[permits.PermitApplication.Status.OPV_REJECTED, permits.PermitApplication.Status.RESUBMISSION]).count()
        pri_pigs = pri_apps.filter(status=permits.PermitApplication.Status.RELEASED).aggregate(
            total=Sum('origins__number_of_pigs')
        )['total'] or 0

        # Revenue
        cur_rev = PaymentHistory.objects.filter(
            status__in=[PaymentHistory.Status.CONFIRMED, PaymentHistory.Status.SUCCESS],
            confirmed_at__gte=cur_start
        ).aggregate(total=Sum('amount'))['total'] or 0

        pri_rev = PaymentHistory.objects.filter(
            status__in=[PaymentHistory.Status.CONFIRMED, PaymentHistory.Status.SUCCESS],
            confirmed_at__gte=pri_start,
            confirmed_at__lt=cur_start
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Operational Queue / Bottlenecks
        pending_review = permits.PermitApplication.objects.filter(
            status__in=[permits.PermitApplication.Status.SUBMITTED, permits.PermitApplication.Status.OCR_VALIDATED, permits.PermitApplication.Status.MANUAL]
        ).count()
        awaiting_payment = permits.PermitApplication.objects.filter(status=permits.PermitApplication.Status.PAYMENT_PENDING).count()
        at_opv = permits.PermitApplication.objects.filter(status=permits.PermitApplication.Status.FORWARDED_TO_OPV).count()

        # Swine density top barangays
        top_barangays = list(
            maps.HogSurvey.objects.values('barangay__name')
            .annotate(total_pigs=Sum('total_pigs'))
            .order_by('-total_pigs')[:5]
        )

        return {
            "role": "Agri",
            "current_period_days": 30,
            "current_metrics": {
                "submissions": cur_submitted,
                "permits_released": cur_released,
                "permits_rejected": cur_rejected,
                "swine_shipped": cur_pigs,
                "revenue_php": float(cur_rev),
            },
            "prior_metrics": {
                "submissions": pri_submitted,
                "permits_released": pri_released,
                "permits_rejected": pri_rejected,
                "swine_shipped": pri_pigs,
                "revenue_php": float(pri_rev),
            },
            "backlog_and_queue": {
                "pending_agri_review": pending_review,
                "awaiting_payment": awaiting_payment,
                "forwarded_to_opv": at_opv,
            },
            "top_swine_density_barangays": [
                {"barangay": b['barangay__name'], "pigs": b['total_pigs']} for b in top_barangays if b['barangay__name']
            ]
        }

    @classmethod
    def extract_farmer_metrics(cls, user):
        now, cur_start, pri_start = cls.get_period_dates(30)
        farmer_apps = permits.PermitApplication.objects.filter(farmer=user)

        cur_apps = farmer_apps.filter(created_at__gte=cur_start)
        cur_submitted = cur_apps.count()
        cur_approved = cur_apps.filter(status__in=[permits.PermitApplication.Status.RELEASED, permits.PermitApplication.Status.PERMIT_ISSUED]).count()
        cur_rejected = cur_apps.filter(status__in=[permits.PermitApplication.Status.OPV_REJECTED, permits.PermitApplication.Status.RESUBMISSION]).count()
        cur_pigs = cur_apps.filter(status=permits.PermitApplication.Status.RELEASED).aggregate(
            total=Sum('origins__number_of_pigs')
        )['total'] or 0

        pri_apps = farmer_apps.filter(created_at__gte=pri_start, created_at__lt=cur_start)
        pri_submitted = pri_apps.count()
        pri_approved = pri_apps.filter(status__in=[permits.PermitApplication.Status.RELEASED, permits.PermitApplication.Status.PERMIT_ISSUED]).count()
        pri_rejected = pri_apps.filter(status__in=[permits.PermitApplication.Status.OPV_REJECTED, permits.PermitApplication.Status.RESUBMISSION]).count()
        pri_pigs = pri_apps.filter(status=permits.PermitApplication.Status.RELEASED).aggregate(
            total=Sum('origins__number_of_pigs')
        )['total'] or 0

        # Immediate actionable items
        active_permits = farmer_apps.filter(status=permits.PermitApplication.Status.RELEASED, is_checked=False).count()
        pending_payments = farmer_apps.filter(status=permits.PermitApplication.Status.PAYMENT_PENDING).count()
        pending_review = farmer_apps.filter(
            status__in=[permits.PermitApplication.Status.SUBMITTED, permits.PermitApplication.Status.OCR_VALIDATED, permits.PermitApplication.Status.FORWARDED_TO_OPV]
        ).count()

        # Recent rejection remarks from opv_validation if any
        recent_rejections = []
        for a in farmer_apps.filter(status__in=[permits.PermitApplication.Status.OPV_REJECTED, permits.PermitApplication.Status.RESUBMISSION]).order_by('-updated_at')[:3]:
            remark = ""
            if hasattr(a, 'opv_validation') and a.opv_validation:
                remark = a.opv_validation.remarks
            recent_rejections.append({
                "application_id": a.application_id,
                "rejection_reason": remark or "Document or schedule discrepancy"
            })

        return {
            "role": "Farmer",
            "current_period_days": 30,
            "current_metrics": {
                "applications_submitted": cur_submitted,
                "applications_approved": cur_approved,
                "applications_rejected": cur_rejected,
                "swine_transported": cur_pigs,
            },
            "prior_metrics": {
                "applications_submitted": pri_submitted,
                "applications_approved": pri_approved,
                "applications_rejected": pri_rejected,
                "swine_transported": pri_pigs,
            },
            "status_summary": {
                "active_ready_to_use_permits": active_permits,
                "pending_payments_required": pending_payments,
                "in_review_queue": pending_review,
            },
            "recent_rejection_notes": recent_rejections
        }

    @classmethod
    def extract_barangay_metrics(cls, user):
        now, cur_start, pri_start = cls.get_period_dates(30)
        barangay = user.barangay

        if not barangay:
            return {
                "role": "Barangay",
                "barangay_name": "Unassigned Barangay",
                "current_period_days": 30,
                "current_metrics": {"total_pigs": 0, "permits_originating": 0},
                "prior_metrics": {"total_pigs": 0, "permits_originating": 0},
                "census_breakdown": {},
                "is_sparse": True
            }

        # Latest survey stats
        surveys = maps.HogSurvey.objects.filter(barangay=barangay).order_by('-survey_date')
        latest_survey = surveys.first()
        prev_survey = surveys[1] if surveys.count() > 1 else None

        cur_total_pigs = latest_survey.total_pigs if latest_survey else 0
        pri_total_pigs = prev_survey.total_pigs if prev_survey else cur_total_pigs

        breakdown = {}
        if latest_survey:
            breakdown = {
                "inahin": latest_survey.inahin,
                "barako": latest_survey.barako,
                "fattener": latest_survey.fattener,
                "grower": latest_survey.grower,
                "starter": latest_survey.starter,
                "bulaw": latest_survey.bulaw,
            }

        # Permits originating from this barangay
        cur_permits = permits.PermitApplication.objects.filter(
            origins__barangay=barangay,
            created_at__gte=cur_start
        ).distinct().count()

        pri_permits = permits.PermitApplication.objects.filter(
            origins__barangay=barangay,
            created_at__gte=pri_start,
            created_at__lt=cur_start
        ).distinct().count()

        return {
            "role": "Barangay",
            "barangay_name": barangay.name,
            "current_period_days": 30,
            "current_metrics": {
                "total_registered_pigs": cur_total_pigs,
                "permits_originating": cur_permits,
            },
            "prior_metrics": {
                "total_registered_pigs": pri_total_pigs,
                "permits_originating": pri_permits,
            },
            "census_breakdown": breakdown,
            "last_survey_date": str(latest_survey.survey_date) if latest_survey else None,
        }

    @classmethod
    def extract_opv_metrics(cls):
        now, cur_start, pri_start = cls.get_period_dates(30)

        cur_validations = permits.OPVValidation.objects.filter(validated_at__gte=cur_start)
        cur_total = cur_validations.count()
        cur_passed = cur_validations.filter(status=permits.OPVValidation.Status.VALIDATED).count()
        cur_rejected = cur_validations.filter(status=permits.OPVValidation.Status.REJECTED).count()
        cur_pass_rate = round((cur_passed / cur_total * 100), 1) if cur_total > 0 else 0
        cur_rejection_rate = round((cur_rejected / cur_total * 100), 1) if cur_total > 0 else 0

        pri_validations = permits.OPVValidation.objects.filter(validated_at__gte=pri_start, validated_at__lt=cur_start)
        pri_total = pri_validations.count()
        pri_passed = pri_validations.filter(status=permits.OPVValidation.Status.VALIDATED).count()
        pri_rejected = pri_validations.filter(status=permits.OPVValidation.Status.REJECTED).count()
        pri_pass_rate = round((pri_passed / pri_total * 100), 1) if pri_total > 0 else 0
        pri_rejection_rate = round((pri_rejected / pri_total * 100), 1) if pri_total > 0 else 0

        # Turnaround calculation
        vals = cur_validations.filter(status=permits.OPVValidation.Status.VALIDATED).select_related('application')[:50]
        total_hours = 0
        count = 0
        for v in vals:
            if v.validated_at and v.application and v.application.created_at:
                diff = v.validated_at - v.application.created_at
                total_hours += diff.total_seconds() / 3600.0
                count += 1
        avg_turnaround_hours = round(total_hours / count, 1) if count > 0 else 4.2

        # Rejection reason categories
        rejections = cur_validations.filter(status=permits.OPVValidation.Status.REJECTED).values_list('remarks', flat=True)
        cat_counts = {}
        for r in rejections:
            r_lower = (r or "").lower()
            if not r_lower.strip():
                cat = "Unspecified Reason"
            elif any(k in r_lower for k in ["doc", "paper", "file", "license", "pass"]):
                cat = "Incomplete/Invalid Documents"
            elif any(k in r_lower for k in ["sign", "vet", "officer"]):
                cat = "Missing Signatures"
            elif any(k in r_lower for k in ["date", "expire", "time"]):
                cat = "Invalid Schedule / Expired Dates"
            elif any(k in r_lower for k in ["pig", "count", "number", "head"]):
                cat = "Swine Count Discrepancy"
            else:
                cat = "Quarantine / Route Restrictions"
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

        top_reasons = sorted([{"reason": k, "count": v} for k, v in cat_counts.items()], key=lambda x: x['count'], reverse=True)[:4]

        pending_opv = permits.PermitApplication.objects.filter(status=permits.PermitApplication.Status.FORWARDED_TO_OPV).count()

        return {
            "role": "OPV",
            "current_period_days": 30,
            "current_metrics": {
                "validations_processed": cur_total,
                "passed_count": cur_passed,
                "rejected_count": cur_rejected,
                "pass_rate_pct": cur_pass_rate,
                "rejection_rate_pct": cur_rejection_rate,
                "avg_turnaround_hours": avg_turnaround_hours,
            },
            "prior_metrics": {
                "validations_processed": pri_total,
                "passed_count": pri_passed,
                "rejected_count": pri_rejected,
                "pass_rate_pct": pri_pass_rate,
                "rejection_rate_pct": pri_rejection_rate,
            },
            "pending_validation_queue": pending_opv,
            "top_rejection_causes": top_reasons
        }

    @classmethod
    def extract_inspector_metrics(cls, user):
        now, cur_start, pri_start = cls.get_period_dates(14)
        my_logs = inspector.InspectorLogs.objects.filter(inspector=user)

        cur_logs = my_logs.filter(scanned_at__gte=cur_start)
        cur_scans = cur_logs.count()
        scans_today = my_logs.filter(scanned_at__date=now.date()).count()

        pri_logs = my_logs.filter(scanned_at__gte=pri_start, scanned_at__lt=cur_start)
        pri_scans = pri_logs.count()

        # Peak hours analysis
        peak_activity = (
            cur_logs.annotate(hour=ExtractHour('scanned_at'))
            .values('hour')
            .annotate(count=Count('id'))
            .order_by('-count')[:3]
        )
        peak_hours_list = [f"{item['hour']:02d}:00" for item in peak_activity]

        active_permits_on_road = permits.IssuedPermit.objects.filter(
            is_paid=True,
            valid_until__gte=now.date()
        ).count()

        return {
            "role": "Inspector",
            "current_period_days": 14,
            "current_metrics": {
                "my_total_scans": cur_scans,
                "scans_today": scans_today,
                "active_permits_on_road": active_permits_on_road,
            },
            "prior_metrics": {
                "my_total_scans": pri_scans,
            },
            "peak_transit_hours": peak_hours_list
        }


class FallbackInsightsBuilder:
    """
    Generates deterministic, high-signal statistical summaries with
    severity indicators when Gemini API is not configured or fails.
    """

    @staticmethod
    def build(role: str, metrics: dict) -> dict:
        cur = metrics.get("current_metrics", {})
        pri = metrics.get("prior_metrics", {})

        # Check for sparse data
        total_activity = sum(v for v in cur.values() if isinstance(v, (int, float)))
        if total_activity == 0:
            return {
                "summary": "Not enough activity recorded yet for automated trend analysis. Continue using the system to generate insights.",
                "trends": [
                    {
                        "text": "Baseline system metrics are initializing as operational data is recorded.",
                        "severity": "neutral"
                    }
                ],
                "actions": [
                    "Complete pending submissions or registrations to activate live performance comparisons."
                ]
            }

        if role == "Agri":
            rev_cur = cur.get("revenue_php", 0)
            rev_pri = pri.get("revenue_php", 0)
            rev_diff = rev_cur - rev_pri
            rev_pct = round((rev_diff / rev_pri * 100), 1) if rev_pri > 0 else 0

            sub_cur = cur.get("submissions", 0)
            sub_pri = pri.get("submissions", 0)
            sub_pct = round(((sub_cur - sub_pri) / sub_pri * 100), 1) if sub_pri > 0 else 0

            backlog = metrics.get("backlog_and_queue", {})
            pending_rev = backlog.get("pending_agri_review", 0)

            trends = []
            if rev_pct >= 0:
                trends.append({
                    "text": f"Municipal revenue collection reached ?{rev_cur:,.2f} ({'+' if rev_pct > 0 else ''}{rev_pct}% vs prior month).",
                    "severity": "positive" if rev_pct > 0 else "neutral"
                })
            else:
                trends.append({
                    "text": f"Municipal revenue dipped by {abs(rev_pct)}% compared to the previous 30-day period.",
                    "severity": "warning"
                })

            if pending_rev > 5:
                trends.append({
                    "text": f"Manual review queue has {pending_rev} applications pending validation.",
                    "severity": "warning"
                })
            else:
                trends.append({
                    "text": f"Permit pipeline is operating efficiently with only {pending_rev} applications in review.",
                    "severity": "positive"
                })

            actions = [
                f"Process {pending_rev} pending manual permit reviews to avoid downstream OPV delays.",
                "Monitor high swine density barangays for routine veterinary quarantine checkups."
            ]

            summary = f"Municipal livestock transit shows {cur.get('swine_shipped', 0):,} pigs shipped over {sub_cur} permit submissions this month. Revenue currently stands at ?{rev_cur:,.2f}."
            return {"summary": summary, "trends": trends, "actions": actions}

        elif role == "Farmer":
            approved = cur.get("applications_approved", 0)
            rejected = cur.get("applications_rejected", 0)
            status_sum = metrics.get("status_summary", {})
            active = status_sum.get("active_ready_to_use_permits", 0)
            pending_pay = status_sum.get("pending_payments_required", 0)

            trends = []
            if active > 0:
                trends.append({
                    "text": f"You have {active} approved permit(s) ready for livestock transit.",
                    "severity": "positive"
                })
            if pending_pay > 0:
                trends.append({
                    "text": f"You have {pending_pay} application(s) awaiting payment confirmation.",
                    "severity": "warning"
                })
            if rejected > 0:
                trends.append({
                    "text": f"{rejected} application(s) were rejected recently due to document discrepancies.",
                    "severity": "critical"
                })
            elif not trends:
                trends.append({
                    "text": "All submitted applications are in good standing with zero rejections.",
                    "severity": "positive"
                })

            actions = []
            if pending_pay > 0:
                actions.append("Complete outstanding permit fee payments to release transit QR codes.")
            if rejected > 0:
                actions.append("Review validator rejection remarks and resubmit corrected credentials.")
            if not actions:
                actions.append("Download approved QR passes before loading livestock for scheduled transit.")

            summary = f"You currently have {active} active transport permit(s) and {cur.get('swine_transported', 0)} swine head transported this month."
            return {"summary": summary, "trends": trends, "actions": actions}

        elif role == "Barangay":
            b_name = metrics.get("barangay_name", "Barangay")
            pigs = cur.get("total_registered_pigs", 0)
            permits_count = cur.get("permits_originating", 0)

            trends = [
                {
                    "text": f"Current registered swine census in {b_name} stands at {pigs:,} heads.",
                    "severity": "neutral"
                },
                {
                    "text": f"{permits_count} transport clearances originated from your barangay in the last 30 days.",
                    "severity": "positive" if permits_count > 0 else "neutral"
                }
            ]

            actions = [
                "Verify that all local backyard hog raisers are updated in the periodic swine census.",
                "Ensure originating livestock have verified Barangay clearances prior to municipal transit."
            ]

            summary = f"{b_name} maintains an active swine registry of {pigs:,} heads with {permits_count} transit clearances processed."
            return {"summary": summary, "trends": trends, "actions": actions}

        elif role == "OPV":
            val_total = cur.get("validations_processed", 0)
            pass_rate = cur.get("pass_rate_pct", 0)
            rej_rate = cur.get("rejection_rate_pct", 0)
            pending_queue = metrics.get("pending_validation_queue", 0)

            trends = [
                {
                    "text": f"Validation pass rate is {pass_rate}% across {val_total} processed applications.",
                    "severity": "positive" if pass_rate >= 80 else "warning"
                }
            ]
            if pending_queue > 10:
                trends.append({
                    "text": f"Validation backlog is elevated with {pending_queue} applications awaiting OPV clearance.",
                    "severity": "warning"
                })
            else:
                trends.append({
                    "text": f"Validation backlog is manageable at {pending_queue} items in queue.",
                    "severity": "positive"
                })

            actions = [
                "Review pending validation queue to maintain turnaround target of under 4 hours.",
                "Inspect high-frequency document rejection categories to guide municipal checkers."
            ]

            summary = f"OPV processed {val_total} permit validations in the last 30 days with an overall pass rate of {pass_rate}%."
            return {"summary": summary, "trends": trends, "actions": actions}

        elif role == "Inspector":
            scans = cur.get("my_total_scans", 0)
            active_permits = cur.get("active_permits_on_road", 0)
            peaks = metrics.get("peak_transit_hours", [])
            peak_str = ", ".join(peaks) if peaks else "standard hours"

            trends = [
                {
                    "text": f"You performed {scans} checkpoint scans over the last 14 days.",
                    "severity": "positive" if scans > 0 else "neutral"
                },
                {
                    "text": f"There are currently {active_permits} active livestock permits on the road.",
                    "severity": "neutral"
                }
            ]

            actions = [
                f"Schedule heightened checkpoint monitoring during peak hours ({peak_str}).",
                "Ensure physical headcounts precisely match digital QR permit manifests during transit."
            ]

            summary = f"Checkpoint operations show {active_permits} active transport passes in transit across the municipality."
            return {"summary": summary, "trends": trends, "actions": actions}

        return {
            "summary": "Operations summary generated based on current system activity.",
            "trends": [{"text": "System metrics are within expected operating parameters.", "severity": "neutral"}],
            "actions": ["Continue routine monitoring of dashboard metrics."]
        }


class GeminiInsightsClient:
    """
    Communicates with Google Gemini REST API using settings.GEMENI_API_KEY.
    Forces strict JSON format output matching the FarmPass insights schema.
    """

    API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

    @classmethod
    def generate_insight(cls, role: str, metrics: dict) -> dict:
        api_key = getattr(settings, "GEMENI_API_KEY", None)
        if not api_key:
            logger.info("Gemini API key not configured; using deterministic fallback insights.")
            return FallbackInsightsBuilder.build(role, metrics)

        system_instruction = (
            "You are FarmPass AI, an intelligent operational advisor for swine biosecurity and livestock logistics. "
            "Write in clear, non-technical plain English in the second person ('you', 'your'). "
            "Analyze the provided current vs. prior period metrics. Highlight positive trends, drops, bottlenecks, and anomalies. "
            "Return STRICT JSON only matching this exact schema:\n"
            "{\n"
            '  "summary": "2-3 sentence executive summary explaining what is happening right now in plain English.",\n'
            '  "trends": [\n'
            '    {"text": "Trend explanation comparing periods or highlighting key metric.", "severity": "positive"|"warning"|"critical"|"neutral"}\n'
            "  ],\n"
            '  "actions": ["Specific actionable recommendation 1", "Specific actionable recommendation 2"]\n'
            "}\n"
            "Do not include markdown code block formatting (`json) in your text if possible, just the raw JSON."
        )

        prompt = (
            f"Role: {role}\n"
            f"Metrics Payload:\n{json.dumps(metrics, indent=2)}\n\n"
            f"Generate a concise, high-signal operational insight for this user."
        )

        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1000,
                "responseMimeType": "application/json"
            }
        }

        try:
            url = f"{cls.API_URL}?key={api_key}"
            res = requests.post(url, json=payload, timeout=10)
            if res.status_code == 200:
                data = res.json()
                text_content = data['candidates'][0]['content']['parts'][0]['text']
                cleaned = text_content.strip()
                if cleaned.startswith("`json"):
                    cleaned = cleaned[7:]
                if cleaned.startswith("`"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("`"):
                    cleaned = cleaned[:-3]
                parsed = json.loads(cleaned.strip())
                if "summary" in parsed and "trends" in parsed and "actions" in parsed:
                    return parsed
            else:
                logger.warning(f"Gemini API returned status {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"Gemini API invocation error: {str(e)}")

        return FallbackInsightsBuilder.build(role, metrics)


def get_scope_key(user, role: str) -> str:
    """Generates a stable scope key for cache resolution."""
    normalized_role = role.lower()
    if normalized_role == "farmer":
        return f"farmer_{user.id}"
    elif normalized_role == "barangay":
        return f"barangay_{user.barangay_id or 'none'}"
    elif normalized_role == "agri":
        return "municipal_agri"
    elif normalized_role == "opv":
        return "provincial_opv"
    elif normalized_role == "inspector":
        return f"inspector_{user.id}"
    return f"user_{user.id}"


def get_or_generate_insight(user, role: str, force_refresh: bool = False) -> CachedInsight:
    """
    Main entry point: Resolves cached insight or calculates fresh aggregates
    and generates a new insight via Gemini / Fallback engine.
    """
    role_map = {
        "farmer": "Farmer",
        "barangay": "Barangay",
        "agri": "Agri",
        "opv": "OPV",
        "inspector": "Inspector",
    }
    normalized_role = role_map.get(role.lower(), "Farmer")
    scope_key = get_scope_key(user, normalized_role)

    # 1. Check valid cache
    if not force_refresh:
        cached = CachedInsight.objects.filter(
            role=normalized_role,
            scope_key=scope_key,
            expires_at__gt=timezone.now()
        ).first()
        if cached:
            return cached

    # 2. Extract metrics
    if normalized_role == "Agri":
        metrics = RoleMetricExtractor.extract_agri_metrics()
    elif normalized_role == "Farmer":
        metrics = RoleMetricExtractor.extract_farmer_metrics(user)
    elif normalized_role == "Barangay":
        metrics = RoleMetricExtractor.extract_barangay_metrics(user)
    elif normalized_role == "OPV":
        metrics = RoleMetricExtractor.extract_opv_metrics()
    elif normalized_role == "Inspector":
        metrics = RoleMetricExtractor.extract_inspector_metrics(user)
    else:
        metrics = RoleMetricExtractor.extract_farmer_metrics(user)

    # 3. Generate insight via Gemini or Fallback
    insight_data = GeminiInsightsClient.generate_insight(normalized_role, metrics)

    # 4. Save to cache with 3-hour expiration
    expires_at = timezone.now() + timedelta(hours=3)
    cached_obj, created = CachedInsight.objects.update_or_create(
        role=normalized_role,
        scope_key=scope_key,
        defaults={
            "user": user,
            "summary": insight_data.get("summary", ""),
            "trends": insight_data.get("trends", []),
            "actions": insight_data.get("actions", []),
            "raw_metrics_snapshot": metrics,
            "expires_at": expires_at,
        }
    )
    return cached_obj
