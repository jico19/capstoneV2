# Hog Survey CSV Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Agri officers to upload hog survey data via CSV files directly to the database.

**Architecture:** Create a `HogSurveyService` to handle CSV parsing and validation, and add an `upload_csv` action to the `HogSurveyViewSets`.

**Tech Stack:** Django, DRF, pandas (for CSV handling), pytest.

---

### Task 1: Create HogSurveyService

**Files:**
- Create: `backend/apps/maps/services.py`

- [ ] **Step 1: Write the service class with CSV import logic**

```python
import pandas as pd
from django.db import transaction
from .models import Barangay, HogSurvey
from datetime import datetime

class HogSurveyService:
    @staticmethod
    def import_csv(file_obj):
        df = pd.read_csv(file_obj)
        required_columns = [
            'barangay', 'survey_date', 'inahin', 'barako', 
            'fattener', 'grower', 'starter', 'bulaw', 'total_pigs'
        ]
        
        # Check columns
        if not all(col in df.columns for col in required_columns):
            missing = [col for col in required_columns if col not in df.columns]
            raise ValueError(f"Missing columns: {', '.join(missing)}")

        records_created = 0
        errors = []

        with transaction.atomic():
            for index, row in df.iterrows():
                try:
                    barangay_name = str(row['barangay']).strip()
                    barangay = Barangay.objects.filter(name__iexact=barangay_name).first()
                    
                    if not barangay:
                        errors.append(f"Row {index + 2}: Barangay '{barangay_name}' not found.")
                        continue

                    # Parse date
                    try:
                        survey_date = pd.to_datetime(row['survey_date']).date()
                    except:
                        errors.append(f"Row {index + 2}: Invalid date '{row['survey_date']}'.")
                        continue

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
```

- [ ] **Step 2: Commit service**

```bash
git add backend/apps/maps/services.py
git commit -m "feat(maps): add HogSurveyService for CSV import"
```

---

### Task 2: Add upload_csv action to HogSurveyViewSets

**Files:**
- Modify: `backend/apps/maps/viewsets.py`

- [ ] **Step 1: Add upload_csv action**

```python
# backend/apps/maps/viewsets.py

from .services import HogSurveyService

# Inside HogSurveyViewSets class:

    @action(detail=False, methods=['post'])
    def upload_csv(self, request):
        """
        API Endpoint: POST /api/hog-survey/upload_csv/
        Uploads a CSV file and imports hog survey data.
        """
        if request.user.role != 'Agri':
            return Response({"error": "Unauthorized"}, status=403)

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=400)

        if not file_obj.name.endswith('.csv'):
            return Response({"error": "File is not a CSV"}, status=400)

        try:
            created_count, errors = HogSurveyService.import_csv(file_obj)
            return Response({
                "message": f"Successfully imported {created_count} records.",
                "errors": errors
            }, status=status.HTTP_201_CREATED if created_count > 0 else status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
```

- [ ] **Step 2: Commit viewset changes**

```bash
git add backend/apps/maps/viewsets.py
git commit -m "feat(maps): add upload_csv action to HogSurveyViewSets"
```

---

### Task 3: Write and Run Tests

**Files:**
- Create: `backend/apps/maps/tests/test_hog_survey_upload.py`

- [ ] **Step 1: Write tests for CSV upload**

```python
import pytest
from io import StringIO
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.maps.models import Barangay, HogSurvey
from rest_framework.test import APIClient

@pytest.mark.django_db
class TestHogSurveyUpload:
    def test_agri_officer_can_upload_valid_csv(self, agri_client):
        Barangay.objects.create(name="Sariaya Central")
        csv_content = (
            "barangay,survey_date,inahin,barako,fattener,grower,starter,bulaw,total_pigs\n"
            "Sariaya Central,2024-05-01,10,2,20,30,15,5,82"
        )
        file = SimpleUploadedFile("test.csv", csv_content.encode('utf-8'), content_type="text/csv")
        
        response = agri_client.post("/api/hog-survey/upload_csv/", {"file": file}, format='multipart')
        
        assert response.status_code == 201
        assert HogSurvey.objects.count() == 1
        assert HogSurvey.objects.first().total_pigs == 82

    def test_non_agri_cannot_upload_csv(self, farmer_client):
        file = SimpleUploadedFile("test.csv", b"content", content_type="text/csv")
        response = farmer_client.post("/api/hog-survey/upload_csv/", {"file": file}, format='multipart')
        assert response.status_code == 403

    def test_upload_missing_columns(self, agri_client):
        csv_content = "wrong,column\nval,val"
        file = SimpleUploadedFile("test.csv", csv_content.encode('utf-8'), content_type="text/csv")
        response = agri_client.post("/api/hog-survey/upload_csv/", {"file": file}, format='multipart')
        assert response.status_code == 400
        assert "Missing columns" in response.data["error"]
```

- [ ] **Step 2: Run tests**

Run: `pytest backend/apps/maps/tests/test_hog_survey_upload.py`
Expected: PASS

- [ ] **Step 3: Commit tests**

```bash
git add backend/apps/maps/tests/test_hog_survey_upload.py
git commit -m "test(maps): add tests for hog survey CSV upload"
```
