import csv
import io
from django.db import transaction
from .models import Barangay, HogSurvey
from datetime import datetime

# Service class to handle business logic for Hog Surveys, including CSV imports.
class HogSurveyService:
    # Imports hog survey data from a CSV file object.
    # Returns a tuple: (number of records created, list of error messages).
    @staticmethod
    def import_csv(file_obj):
        # Read the file content as text
        try:
            # Reset pointer first in case it was already read
            file_obj.seek(0)
            # Handle Django uploaded file which might be open in binary mode
            content = file_obj.read()
            if isinstance(content, bytes):
                content = content.decode('utf-8')
            file_obj.seek(0)  # Reset pointer just in case
        except Exception as e:
            raise ValueError(f"Failed to read file: {str(e)}")

        reader = csv.DictReader(io.StringIO(content))
        if not reader.fieldnames:
            raise ValueError("CSV file is empty or headers are missing")

        # Strip spaces from column names to avoid key mismatch
        reader.fieldnames = [name.strip() for name in reader.fieldnames]

        required_columns = [
            'barangay', 'survey_date', 'inahin', 'barako', 
            'fattener', 'grower', 'starter', 'bulaw', 'total_pigs'
        ]
        
        # Validate that all required columns are present in the CSV.
        if not all(col in reader.fieldnames for col in required_columns):
            missing = [col for col in required_columns if col not in reader.fieldnames]
            raise ValueError(f"Missing columns: {', '.join(missing)}")

        records_to_create = []
        records_to_update = []
        errors = []

        # Pre-fetch all barangays to avoid multiple queries.
        barangay_map = {b.name.lower(): b for b in Barangay.objects.all()}

        parsed_rows = []
        dates_in_csv = set()
        barangays_in_csv = set()

        # csv readers are 1-based, and headers are row 1.
        for index, row in enumerate(reader):
            row_num = index + 2
            try:
                barangay_name = str(row.get('barangay', '')).strip()
                barangay = barangay_map.get(barangay_name.lower())
                
                if not barangay:
                    errors.append(f"Row {row_num}: Barangay '{barangay_name}' not found.")
                    continue

                # Parse the survey date using standard datetime parsing.
                date_str = str(row.get('survey_date', '')).strip()
                try:
                    # Handle full ISO timestamps (like 2024-01-01 00:00:00) by splitting
                    clean_date_str = date_str.split(' ')[0]
                    survey_date = datetime.strptime(clean_date_str, "%Y-%m-%d").date()
                except (ValueError, TypeError):
                    errors.append(f"Row {row_num}: Invalid date '{date_str}'.")
                    continue

                # Helper to convert fields to integers safely, defaulting to 0
                def safe_int(val):
                    if val is None or str(val).strip() == '':
                        return 0
                    try:
                        return int(float(val))  # handle float strings like "5.0"
                    except ValueError:
                        return 0

                inahin = safe_int(row.get('inahin'))
                barako = safe_int(row.get('barako'))
                fattener = safe_int(row.get('fattener'))
                grower = safe_int(row.get('grower'))
                starter = safe_int(row.get('starter'))
                bulaw = safe_int(row.get('bulaw'))

                # Use total_pigs from CSV, or calculate if missing/zero/incorrect
                total_pigs = safe_int(row.get('total_pigs'))
                calculated_total = inahin + barako + fattener + grower + starter + bulaw
                if total_pigs == 0 or total_pigs != calculated_total:
                    total_pigs = calculated_total

                parsed_rows.append({
                    'barangay': barangay,
                    'survey_date': survey_date,
                    'inahin': inahin,
                    'barako': barako,
                    'fattener': fattener,
                    'grower': grower,
                    'starter': starter,
                    'bulaw': bulaw,
                    'total_pigs': total_pigs,
                })
                dates_in_csv.add(survey_date)
                barangays_in_csv.add(barangay)
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")

        # Fetch existing surveys matching the (barangay, date) criteria
        existing_surveys = HogSurvey.objects.filter(
            barangay__in=list(barangays_in_csv),
            survey_date__in=list(dates_in_csv)
        )
        existing_map = {(s.barangay_id, s.survey_date): s for s in existing_surveys}

        for row in parsed_rows:
            key = (row['barangay'].id, row['survey_date'])
            if key in existing_map:
                existing = existing_map[key]
                existing.inahin += row['inahin']
                existing.barako += row['barako']
                existing.fattener += row['fattener']
                existing.grower += row['grower']
                existing.starter += row['starter']
                existing.bulaw += row['bulaw']
                existing.total_pigs += row['total_pigs']
                
                if existing not in records_to_update:
                    records_to_update.append(existing)
            else:
                new_record = HogSurvey(
                    barangay=row['barangay'],
                    survey_date=row['survey_date'],
                    inahin=row['inahin'],
                    barako=row['barako'],
                    fattener=row['fattener'],
                    grower=row['grower'],
                    starter=row['starter'],
                    bulaw=row['bulaw'],
                    total_pigs=row['total_pigs']
                )
                records_to_create.append(new_record)
                existing_map[key] = new_record  # Prevent adding duplicate new records in same file

        # Save to database
        if records_to_create or records_to_update:
            with transaction.atomic():
                if records_to_update:
                    HogSurvey.objects.bulk_update(
                        records_to_update, 
                        fields=['inahin', 'barako', 'fattener', 'grower', 'starter', 'bulaw', 'total_pigs']
                    )
                if records_to_create:
                    HogSurvey.objects.bulk_create(records_to_create)

        return len(records_to_create) + len(records_to_update), errors
