from apps.maps.models import Barangay, HogSurvey
import pandas as pd
from django.db import transaction
import datetime


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

    # Clear existing survey records to avoid duplication
    print("Clearing old Hog Survey records...")
    HogSurvey.objects.all().delete()

    # Name mapping for CSV names to DB names
    alias_map = {
        "mamala 1": "mamala i",
        "mamala 2": "mamala ii",
        "santo cristo": "sampaloc santo cristo",
        "talaan pantoc": "talaanpantoc",
    }

    records_to_create = []
    skipped_count = 0

    for index, row in hog_survey.iterrows():
        raw_name = str(row['barangay']).strip()
        lookup_name = alias_map.get(raw_name.lower(), raw_name.lower())
        
        # Handle castanas special characters
        if "casta" in lookup_name:
            matched_key = None
            for key in barangay_map:
                if "casta" in key:
                    matched_key = key
                    break
            if matched_key:
                lookup_name = matched_key

        barangay = barangay_map.get(lookup_name)

        if not barangay:
            # print(f"Row {index + 2}: Barangay '{row['barangay']}' not found — skipping.")
            skipped_count += 1
            continue

        # 1. Align dates to standard calendar quarters (March 31, June 30, September 30, December 31)
        raw_date = pd.to_datetime(row['survey_date'], errors='coerce')
        if pd.notnull(raw_date):
            quarter = (raw_date.month - 1) // 3 + 1
            if quarter == 1:
                survey_date = datetime.date(raw_date.year, 3, 31)
            elif quarter == 2:
                survey_date = datetime.date(raw_date.year, 6, 30)
            elif quarter == 3:
                survey_date = datetime.date(raw_date.year, 9, 30)
            else:
                survey_date = datetime.date(raw_date.year, 12, 31)
        else:
            survey_date = None
            quarter = None

        # 2. Scale up numbers for realistic backyard volumes
        scale_factor = 1
        inahin = int(row.get('inahin') or 0) * scale_factor
        barako = int(row.get('barako') or 0) * scale_factor
        fattener = int(row.get('fattener') or 0) * scale_factor
        grower = int(row.get('grower') or 0) * scale_factor
        starter = int(row.get('starter') or 0) * scale_factor
        bulaw = int(row.get('bulaw') or 0) * scale_factor

        # Apply seasonal trend patterns to simulate biological cycles
        if quarter == 1:  # March 31
            starter = int(starter * 1.0)
            grower = int(grower * 0.95)
            fattener = int(fattener * 1.0)
        elif quarter == 2:  # June 30
            starter = int(starter * 1.30)
            grower = int(grower * 1.10)
            inahin = int(inahin * 0.90)
        elif quarter == 3:  # September 30
            starter = int(starter * 0.85)
            grower = int(grower * 1.25)
            fattener = int(fattener * 1.20)
        elif quarter == 4:  # December 31
            starter = int(starter * 0.80)
            grower = int(grower * 0.90)
            inahin = int(inahin * 1.15)
            barako = int(barako * 1.10)

        # 3. Enforce biological consistency: If growers/starters/fatteners exist, there must be breeding stock
        total_production = fattener + grower + starter + bulaw
        if total_production > 0 and inahin == 0:
            inahin = max(1, int(total_production * 0.15))
        
        if inahin > 0:
            barako = max(barako, max(1, int(inahin * 0.08)))


        # 4. Correctly sum the parts to avoid mathematical artifacts
        total = inahin + barako + fattener + grower + starter + bulaw

        records_to_create.append(HogSurvey(
            barangay=barangay,
            survey_date=survey_date,
            inahin=inahin,
            barako=barako,
            fattener=fattener,
            grower=grower,
            starter=starter,
            bulaw=bulaw,
            total_pigs=total,
        ))

    if records_to_create:
        with transaction.atomic():
            HogSurvey.objects.bulk_create(records_to_create)

    print(f"\nDone! Created: {len(records_to_create)} | Skipped: {skipped_count}")