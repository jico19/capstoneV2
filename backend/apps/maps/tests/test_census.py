import csv
import io
from datetime import date, timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.utils import timezone
from rest_framework.test import APIClient

from apps.dashboard.insights_engine import RoleMetricExtractor
from apps.dashboard.models import CachedInsight
from apps.dashboard.services import get_agri_dashboard_data
from apps.maps.census import classify, current_census
from apps.maps.models import Barangay, HogSurvey
from apps.maps.services import HogSurveyService
from apps.maps.survey_generation import POPULATION_TARGETS, generate_surveys
from apps.maps.survey_import import apply_records, import_surveys, preview


def csv_file(rows):
    out = io.StringIO()
    fields = ["barangay", "survey_date", "farmer_name", "contact_number", *HogSurvey.PIG_FIELDS, "total_pigs"]
    writer = csv.DictWriter(out, fieldnames=fields)
    writer.writeheader()
    for row in rows:
        writer.writerow({**dict.fromkeys(HogSurvey.PIG_FIELDS, 0),
                         "barangay": "Bucal", "survey_date": "2026-06-14",
                         "farmer_name": "Elena Santos", "contact_number": "09170000001",
                         "fattener": 12, "total_pigs": 12, **row})
    return io.BytesIO(out.getvalue().encode())


def observation(barangay, name, when, count):
    return HogSurvey.objects.create(barangay=barangay, farmer_name=name, survey_date=when,
                                    fattener=count, total_pigs=count)


def profile_snapshot(records):
    fields = ["barangay_id", "survey_date", "farmer_name", "contact_number", *HogSurvey.PIG_FIELDS, "total_pigs"]
    return [tuple(getattr(r, field) for field in fields) for r in records]


def test_generator_reproducible_stable_and_bounded():
    barangays = [Barangay(pk=i, name=name) for i, name in enumerate(POPULATION_TARGETS, 1)]
    first = generate_surveys(barangays, "2026-10-27")
    assert profile_snapshot(first) == profile_snapshot(generate_surveys(reversed(barangays), "2026-10-27"))
    assert profile_snapshot(first) != profile_snapshot(generate_surveys(barangays, "2026-10-27", 7))
    assert min(r.survey_date for r in first) == date(2020, 3, 31)
    assert max(r.survey_date for r in first) == date(2026, 9, 30)
    profiles = {}
    for r in first:
        assert r.total_pigs == sum(getattr(r, f) for f in HogSurvey.PIG_FIELDS)
        assert all(getattr(r, f) >= 0 for f in HogSurvey.PIG_FIELDS)
        key = (r.barangay_id, r.farmer_name)
        assert profiles.setdefault(key, r.contact_number) == r.contact_number
    assert any(r.fattener > 0 and r.inahin == r.barako == 0 for r in first)
    early = generate_surveys(barangays, "2024-01-01")
    assert profile_snapshot(early) == profile_snapshot([r for r in first if r.survey_date < date(2024, 1, 1)])
    # Simulated losses can change density classes; zero-capacity barangays stay empty.
    from apps.maps.census import census_rows
    for i, r in enumerate(first):
        r.pk = i + 1
    rows = census_rows(first, (2026, 3), barangays)
    assert all(r["density_level"] == "None" and r["total_pigs"] == 0
               for r in rows if POPULATION_TARGETS[r["barangay"]] == 0)
    assert any(r["total_pigs"] > 0 for r in rows)
    assert max(r.survey_date for r in generate_surveys(barangays, "2026-09-30")) == date(2026, 9, 30)
    with pytest.raises(ValueError, match="43"):
        generate_surveys(barangays[:-1], "2026-10-27")


@pytest.mark.parametrize("count,level", [(None, "No data"), (0, "None"), (1, "Low"),
    (99, "Low"), (100, "Medium"), (499, "Medium"), (500, "High"), (1499, "High"), (1500, "Very High")])
def test_classification_boundaries(count, level):
    assert classify(count) == level


