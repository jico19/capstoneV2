"""Survey history boundaries and reproducibility."""
from datetime import date

import pytest

from apps.maps.models import Barangay, HogSurvey
from apps.maps.survey_generation import BASELINE_CAPACITY, POPULATION_TARGETS, generate_history, generate_surveys


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
