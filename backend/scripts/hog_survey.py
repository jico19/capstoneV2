"""Import supplied counts exactly. Preview is the default."""
import argparse
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
    title = "Survey import completed" if options.mode == "apply" else "Survey import preview (no data changed)"
    print(title)
    print(f"  Validation: {'Passed' if report['valid'] else 'Failed'}")
    print(f"  Survey records: {report['record_count']:,}")
    print(f"  Barangays: {len(report['classifications']):,}")
    print(f"  Survey dates: {report['date_from'] or 'None'} to {report['date_to'] or 'None'}")
    print(f"  Latest quarter population: {report['current_population_total']:,}")
    if 'imported' in report:
        print(f"  Records applied: {report['imported']:,}")
    for error in report['errors']:
        print(f"  Error: {error}")
