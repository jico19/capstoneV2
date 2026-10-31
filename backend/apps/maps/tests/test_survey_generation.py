"""Survey history boundaries, reproducibility, and CSV import round trips."""
import csv
from datetime import date

import pytest
from django.db import connection

from apps.maps.models import Barangay, HogSurvey
from apps.maps.survey_generation import BASELINE_CAPACITY, POPULATION_TARGETS, generate_history, generate_surveys
from apps.maps.survey_import import import_surveys
from scripts import hog_survey


@pytest.fixture
def barangays():
    return [Barangay(pk=i, name=name) for i, name in enumerate(POPULATION_TARGETS, 1)]


def signature(records):
    return [(r.barangay_id, r.farmer_name, r.contact_number, r.survey_date,
             *(getattr(r, f) for f in HogSurvey.PIG_FIELDS), r.total_pigs) for r in records]


def test_quarter_boundaries(barangays):
    with pytest.raises(ValueError, match="March 31, 2020"):
        generate_surveys(barangays, "2020-03-30")
    assert {r.survey_date for r in generate_surveys(barangays, "2020-03-31")} == {date(2020, 3, 31)}
    assert {r.survey_date for r in generate_surveys(barangays, "2020-06-29")} == {date(2020, 3, 31)}
    assert {r.survey_date for r in generate_surveys(barangays, "2020-06-30")} == {
        date(2020, 3, 31), date(2020, 6, 30)}


def test_reproducible_history_independent_of_order_and_horizon(barangays):
    early, flows = generate_history(barangays, "2021-12-31")
    assert flows[0]["opening_stock"] == BASELINE_CAPACITY
    assert signature(early) == signature(generate_surveys(reversed(barangays), "2021-12-31"))
    later, later_flows = generate_history(barangays, "2026-10-27")
    assert signature(early) == signature([r for r in later if r.survey_date <= date(2021, 12, 31)])
    assert flows == later_flows[:len(flows)]
    assert max(r.survey_date for r in later) == date(2026, 9, 30)
    assert signature(early) != signature(generate_surveys(barangays, "2021-12-31", seed=43))
    assert len({r.barangay_id for r in early}) == 43
    assert all(r.total_pigs == sum(getattr(r, f) for f in HogSurvey.PIG_FIELDS) for r in later)
    for flow in later_flows:
        assert flow["closing_stock"] == (flow["opening_stock"] + flow["births"] + flow["purchases"]
                                          - flow["sales"] - flow["deaths"])
        month = date.fromisoformat(flow["month"])
        if month.month % 3 == 0:
            assert flow["closing_stock"] == sum(r.total_pigs for r in later if r.survey_date == month)
    assert sum(f["disrupted_farms"] for f in later_flows) > 0


def test_requires_exactly_all_barangays(barangays):
    for invalid in (barangays[:-1], barangays + [barangays[0]]):
        with pytest.raises(ValueError, match="43"):
            generate_surveys(invalid, "2020-03-31")


@pytest.mark.django_db
def test_generated_csv_import_round_trip_and_default_previews(tmp_path, monkeypatch, capsys):
    assert connection.vendor == "postgresql"
    Barangay.objects.bulk_create([Barangay(name=name) for name in POPULATION_TARGETS])
    monkeypatch.chdir(tmp_path)
    output = tmp_path / "datasets" / "naturalized_hog_survey.csv"
    def reject_writes(execute, sql, params, many, context):
        assert sql.strip().split()[0].upper() not in {"INSERT", "UPDATE", "DELETE", "TRUNCATE"}
        return execute(sql, params, many, context)

    expected = generate_surveys(list(Barangay.objects.all()), "2020-03-31")
    output.parent.mkdir(parents=True)
    fields = ["barangay", "survey_date", "farmer_name", "contact_number",
              *HogSurvey.PIG_FIELDS, "total_pigs"]
    with output.open("w", newline="", encoding="utf-8") as target:
        writer = csv.DictWriter(target, fieldnames=fields)
        writer.writeheader()
        for record in expected:
            writer.writerow({"barangay": record.barangay.name,
                             **{field: getattr(record, field) for field in fields[1:]}})
    assert not HogSurvey.objects.exists()
    original = output.read_bytes()
    with connection.execute_wrapper(reject_writes):
        hog_survey.run()
    preview = capsys.readouterr().out
    assert "Survey import preview (no data changed)" in preview
    assert "Validation: Passed" in preview and not HogSurvey.objects.exists()
    assert output.read_bytes() == original
    from scripts import seed_realistic_operations
    with connection.execute_wrapper(reject_writes):
        seed_realistic_operations.run("mode=preview", "as-of=2020-03-31")
    seed_preview = capsys.readouterr().out
    assert "Operations seed preview (no data changed)" in seed_preview
    assert "Validation: Passed" in seed_preview and "{" not in seed_preview
    assert not HogSurvey.objects.exists()
    with output.open("rb") as source:
        applied = import_surveys(source, mode="apply")
    expected = generate_surveys(list(Barangay.objects.all()), "2020-03-31")
    assert applied["imported"] == len(expected) == HogSurvey.objects.count()
    key = lambda r: (r.barangay_id, r.farmer_name, r.survey_date)
    assert signature(sorted(expected, key=key)) == signature(sorted(HogSurvey.objects.all(), key=key))
    with output.open("rb") as source:
        import_surveys(source, mode="apply")
    assert HogSurvey.objects.count() == len(expected)
