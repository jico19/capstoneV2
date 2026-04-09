from apps.maps.models import Barangay, HogSurvey
import pandas as pd
from django.db import transaction

def run():
    hog_survey = pd.read_csv('./datasets/naturalized_hog_survey.csv')

    # Build a dict for fast lookup: { 'barangay name': <Barangay instance> }
    barangay_map = {b.name.strip().lower(): b for b in Barangay.objects.all()}

    created_count = 0
    skipped_count = 0

    with transaction.atomic():
        for index, row in hog_survey.iterrows():
            barangay_name = str(row['barangay']).strip().lower()

            barangay = barangay_map.get(barangay_name)

            if not barangay:
                print(f"Row {index + 2}: Barangay '{row['barangay']}' not found — skipping.")
                skipped_count += 1
                continue

            HogSurvey.objects.create(
                barangay=barangay,
                survey_date=pd.to_datetime(row['survey_date'], errors='coerce') or None,
                inahin=int(row.get('inahin') or 0),
                barako=int(row.get('barako') or 0),
                fattener=int(row.get('fattener') or 0),
                grower=int(row.get('grower') or 0),
                starter=int(row.get('starter') or 0),
                bulaw=int(row.get('bulaw') or 0),
                total_pigs=int(row.get('total_pigs') or 0),
            )
            created_count += 1

    print(f"\nDone! Created: {created_count} | Skipped: {skipped_count}")