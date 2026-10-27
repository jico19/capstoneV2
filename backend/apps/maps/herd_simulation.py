"""Monthly fictional farm histories. All rates are modeling assumptions.

Month zero is January 2020. Animals exist before that month; newborns enter at
the end of a month. No transition changes headcount except the reported flows.
"""
import calendar
import random
from dataclasses import dataclass, field
from datetime import date


@dataclass(frozen=True)
class SimulationConfig:
    litter_range: tuple = (8, 12)
    young_survival_range: tuple = (0.90, 0.98)
    gestation_months: int = 4
    recovery_months: int = 2
    replacement_age: int = 8
    # January through December. These affect eligible sales, never animal counts.
    sales_multipliers: tuple = (0.90, 1, 1, 1, 1.15, 1, 1, 1, 1.10, 1, 1.10, 1.35)
    capacity_anchors: tuple = (
        (2, 1.00), (11, 0.50), (23, 0.38), (35, 0.45), (47, 0.63),
        (53, 0.70), (59, 0.49), (71, 0.55), (80, 0.60),
    )
    # First/last month, affected farm probability, loss range, pause range.
    disruptions: tuple = ((3, 11, 0.80, (0.35, 0.75), (3, 9)),
                          (54, 59, 0.65, (0.25, 0.60), (3, 8)))

    def __post_init__(self):
        if not (1 <= self.litter_range[0] <= self.litter_range[1]):
            raise ValueError("Litter sizes must be positive and ordered.")
        if not (0 < self.young_survival_range[0] <= self.young_survival_range[1] <= 1):
            raise ValueError("Young survival must be between zero and one.")
        if self.gestation_months < 1 or self.recovery_months < 1 or self.replacement_age < 4:
            raise ValueError("Breeding and recovery delays must be positive; replacement age at least four.")
        if len(self.sales_multipliers) != 12 or any(v < 0 for v in self.sales_multipliers):
            raise ValueError("Supply twelve nonnegative monthly sales multipliers.")
        if not self.capacity_anchors or any(v < 0 for _, v in self.capacity_anchors):
            raise ValueError("Supply nonnegative capacity anchors.")
        if any(a[0] >= b[0] for a, b in zip(self.capacity_anchors, self.capacity_anchors[1:])):
            raise ValueError("Capacity anchor months must increase.")
        for start, end, probability, losses, pauses in self.disruptions:
            if not (start <= end and 0 <= probability <= 1 and
                    0 <= losses[0] <= losses[1] <= 1 and 1 <= pauses[0] <= pauses[1]):
                raise ValueError("Invalid disruption window, probability, losses, or pause.")


DEFAULT_CONFIG = SimulationConfig()


def month_end(month):
    year, offset = divmod(month, 12)
    return date(2020 + year, offset + 1, calendar.monthrange(2020 + year, offset + 1)[1])


def capacity_factor(month, config=DEFAULT_CONFIG):
    anchors = config.capacity_anchors
    if month <= anchors[0][0]:
        return anchors[0][1]
    for (left, low), (right, high) in zip(anchors, anchors[1:]):
        if month <= right:
            return low + (high - low) * (month - left) / (right - left)
    return anchors[-1][1]


@dataclass
class Pig:
    age: int
    kind: str = "market"
    due: int | None = None
    ready: int = 0
    female: bool = False

    @property
    def category(self):
        if self.kind != "market":
            return self.kind
        return "starter" if self.age < 2 else "grower" if self.age < 4 else "fattener"


