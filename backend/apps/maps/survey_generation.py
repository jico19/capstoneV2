"""Reproducible fictional survey histories, never verified municipal statistics."""
import math
import random
from datetime import date, datetime
from zoneinfo import ZoneInfo

from .census import normalize, quarter_end
from .models import HogSurvey


# Explicit generation assumptions, not measured rankings. Keys use canonical names.
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


def generate_surveys(barangays, as_of=None, seed=42):
    as_of = reference_date(as_of)
    barangays = sorted(barangays, key=lambda b: barangay_key(b.name))
    keys = [barangay_key(b.name) for b in barangays]
    if len(set(keys)) != 43 or set(keys) != set(POPULATION_TARGETS):
        raise ValueError("Generation requires all 43 Sariaya barangays with recognized names.")
    dates = [quarter_end(year, q) for year in range(2022, as_of.year + 1)
             for q in range(1, 5) if quarter_end(year, q) < as_of]
    if not dates:
        raise ValueError("Reference date must follow the first completed quarter of 2022.")
    records = []
    first_names = ["Lucio", "Elena", "Nestor", "Marites", "Pedro", "Lourdes", "Renato", "Analyn"]
    surnames = ["Valdez", "Santos", "Ramos", "Perez", "Torres", "Aquino", "Custodio", "Alcala"]
    for bg_index, barangay in enumerate(barangays):
        rng = random.Random(f"{seed}:{barangay_key(barangay.name)}")
        target = POPULATION_TARGETS[barangay_key(barangay.name)]
        weights = [0.9, 1.6, 2.8, 4.2, 1.3, 2.0, 0.7, 1.1]
        phase = rng.uniform(0, math.tau)
        direction = rng.choice([-1, 1])
        for t, survey_date in enumerate(dates):
            # Fixed start and stop dates are independent of the requested history length.
            active = [i for i in range(8) if not (i == 6 and t < 5) and not (i == 7 and t >= 11)]
            movement = 1 + direction * min(t, 40) * 0.003 + 0.04 * math.sin(t * 1.2 + phase)
            total = round(target * movement)
            herds = allocate(total, [weights[i] * (1 + (i % 3 - 1) * min(t, 40) * 0.005) for i in active])
            for i, herd in zip(active, herds):
                # Distinct mixed and fattening operations, including no breeding stock.
                mix = [0, 0, 6, 3, 1, 2] if i % 3 == 0 else [2 + i % 2, 0.3, 4, 3 + i % 3, 1, 2]
                values = dict(zip(HogSurvey.PIG_FIELDS, allocate(herd, mix)))
                records.append(HogSurvey(
                    barangay=barangay, survey_date=survey_date,
                    farmer_name=f"{first_names[i]} {surnames[(bg_index + i) % 8]} {bg_index + 1:02d}",
                    contact_number=f"09{bg_index + 1:04d}{i + 1:05d}",
                    total_pigs=sum(values.values()), **values,
                ))
    return records


def script_arguments(args):
    """django_extensions consumes dashed options unless passed using = syntax.

    Accept convenient runscript tokens such as mode=apply and as-of=2026-10-27.
    """
    return ["--replace" if arg == "replace" else "--" + arg
            if arg.split("=", 1)[0] in {"mode", "as-of", "seed", "output"}
            else arg for arg in args]