@pytest.mark.django_db
def test_latest_raiser_observations_match_all_surfaces(django_capture_on_commit_callbacks):
    assert connection.vendor == "postgresql"
    b = Barangay.objects.create(name="Bucal")
    missing = Barangay.objects.create(name="Missing")
    zero = Barangay.objects.create(name="Zero")
    observation(b, "Elena Santos", "2025-06-01", 1000)
    observation(b, "Elena Santos", "2026-03-31", 50)
    observation(b, "Elena Santos", "2026-04-01", 10)
    observation(b, "  ELENA   SANTOS ", "2026-06-12", 12)
    observation(b, "Pedro Ramos", "2026-06-02", 8)
    observation(zero, "Zero Raiser", "2026-06-15", 0)
    observation(missing, "Older Raiser", "2026-03-31", 99)
    rows = {r["barangay"]: r for r in current_census()}
    assert rows["Bucal"]["total_pigs"] == 20
    assert rows["Bucal"]["raiser_count"] == 2
    assert rows["Missing"]["total_pigs"] is None
    assert rows["Zero"]["total_pigs"] == 0
    assert rows["Bucal"]["coverage"] == {"observed_barangays": 2, "total_barangays": 3}
    cache.clear()
    assert get_agri_dashboard_data()["kpis"]["total_pigs_registered"] == 20
    user = get_user_model().objects.create_user(username="official", role="Barangay", barangay=b)
    metrics = RoleMetricExtractor.extract_barangay_metrics(user)
    assert metrics["current_metrics"]["total_registered_pigs"] == 20
    assert metrics["census_breakdown"]["fattener"] == 20
    client = APIClient()
    client.force_authenticate(user)
    assert client.get("/hog-survey/survey_data/").data[0]["total_pigs"] == 20
    history = client.get("/hog-survey/census_history/").data
    assert [r["total_pigs"] for r in history] == [1000, 50, 20]
    assert all(r["barangay"] == b.name for r in history)
    roster = client.get("/hog-survey/farmer_roster/").data
    assert len(roster) == 2
    assert max(r["survey_count"] for r in roster) == 4
    export = client.get("/hog-survey/export_csv/").content.decode()
    assert len(list(csv.DictReader(io.StringIO(export)))) == 5
    # A successful import refreshes both cached dashboard and persisted insights.
    insight = CachedInsight.objects.create(role="Agri", scope_key="municipal_agri", summary="old",
                                           expires_at=timezone.now() + timedelta(hours=1))
    with django_capture_on_commit_callbacks(execute=True):
        import_surveys(csv_file([{"fattener": 20, "total_pigs": 20}]))
    insight.refresh_from_db()
    assert insight.is_expired()
    assert get_agri_dashboard_data()["kpis"]["total_pigs_registered"] == 28


@pytest.mark.django_db
def test_common_quarter_comparison_and_filter_validation():
    b = Barangay.objects.create(name="Bucal")
    for when, count in [("2025-06-30", 10), ("2025-12-31", 40), ("2026-06-30", 20), ("2026-09-30", 30)]:
        observation(b, "Elena", when, count)
    target = HogSurveyService.get_aggregated_survey_data(target_year=2026, compare_year=2025)[0]
    base = HogSurveyService.get_aggregated_survey_data(target_year=2025, compare_year=2026)[0]
    assert target["quarter"] == base["quarter"] == 2
    assert (target["total_pigs"], base["total_pigs"]) == (20, 10)
    assert HogSurveyService.get_aggregated_survey_data(target_year=2026)[0]["total_pigs"] == 30
    assert HogSurveyService.get_aggregated_survey_data(target_year=2026, compare_year=2024)[0]["total_pigs"] is None
    from rest_framework.exceptions import ValidationError
    with pytest.raises(ValidationError):
        HogSurveyService.get_aggregated_survey_data(target_month=13)


@pytest.mark.django_db
@pytest.mark.parametrize("bad", [
    {"survey_date": "2026-02-30"}, {"barangay": "Unknown"}, {"fattener": -1},
    {"fattener": "1.5"}, {"fattener": "NaN"}, {"total_pigs": 999},
])
def test_invalid_replacement_is_atomic(bad):
    b = Barangay.objects.create(name="Bucal")
    old = observation(b, "Existing", "2025-12-31", 100)
    report = import_surveys(csv_file([{"farmer_name": "Valid farmer"}, bad]), mode="preview", replace=True)
    assert not report["valid"]
    with pytest.raises(ValueError):
        import_surveys(csv_file([{"farmer_name": "Valid farmer"}, bad]), replace=True)
    assert list(HogSurvey.objects.values_list("pk", flat=True)) == [old.pk]


@pytest.mark.django_db
def test_import_preview_identity_and_replacement_rollback():
    Barangay.objects.create(name="Bucal")
    source = csv_file([{}])
    report = import_surveys(source, mode="preview")
    assert report["record_count"] == 1 and report["current_population_total"] == 12
    assert HogSurvey.objects.count() == 0
    import_surveys(source)
    old_pk = HogSurvey.objects.get().pk
    import_surveys(csv_file([{"farmer_name": " ELENA   SANTOS ", "fattener": 15, "total_pigs": 15}]))
    survey = HogSurvey.objects.get()
    assert survey.pk == old_pk and survey.total_pigs == 15
    assert survey.contact_number == "09170000001"
    assert survey.survey_date == date(2026, 6, 14)
    assert survey.inahin == survey.barako == 0
    with patch.object(HogSurvey.objects.__class__, "bulk_create", side_effect=RuntimeError("write failed")):
        with pytest.raises(RuntimeError, match="write failed"):
            import_surveys(source, replace=True)
    assert HogSurvey.objects.get().pk == old_pk
    import_surveys(source, replace=True)
    assert HogSurvey.objects.count() == 1 and HogSurvey.objects.get().total_pigs == 12