@dataclass
class Farm:
    capacity: int
    breeding: bool
    rng: random.Random
    config: SimulationConfig = DEFAULT_CONFIG
    pigs: list = field(default_factory=list)
    paused_until: int = 0
    next_purchase: int = 0

    def __post_init__(self):
        rng = self.rng
        self.fertility = rng.uniform(0.72, 0.94)
        self.young_survival = rng.uniform(*self.config.young_survival_range)
        self.mortality = rng.uniform(0.001, 0.005)
        self.market_age = rng.choice((4, 5, 6))
        self.sale_rate = rng.uniform(0.28, 0.52)
        self.participation = rng.uniform(0.4, 1.2)
        self.sow_share = rng.uniform(0.055, 0.085)
        self.purchase_delay = rng.randint(1, 3)
        self.next_purchase = rng.randrange(self.purchase_delay)
        self.ai = rng.random() < 0.65
        self.events = {}
        for start, end, probability, losses, pauses in self.config.disruptions:
            if rng.random() < probability:
                self.events[rng.randint(start, end)] = (rng.uniform(*losses), rng.randint(*pauses))

    def initialize(self):
        """Established herd on December 31, 2019, including pregnancies."""
        sows = max(1, round(self.capacity * self.sow_share)) if self.breeding and self.capacity else 0
        boars = int(sows >= 2 and not self.ai)
        for _ in range(sows):
            # Some sows conceived before January; others are recovering.
            stage = self.rng.randrange(self.config.gestation_months + self.config.recovery_months)
            self.pigs.append(Pig(18, "inahin", due=stage if stage < self.config.gestation_months else None,
                                 ready=stage - self.config.gestation_months))
        self.pigs.extend(Pig(18, "barako") for _ in range(boars))
        self.pigs.extend(Pig(self.rng.randrange(7), female=self.rng.random() < 0.5)
                         for _ in range(max(0, self.capacity - sows - boars)))

    def counts(self):
        counts = dict.fromkeys(("inahin", "barako", "fattener", "grower", "bulaw", "starter"), 0)
        for pig in self.pigs:
            counts[pig.category] += 1
        return counts

    def step(self, month):
        rng, config = self.rng, self.config
        opening = len(self.pigs)
        births = purchases = sales = deaths = eligible = breeding_sows = 0
        loss, pause = self.events.get(month, (0, 0))
        if pause:
            self.paused_until = month + pause
            self.next_purchase = self.paused_until + self.purchase_delay
        capacity = round(self.capacity * capacity_factor(month, config))
        sow_target = max(1, round(capacity * self.sow_share)) if capacity and self.breeding else 0
        replacements = sum(p.kind in ("inahin", "bulaw") for p in self.pigs)
        survivors, newborns = [], []
        demand = config.sales_multipliers[month % 12]
        # Farm participation and modest monthly variation persist around its own rate.
        sale_probability = max(0, min(1, self.sale_rate * (1 + (demand - 1) * self.participation)
                                     * rng.uniform(0.96, 1.04)))
        for pig in self.pigs:
            # Two starter months together have the configured survival probability.
            mortality = 1 - self.young_survival ** 0.5 if pig.kind == "market" and pig.age < 2 else self.mortality
            if rng.random() < 1 - (1 - mortality) * (1 - loss):
                deaths += 1
                replacements -= int(pig.kind in ("inahin", "bulaw"))
                continue
            pig.age += 1
            if (self.breeding and pig.kind == "market" and pig.female and pig.age == 4
                    and replacements < sow_target and month >= self.paused_until):
                pig.kind = "bulaw"
                replacements += 1
            if pig.kind == "bulaw" and pig.age >= config.replacement_age:
                pig.kind, pig.ready = "inahin", month
            if pig.kind == "inahin":
                breeding_sows += 1
                if pig.due is not None and month >= pig.due:
                    litter = rng.randint(*config.litter_range)
                    newborns.extend(Pig(0, female=rng.random() < 0.5) for _ in range(litter))
                    births += litter
                    pig.due, pig.ready = None, month + config.recovery_months
                # Look ahead through gestation and growth, never pull births forward.
                future_demand = config.sales_multipliers[(month + config.gestation_months + self.market_age) % 12]
                conception = min(1, self.fertility * (1 + (future_demand - 1) * self.participation))
                if (pig.due is None and month >= max(pig.ready, self.paused_until)
                        and breeding_sows <= sow_target and len(self.pigs) < capacity * 1.1
                        and rng.random() < conception):
                    pig.due = month + config.gestation_months
            if pig.kind == "market" and pig.age >= self.market_age:
                eligible += 1
                if rng.random() < sale_probability:
                    sales += 1
                    continue
            survivors.append(pig)
        self.pigs = survivors + newborns
        if self.capacity and month >= max(self.next_purchase, self.paused_until):
            # Two month old purchases need further growth before they can be sold.
            future_demand = config.sales_multipliers[(month + self.market_age - 2) % 12]
            anticipated = capacity * (1 + (future_demand - 1) * self.participation * 0.25)
            vacancy = max(0, round(anticipated) - len(self.pigs))
            purchases = min(vacancy, round(capacity * rng.uniform(0.15, 0.30)))
            self.pigs.extend(Pig(2, female=rng.random() < 0.5) for _ in range(purchases))
            # Some purchases are five month old replacement gilts instead of growers.
            # Breeding recovery starts with replacements, never instant sows.
            if self.breeding and replacements < sow_target and purchases:
                for pig in self.pigs[-min(purchases, sow_target - replacements):]:
                    pig.kind, pig.age, pig.female = "bulaw", 5, True
            self.next_purchase = month + self.purchase_delay
        closing = len(self.pigs)
        if closing != opening + births + purchases - sales - deaths:
            raise AssertionError("Monthly herd conservation failed.")
        return {"month": month_end(month).isoformat(), "opening_stock": opening,
                "births": births, "purchases": purchases, "sales": sales, "deaths": deaths,
                "closing_stock": closing, "eligible_finishers": eligible,
                "capacity": capacity, "paused": month < self.paused_until,
                "disruption_deaths_expected_rate": loss}
