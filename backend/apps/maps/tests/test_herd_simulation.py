"""Herd lifecycle, seasonality, disruption, and stock conservation."""
import copy
import random
from dataclasses import replace

import pytest

from apps.maps.herd_simulation import DEFAULT_CONFIG, Farm, Pig, capacity_factor


def controlled_farm(breeding=True, config=DEFAULT_CONFIG):
    farm = Farm(100, breeding, random.Random(123), config)
    farm.mortality = 0
    farm.young_survival = 1
    farm.fertility = 1
    farm.sale_rate = 0
    farm.events = {}
    farm.next_purchase = 10000
    return farm


def test_cohorts_age_without_changing_headcount():
    farm = controlled_farm(False)
    farm.pigs = [Pig(0), Pig(1), Pig(2), Pig(3), Pig(4)]
    flow = farm.step(0)
    assert farm.counts() == dict(inahin=0, barako=0, fattener=2, grower=2, bulaw=0, starter=1)
    assert flow["opening_stock"] == flow["closing_stock"] == 5
    assert flow["births"] == flow["purchases"] == flow["deaths"] == flow["sales"] == 0


def test_pregnancy_and_recovery_delays():
    farm = controlled_farm()
    sow = Pig(18, "inahin")
    farm.pigs = [sow]
    assert farm.step(0)["births"] == 0
    assert sow.due == 4
    for month in (1, 2, 3):
        assert farm.step(month)["births"] == 0
    assert 8 <= farm.step(4)["births"] <= 12
    assert sow.due is None and sow.ready == 6
    farm.step(5)
    assert sow.due is None
    farm.step(6)
    assert sow.due == 10
    assert all(p.age <= 2 for p in farm.pigs if p.kind == "market")


def test_replacement_females_enter_breeding_after_maturing():
    farm = controlled_farm()
    female = Pig(3, female=True)
    farm.pigs = [female]
    assert farm.step(0)["births"] == 0
    assert female.kind == "bulaw"
    for month in (1, 2, 3):
        farm.step(month)
        assert female.kind == "bulaw" and female.due is None
    farm.step(4)
    assert female.kind == "inahin" and female.due == 8
    for month in (5, 6, 7):
        assert farm.step(month)["births"] == 0
    assert farm.step(8)["births"] >= 8


def test_finishing_farms_purchase_without_births_or_breeders():
    farm = Farm(100, False, random.Random(8))
    farm.initialize()
    flows = [farm.step(month) for month in range(36)]
    assert sum(f["purchases"] for f in flows) > 0
    assert sum(f["births"] for f in flows) == 0
    assert not any(p.kind in ("inahin", "bulaw", "barako") for p in farm.pigs)


def test_holiday_demand_sells_more_of_the_same_eligible_animals():
    holiday = controlled_farm(False)
    holiday.pigs = [Pig(8) for _ in range(2000)] + [Pig(0) for _ in range(200)]
    holiday.sale_rate = 0.4
    holiday.participation = 1
    ordinary = copy.deepcopy(holiday)
    ordinary.config = replace(DEFAULT_CONFIG, sales_multipliers=(1,) * 12)
    high, low = holiday.step(11), ordinary.step(11)
    assert 0 < low["sales"] < high["sales"] <= high["eligible_finishers"] == 2000
    assert high["closing_stock"] < low["closing_stock"]
    assert holiday.counts()["starter"] == ordinary.counts()["starter"] == 200
    assert high["births"] == low["births"] == high["purchases"] == low["purchases"] == 0


def test_young_purchases_cannot_be_sold_immediately():
    farm = controlled_farm(False)
    farm.next_purchase = 0
    farm.sale_rate = 1
    farm.market_age = 4
    first = farm.step(0)
    assert first["purchases"] > 0 and first["sales"] == 0
    farm.next_purchase = 10000
    assert farm.step(1)["sales"] == 0
    assert farm.step(2)["sales"] > 0


