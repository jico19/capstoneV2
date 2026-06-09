from apps.maps.models import Barangay, HogSurvey
import pandas as pd
from django.db import transaction

def run(*args):
    # Determine file path: default or from args
    file_path = args[0] if args else './datasets/naturalized_hog_survey.csv'
    
    print(f"Importing data from: {file_path}")
    
    try:
        hog_survey = pd.read_csv(file_path)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    # Build a dict for fast lookup: { 'barangay name': <Barangay instance> }
    barangay_map = {b.name.strip().lower(): b for b in Barangay.objects.all()}

    records_to_create = []
    skipped_count = 0

    for index, row in hog_survey.iterrows():
        barangay_name = str(row['barangay']).strip().lower()
        barangay = barangay_map.get(barangay_name)

        if not barangay:
            # print(f"Row {index + 2}: Barangay '{row['barangay']}' not found — skipping.")
            skipped_count += 1
            continue

        records_to_create.append(HogSurvey(
            barangay=barangay,
            survey_date=pd.to_datetime(row['survey_date'], errors='coerce').date() if pd.notnull(row['survey_date']) else None,
            inahin=int(row.get('inahin') or 0),
            barako=int(row.get('barako') or 0),
            fattener=int(row.get('fattener') or 0),
            grower=int(row.get('grower') or 0),
            starter=int(row.get('starter') or 0),
            bulaw=int(row.get('bulaw') or 0),
            total_pigs=int(row.get('total_pigs') or 0),
        ))

    if records_to_create:
        with transaction.atomic():
            HogSurvey.objects.bulk_create(records_to_create)

    print(f"\nDone! Created: {len(records_to_create)} | Skipped: {skipped_count}")