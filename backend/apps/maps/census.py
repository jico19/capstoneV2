"""Quarterly census rules shared by maps, dashboards and imports."""
import calendar
import unicodedata
from datetime import date

from .models import Barangay, HogSurvey


def normalize(value):
    value = unicodedata.normalize("NFKD", value or "")
    return " ".join("".join(c for c in value if not unicodedata.combining(c)).casefold().split())


def quarter_of(value):
    return value.year, (value.month - 1) // 3 + 1


def quarter_end(year, quarter):
    month = quarter * 3
    return date(year, month, calendar.monthrange(year, month)[1])


def classify(total):
    if total is None:
        return "No data"
    if total == 0:
        return "None"
    if total < 100:
        return "Low"
    if total < 500:
        return "Medium"
    if total < 1500:
        return "High"
    return "Very High"


def census_rows(observations, period, barangays):
    """Keep the last observation per normalized raiser identity in one quarter.

    Legacy unnamed rows cannot identify a raiser, so remain separate observations.
    Totals always come from categories, including for older inconsistent records.
    """
    barangays = list(barangays)
    allowed_ids = {b.pk for b in barangays}
    latest = {}
    for survey in observations:
        if survey.barangay_id not in allowed_ids or not survey.survey_date or quarter_of(survey.survey_date) != period:
            continue
        identity = normalize(survey.farmer_name) or ("unnamed", survey.pk if survey.pk is not None else id(survey))
        key = (survey.barangay_id, identity)
        old = latest.get(key)
        if old is None or (survey.survey_date, survey.pk or 0) > (old.survey_date, old.pk or 0):
            latest[key] = survey

    groups = {}
    for survey in latest.values():
        groups.setdefault(survey.barangay_id, []).append(survey)
    result = []
    for barangay in barangays:
        rows = groups.get(barangay.pk, [])
        breakdown = {field: sum(getattr(s, field) for s in rows) for field in HogSurvey.PIG_FIELDS}
        total = sum(breakdown.values()) if rows else None
        result.append({
            "barangay": barangay.name,
            "latitude": barangay.latitude,
            "longitude": barangay.longitude,
            "total_pigs": total,
            "density_level": classify(total),
            "breakdown": breakdown,
            "trend": "stable",
            "is_prediction": False,
            "census_date": quarter_end(*period).isoformat() if period else None,
            "survey_date": max(s.survey_date for s in rows).isoformat() if rows else None,
            "year": period[0] if period else None,
            "quarter": period[1] if period else None,
            "has_observations": bool(rows),
            "raiser_count": len(rows),
        })
    coverage = {"observed_barangays": len(groups), "total_barangays": len(result)}
    for row in result:
        row["coverage"] = coverage
    return result


def current_census(queryset=None, barangays=None):
    queryset = HogSurvey.objects.all() if queryset is None else queryset
    barangays = Barangay.objects.all() if barangays is None else barangays
    latest = queryset.filter(survey_date__isnull=False).order_by("-survey_date").values_list("survey_date", flat=True).first()
    period = quarter_of(latest) if latest else None
    observations = queryset.filter(survey_date__year=period[0], survey_date__quarter=period[1]) if period else []
    return census_rows(observations, period, barangays)


def census_history(queryset, barangays):
    observations = list(queryset.filter(survey_date__isnull=False).order_by("survey_date", "pk"))
    periods = sorted({quarter_of(s.survey_date) for s in observations})
    barangays = list(barangays)
    return [row for period in periods for row in census_rows(observations, period, barangays)]