@pytest.mark.django_db
def test_generated_seeding_is_idempotent():
    barangays = [Barangay.objects.create(name=name) for name in POPULATION_TARGETS]
    records = generate_surveys(barangays, "2022-07-01")
    preview(records)
    apply_records(records)
    expected = profile_snapshot(list(HogSurvey.objects.order_by("pk")))
    apply_records(generate_surveys(barangays, "2022-07-01"))
    assert profile_snapshot(list(HogSurvey.objects.order_by("pk"))) == expected


@pytest.mark.django_db
def test_generated_census_across_api_surfaces_and_csv():
    from scripts.seed_realistic_operations import run as operations_seed
    barangays = [Barangay.objects.create(name=name) for name in POPULATION_TARGETS]
    records = generate_surveys(barangays, "2022-07-01")
    apply_records(records)
    expected_count = HogSurvey.objects.count()
    operations_seed("mode=preview", "as-of=2022-07-01")  # Explicit preview leaves all data intact.
    assert HogSurvey.objects.count() == expected_count
    assert not get_user_model().objects.exists()
    client = APIClient()
    user = get_user_model().objects.create_user(username="agri", role="Agri")
    client.force_authenticate(user)
    rows = client.get("/hog-survey/survey_data/").data
    expected_total = sum(r["total_pigs"] for r in rows)
    cache.clear()
    dashboard = client.get("/dashboard/agri-metrics/").data
    assert dashboard["kpis"]["total_pigs_registered"] == expected_total
    assert dashboard["census"]["date"] == "2022-06-30"
    assert dashboard["census"]["coverage"]["observed_barangays"] == 43
    history = client.get("/hog-survey/census_history/").data
    assert sum(r["total_pigs"] for r in history if r["census_date"] == "2022-06-30") == expected_total
    roster = client.get("/hog-survey/farmer_roster/").data
    assert len(roster) == 43 * 8
    export = client.get("/hog-survey/export_csv/").content.decode()
    exported = list(csv.DictReader(io.StringIO(export)))
    assert len(exported) == expected_count
    assert sum(int(row["Total"]) for row in exported if row["Date"] == "2022-06-30") == expected_total


@pytest.mark.django_db
def test_preview_api_and_barangay_import_restrictions():
    from django.core.files.uploadedfile import SimpleUploadedFile
    b = Barangay.objects.create(name="Bucal")
    other = Barangay.objects.create(name="Other")
    client = APIClient()
    user = get_user_model().objects.create_user(username="staff", role="Barangay", barangay=b)
    client.force_authenticate(user)
    def upload(rows, **options):
        source = SimpleUploadedFile("survey.csv", csv_file(rows).getvalue(), content_type="text/csv")
        return client.post("/hog-survey/upload_csv/", {"file": source, **options}, format="multipart")
    report = upload([{}], mode="preview")
    assert report.status_code == 200 and report.data["valid"]
    assert HogSurvey.objects.count() == 0
    assert upload([{}, {"barangay": other.name, "farmer_name": "Other"}]).status_code == 400
    assert HogSurvey.objects.count() == 0
    assert upload([{}]).status_code == 201
    assert upload([{}], replace="true").status_code == 403
    assert HogSurvey.objects.count() == 1


@pytest.mark.django_db
def test_aggregation_roles_and_missing_barangay():
    b = Barangay.objects.create(name="Bucal")
    older = Barangay.objects.create(name="Older")
    observation(b, "Current", "2026-06-30", 5)
    observation(older, "Previous", "2026-03-31", 50)
    client = APIClient()
    for role in ["Farmer", "Inspector", "Opv", "Barangay"]:
        user = get_user_model().objects.create_user(username=role, role=role)
        client.force_authenticate(user)
        for path in ["survey_data", "census_history", "years", "farmer_roster"]:
            assert client.get(f"/hog-survey/{path}/").status_code == 403
    user = get_user_model().objects.create_user(username="scoped", role="Barangay", barangay=older)
    client.force_authenticate(user)
    rows = client.get("/hog-survey/survey_data/").data
    assert len(rows) == 1 and rows[0]["total_pigs"] is None
    assert rows[0]["quarter"] == 2
    assert rows[0]["coverage"] == {"observed_barangays": 0, "total_barangays": 1}
    assert client.get(f"/hog-survey/census_history/?barangay={b.pk}").data[-1]["barangay"] == older.name