def test_disruption_pauses_restocking_and_breeding_recovery_takes_time():
    farm = controlled_farm()
    farm.pigs = [Pig(18, "inahin"), Pig(5)]
    farm.events = {0: (1, 3)}
    farm.purchase_delay = 2
    assert farm.step(0)["deaths"] == 2
    for month in range(1, 5):
        flow = farm.step(month)
        assert flow["closing_stock"] == flow["births"] == flow["purchases"] == 0
    flow = farm.step(5)
    assert flow["purchases"] > 0 and flow["births"] == 0
    assert farm.counts()["bulaw"] > 0 and farm.counts()["inahin"] == 0
    assert all(farm.step(month)["births"] == 0 for month in range(6, 12))


def test_farms_have_staggered_schedules_and_persistent_variation():
    farms = [Farm(100, True, random.Random(i)) for i in range(20)]
    for farm in farms:
        farm.initialize()
    assert len({f.market_age for f in farms}) == 3
    assert len({round(f.fertility, 3) for f in farms}) > 10
    assert any(f.counts()["inahin"] and not f.counts()["barako"] for f in farms)
    assert any(f.counts()["barako"] for f in farms)
    assert len({p.due for f in farms for p in f.pigs if p.kind == "inahin"}) > 3
    assert len({next(iter(f.events), None) for f in farms}) > 3


def test_monthly_conservation_over_disruptions_and_recovery():
    farm = Farm(500, True, random.Random(42))
    farm.initialize()
    previous = len(farm.pigs)
    for month in range(81):
        flow = farm.step(month)
        assert flow["opening_stock"] == previous
        previous += flow["births"] + flow["purchases"] - flow["sales"] - flow["deaths"]
        assert previous == flow["closing_stock"] == sum(farm.counts().values())
        assert flow["sales"] <= flow["eligible_finishers"]
        assert all(isinstance(n, int) and n >= 0 for n in farm.counts().values())


def test_historical_capacity_anchors_and_interpolation():
    for month, value in DEFAULT_CONFIG.capacity_anchors:
        assert capacity_factor(month) == pytest.approx(value)
    assert capacity_factor(17) == pytest.approx(0.44)
    assert capacity_factor(100) == 0.60


def test_lower_capacity_reduces_breeding_without_removing_existing_sows():
    config = replace(DEFAULT_CONFIG, capacity_anchors=((0, 0.5),), sales_multipliers=(1,) * 12)
    farm = controlled_farm(config=config)
    farm.pigs = [Pig(18, "inahin") for _ in range(10)]
    flow = farm.step(0)
    assert flow["opening_stock"] == flow["closing_stock"] == 10
    assert sum(p.due == 4 for p in farm.pigs) == round(50 * farm.sow_share)


def test_starter_survival_applies_over_two_months():
    farm = controlled_farm(False)
    farm.young_survival = 0.94
    farm.pigs = [Pig(0) for _ in range(20000)]
    farm.step(0)
    farm.step(1)
    assert len(farm.pigs) / 20000 == pytest.approx(0.94, abs=0.01)
    assert farm.counts()["grower"] == len(farm.pigs)


def test_anticipation_uses_breeding_and_growth_lead_time():
    # March conception targets December after four gestation and five growth months.
    farm = controlled_farm()
    farm.market_age = 5
    farm.fertility = 0.8
    farm.participation = 1
    farm.pigs = [Pig(18, "inahin") for _ in range(5)]
    ordinary = copy.deepcopy(farm)
    ordinary.config = replace(DEFAULT_CONFIG, sales_multipliers=(1,) * 12)
    # Compare many identical initial states so the probability difference is clear.
    seasonal_count = ordinary_count = 0
    for seed in range(100):
        high, low = copy.deepcopy(farm), copy.deepcopy(ordinary)
        high.rng = random.Random(seed)
        low.rng = random.Random(seed)
        assert high.step(2)["births"] == low.step(2)["births"] == 0
        seasonal_count += sum(p.due == 6 for p in high.pigs)
        ordinary_count += sum(p.due == 6 for p in low.pigs)
    assert seasonal_count > ordinary_count
