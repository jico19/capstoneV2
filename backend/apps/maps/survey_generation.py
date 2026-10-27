"""Reproducible fictional survey histories, never verified municipal statistics."""
import random
from datetime import date, datetime
from zoneinfo import ZoneInfo

from .census import normalize, quarter_end
from .models import HogSurvey
from .herd_simulation import DEFAULT_CONFIG, Farm, month_end


# Explicit generation assumptions, not measured rankings. Keys use canonical names.
BASELINE_CAPACITY = 22_000
POPULATION_TARGETS = {
    "antipolo": 310, "balubal": 240,
    "barangay 1": 55, "barangay 2": 40, "barangay 3": 65,
    "barangay 4": 0, "barangay 5": 0, "barangay 6": 0,
    "bignay 1": 850, "bignay 2": 720, "bucal": 350, "canda": 290,
    "castanas": 75, "concepcion banahaw": 920, "concepcion no. 1": 280,
    "concepcion palasan": 330, "concepcion pinagbakuran": 800,
    "gibanga": 260, "guisguis-san roque": 1000, "guisguis-talon": 900,
    "janagdong 1": 760, "janagdong 2": 300, "limbon": 220,
    "lutucan 1": 2100, "lutucan bata": 1100, "lutucan malabag": 1900,
    "mamala i": 320, "mamala ii": 270, "manggalang 1": 950,
    "manggalang tulo-tulo": 360, "manggalang-bantilan": 870,
    "manggalang-kiling": 340, "montecillo": 230, "morong": 250,
    "pili": 210, "sampaloc 1": 380, "sampaloc 2": 310, "sampaloc bogon": 290,
    "sampaloc santo cristo": 260, "talaan aplaya": 60, "talaanpantoc": 70,
    "tumbaga 1": 80, "tumbaga 2": 50,
}
ALIASES = {"mamala 1": "mamala i", "mamala 2": "mamala ii",
           "santo cristo": "sampaloc santo cristo", "talaan pantoc": "talaanpantoc"}


def barangay_key(name):
    key = normalize(name)
    return ALIASES.get(key, key)


def reference_date(value=None):
    if value is None:
        return datetime.now(ZoneInfo("Asia/Manila")).date()
    return date.fromisoformat(value) if isinstance(value, str) else value


def allocate(total, weights):
    raw = [total * w / sum(weights) for w in weights]
    counts = [int(n) for n in raw]
    for idx in sorted(range(len(raw)), key=lambda i: raw[i] - counts[i], reverse=True)[:total - sum(counts)]:
        counts[idx] += 1
    return counts


def generate_history(barangays, as_of=None, seed=42, config=DEFAULT_CONFIG):
    """Return unsaved quarterly surveys and aggregate monthly flow reports.

    Each farm has its own random stream, independent of input order and horizon.
    Reports stop at the last saved quarter so every closing stock is reviewable.
    """
    as_of = reference_date(as_of)
    barangays = sorted(barangays, key=lambda b: barangay_key(b.name))
    keys = [barangay_key(b.name) for b in barangays]
    if len(keys) != 43 or set(keys) != set(POPULATION_TARGETS):
        raise ValueError("Generation requires all 43 Sariaya barangays with recognized names.")
    dates = [quarter_end(year, q) for year in range(2020, as_of.year + 1)
             for q in range(1, 5) if quarter_end(year, q) <= as_of]
    if not dates:
        raise ValueError("Reference date must be on or after March 31, 2020.")
    last_month = (dates[-1].year - 2020) * 12 + dates[-1].month - 1
    reports = [{"month": month_end(m).isoformat(), **dict.fromkeys(
        ("opening_stock", "births", "purchases", "sales", "deaths", "closing_stock",
         "eligible_finishers", "capacity", "paused_farms", "disrupted_farms"), 0)}
        for m in range(last_month + 1)]
    records = []
    capacities = allocate(BASELINE_CAPACITY, [POPULATION_TARGETS[key] for key in keys])
    first_names = ["Lucio", "Elena", "Nestor", "Marites", "Pedro", "Lourdes", "Renato", "Analyn"]
    surnames = ["Valdez", "Santos", "Ramos", "Perez", "Torres", "Aquino", "Custodio", "Alcala"]
    for bg_index, barangay in enumerate(barangays):
        key = barangay_key(barangay.name)
        herds = allocate(capacities[bg_index], [0.9, 1.6, 2.8, 4.2, 1.3, 2.0, 0.7, 1.1])
        for i, herd in enumerate(herds):
            farm = Farm(herd, i % 3 != 0, random.Random(f"{seed}:{key}:{i}"), config)
            farm.initialize()
            for month, report in enumerate(reports):
                flow = farm.step(month)
                for field in ("opening_stock", "births", "purchases", "sales", "deaths",
                              "closing_stock", "eligible_finishers", "capacity"):
                    report[field] += flow[field]
                report["paused_farms"] += int(flow["paused"] and herd > 0)
                report["disrupted_farms"] += int(flow["disruption_deaths_expected_rate"] > 0 and herd > 0)
                if month % 3 != 2:
                    continue
                values = farm.counts()
                records.append(HogSurvey(
                    barangay=barangay, survey_date=month_end(month),
                    farmer_name=f"{first_names[i]} {surnames[(bg_index + i) % 8]} {bg_index + 1:02d}",
                    contact_number=f"09{bg_index + 1:04d}{i + 1:05d}",
                    total_pigs=sum(values.values()), **values,
                ))
    return records, reports


def generate_surveys(barangays, as_of=None, seed=42):
    """Preserve the public generator contract, returning unsaved survey rows."""
    return generate_history(barangays, as_of, seed)[0]


def script_arguments(args):
    """django_extensions consumes dashed options unless passed using = syntax.

    Accept convenient runscript tokens such as mode=apply and as-of=2026-10-27.
    """
    return ["--replace" if arg == "replace" else "--" + arg
            if arg.split("=", 1)[0] in {"mode", "as-of", "seed", "output"}
            else arg for arg in args]
