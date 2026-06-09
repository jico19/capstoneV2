import pandas as pd
from django.db import transaction
from .models import Barangay, HogSurvey
from datetime import datetime

# Service class to handle business logic for Hog Surveys, including CSV imports.
class HogSurveyService:
    # Imports hog survey data from a CSV file object.
    # Returns a tuple: (number of records created, list of error messages).
    @staticmethod
    def import_csv(file_obj):
        df = pd.read_csv(file_obj)
        required_columns = [
            'barangay', 'survey_date', 'inahin', 'barako', 
            'fattener', 'grower', 'starter', 'bulaw', 'total_pigs'
        ]
        
        # Validate that all required columns are present in the CSV.
        if not all(col in df.columns for col in required_columns):
            missing = [col for col in required_columns if col not in df.columns]
            raise ValueError(f"Missing columns: {', '.join(missing)}")

        records_created = 0
        errors = []

        # Use an atomic transaction to ensure data integrity.
        with transaction.atomic():
            for index, row in df.iterrows():
                try:
                    barangay_name = str(row['barangay']).strip()
                    # Find barangay by name (case-insensitive).
                    barangay = Barangay.objects.filter(name__iexact=barangay_name).first()
                    
                    if not barangay:
                        errors.append(f"Row {index + 2}: Barangay '{barangay_name}' not found.")
                        continue

                    # Parse the survey date using pandas.
                    try:
                        survey_date = pd.to_datetime(row['survey_date']).date()
                    except (ValueError, TypeError):
                        errors.append(f"Row {index + 2}: Invalid date '{row['survey_date']}'.")
                        continue

                    # Create the HogSurvey record.
                    HogSurvey.objects.create(
                        barangay=barangay,
                        survey_date=survey_date,
                        inahin=int(row.get('inahin', 0)),
                        barako=int(row.get('barako', 0)),
                        fattener=int(row.get('fattener', 0)),
                        grower=int(row.get('grower', 0)),
                        starter=int(row.get('starter', 0)),
                        bulaw=int(row.get('bulaw', 0)),
                        total_pigs=int(row.get('total_pigs', 0))
                    )
                    records_created += 1
                except Exception as e:
                    errors.append(f"Row {index + 2}: {str(e)}")

        return records_created, errors
