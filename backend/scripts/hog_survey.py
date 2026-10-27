"""Import supplied counts exactly. Preview is the default."""
import argparse
import json
from apps.maps.survey_import import import_surveys
from apps.maps.survey_generation import script_arguments


def run(*args):
    parser = argparse.ArgumentParser()
    parser.add_argument("file", nargs="?", default="datasets/naturalized_hog_survey.csv")
    parser.add_argument("--mode", choices=["preview", "apply"], default="preview")
    parser.add_argument("--replace", action="store_true")
    options = parser.parse_args(script_arguments(args))
    with open(options.file, "rb") as source:
        report = import_surveys(source, mode=options.mode, replace=options.replace)
    print(json.dumps(report, indent=2))
