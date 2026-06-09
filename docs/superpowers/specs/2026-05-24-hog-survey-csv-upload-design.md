# Spec: Hog Survey CSV Upload

**Date:** 2026-05-24
**Topic:** Hog Survey Data Management
**Status:** DRAFT

## 1. Purpose
Enable Agri officers to upload historical hog population data via CSV. This automates the ingestion of survey data for analytics and mapping, replacing manual database entries or running scripts.

## 2. Backend Implementation

### 2.1 Service: `HogSurveyService`
- **Location**: `backend/apps/maps/services.py` (New File)
- **Logic**:
    - **`import_csv(file_obj)`**:
        - Use `pandas` to read the CSV file.
        - Validate required columns: `barangay`, `survey_date`, `inahin`, `barako`, `fattener`, `grower`, `starter`, `bulaw`, `total_pigs`.
        - Clean data: strip whitespace from barangay names, convert dates (handle 'coerce' for errors).
        - Map barangay names to existing `Barangay` model instances (case-insensitive).
        - Use `transaction.atomic` for batch processing.
        - **Optimization**: Use `bulk_create` for better performance if record count is high.
        - **Reporting**: Collect skipped rows (e.g., missing barangay) and return a summary.

### 2.2 ViewSet Action: `upload_csv`
- **Location**: `backend/apps/maps/viewsets.py` in `HogSurveyViewSets`.
- **Method**: `POST`
- **URL**: `/api/hog-survey/upload-csv/`
- **RBAC**: Restricted to users with `role == 'Agri'`.
- **Validation**:
    - Ensure a file is provided in `request.FILES`.
    - Catch and return errors from the service layer (e.g., missing columns, invalid file format).

## 3. Data Format (CSV)
Expected headers (matching existing `naturalized_hog_survey.csv`):
`barangay,survey_date,inahin,barako,fattener,grower,starter,bulaw,total_pigs`

## 4. Verification Plan

### 4.1 Automated Tests
- **Backend**:
    - `test_agri_officer_can_upload_valid_csv`: Verify 201 response and records created.
    - `test_non_agri_cannot_upload_csv`: Verify 403 response for Farmer/Inspector/Opv.
    - `test_upload_csv_with_missing_columns`: Verify 400 response with descriptive error.
    - `test_upload_csv_with_invalid_barangay`: Verify summary reports skipped rows.

### 4.2 Manual Check
- Upload `backend/datasets/naturalized_hog_survey.csv` via the API and verify data appears in the list view.
- Verify `survey_date` is correctly parsed.
