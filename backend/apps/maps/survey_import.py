"""Validate complete inputs before an atomic, idempotent survey import."""
import csv
import io
from datetime import date
from decimal import Decimal, InvalidOperation

from django.db import transaction
from .census import census_rows, normalize, quarter_of
from .models import Barangay, HogSurvey
from .survey_generation import barangay_key


def invalidate_surveys():
    from django.utils import timezone
    from apps.dashboard.models import CachedInsight
    from apps.api.cache_utils import invalidate_cache_keys
    CachedInsight.objects.filter(role__in=["Agri", "Barangay"]).update(expires_at=timezone.now())
    transaction.on_commit(lambda: invalidate_cache_keys("dashboard:agri_metrics"))


def count_value(value):
    try:
        number = Decimal(str(value).strip())
        if not number.is_finite() or number < 0 or number != number.to_integral_value() or number > 2147483647:
            raise ValueError
        return int(number)
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError(f"Invalid count '{value}': expected a nonnegative whole number.") from None


def parse_csv(file_obj, barangay_restriction=None):
    file_obj.seek(0)
    content = file_obj.read()
    if isinstance(content, bytes):
        content = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content.lstrip("\ufeff")))
    aliases = {"date": "survey_date", "survey date": "survey_date", "date of survey": "survey_date",
               "total": "total_pigs", "total pigs": "total_pigs", "total pig": "total_pigs",
               "farmer name": "farmer_name", "owner name": "farmer_name", "farmer": "farmer_name",
               "contact number": "contact_number", "contact no": "contact_number",
               "cellphone number": "contact_number", "phone number": "contact_number"}
    headers = [aliases.get(normalize(h), normalize(h)) for h in (reader.fieldnames or [])]
    required = ["barangay", "survey_date", *HogSurvey.PIG_FIELDS, "total_pigs"]
    missing = [h for h in required if h not in headers]
    if missing:
        raise ValueError(f"Missing columns: {', '.join(missing)}")
    if len(set(headers)) != len(headers):
        raise ValueError("Duplicate CSV headers.")
    reader.fieldnames = headers
    barangays = {barangay_key(b.name): b for b in Barangay.objects.all()}
    records, errors, seen = [], [], set()
    for line, row in enumerate(reader, 2):
        try:
            if None in row or any(value is None for value in row.values()):
                raise ValueError("Incorrect number of columns.")
            barangay = barangays.get(barangay_key(row["barangay"]))
            if barangay is None:
                raise ValueError(f"Unknown barangay '{row['barangay']}'.")
            if barangay_restriction is not None and barangay.pk != barangay_restriction.pk:
                raise ValueError("Barangay is not your assigned barangay.")
            survey_date = date.fromisoformat(row["survey_date"].strip())
            name = row.get("farmer_name", "").strip()
            contact = row.get("contact_number", "").strip()
            if len(name) > 255 or len(contact) > 255:
                raise ValueError("Farmer name and contact must be at most 255 characters.")
            key = (barangay.pk, normalize(name), survey_date)
            if key in seen:
                raise ValueError("Duplicate farmer/date entry in this barangay.")
            seen.add(key)
            values = {f: count_value(row[f]) for f in HogSurvey.PIG_FIELDS}
            total = count_value(row["total_pigs"])
            if total != sum(values.values()):
                raise ValueError("Total does not equal the six categories.")
            records.append(HogSurvey(barangay=barangay, survey_date=survey_date,
                                     farmer_name=name, contact_number=contact, total_pigs=total, **values))
        except ValueError as exc:
            errors.append(f"Row {line}: {exc}")
    if not records and not errors:
        errors.append("CSV contains no survey records.")
    return records, errors


def preview(records, errors=()):
    dates = sorted({s.survey_date for s in records})
    barangays = list({s.barangay_id: s.barangay for s in records}.values())
    rows = census_rows(records, quarter_of(dates[-1]) if dates else None, barangays)
    return {"record_count": len(records), "date_from": str(dates[0]) if dates else None,
            "date_to": str(dates[-1]) if dates else None,
            "history_population_total": sum(s.total_pigs for s in records),
            "current_population_total": sum(r["total_pigs"] or 0 for r in rows),
            "classifications": {r["barangay"]: r["density_level"] for r in rows},
            "errors": list(errors), "valid": not errors}


def apply_records(records, replace=False, barangay_restriction=None):
    if not records:
        raise ValueError("No validated records to apply.")
    seen = set()
    valid_barangays = set(Barangay.objects.values_list("pk", flat=True))
    for record in records:
        record.clean_fields(exclude=["barangay"])
        if record.barangay_id not in valid_barangays:
            raise ValueError("Unknown barangay.")
        key = (record.barangay_id, normalize(record.farmer_name), record.survey_date)
        if key in seen or record.survey_date is None:
            raise ValueError("Duplicate farmer/date entry or missing date.")
        if barangay_restriction is not None and record.barangay_id != barangay_restriction.pk:
            raise ValueError("Barangay is not your assigned barangay.")
        if record.total_pigs != sum(getattr(record, f) for f in HogSurvey.PIG_FIELDS):
            raise ValueError("Total does not equal the six categories.")
        seen.add(key)
    with transaction.atomic():
        # Serialize imports without adding a constraint to encrypted farmer names.
        list(Barangay.objects.select_for_update().order_by("pk"))
        existing = HogSurvey.objects.all()
        if barangay_restriction is not None:
            existing = existing.filter(barangay=barangay_restriction)
        if replace:
            existing.delete()
            lookup = {}
        else:
            existing = existing.filter(barangay_id__in={r.barangay_id for r in records},
                                       survey_date__in={r.survey_date for r in records})
            lookup = {}
            for record in existing.order_by("pk"):
                key = (record.barangay_id, normalize(record.farmer_name), record.survey_date)
                if key in lookup:
                    raise ValueError("Existing duplicate farmer/date records need resolution before import.")
                lookup[key] = record.pk
        create, update = [], []
        for record in records:
            key = (record.barangay_id, normalize(record.farmer_name), record.survey_date)
            record.pk = lookup.get(key)
            (update if record.pk else create).append(record)
        HogSurvey.objects.bulk_create(create)
        HogSurvey.objects.bulk_update(update, ["farmer_name", "contact_number", *HogSurvey.PIG_FIELDS, "total_pigs"])
        invalidate_surveys()
    return len(create) + len(update)


def import_surveys(file_obj, barangay_restriction=None, mode="apply", replace=False):
    if mode not in ["preview", "apply"]:
        raise ValueError("Mode must be preview or apply.")
    try:
        records, errors = parse_csv(file_obj, barangay_restriction)
    except ValueError as exc:
        if mode != "preview":
            raise
        records, errors = [], [str(exc)]
    report = preview(records, errors)
    if mode == "preview":
        return report
    if errors:
        raise ValueError("\n".join(errors))
    report["imported"] = apply_records(records, replace, barangay_restriction)
    return report
