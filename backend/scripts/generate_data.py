"""Export the same deterministic farmer histories used by the operations seeder."""
import argparse
import csv
import json
from pathlib import Path
from apps.maps.models import Barangay, HogSurvey
from apps.maps.survey_generation import generate_history, script_arguments
from apps.maps.survey_import import preview


def run(*args):
    parser = argparse.ArgumentParser()
    parser.add_argument("--as-of", default=None)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", default="datasets/naturalized_hog_survey.csv")
    parser.add_argument("--mode", choices=["preview", "apply"], default="preview")
    options = parser.parse_args(script_arguments(args))
    records, monthly = generate_history(list(Barangay.objects.all()), options.as_of, options.seed)
    print(json.dumps({**preview(records), "monthly_flows": monthly}, indent=2))
    if options.mode == "apply":
        fields = ["barangay", "survey_date", "farmer_name", "contact_number", *HogSurvey.PIG_FIELDS, "total_pigs"]
        output = Path(options.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open("w", newline="", encoding="utf-8") as target:
            writer = csv.DictWriter(target, fieldnames=fields)
            writer.writeheader()
            for survey in records:
                row = {f: getattr(survey, f) for f in fields}
                row["barangay"] = survey.barangay.name
                writer.writerow(row)
