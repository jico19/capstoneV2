# Backend Dead Code, Unused Imports, and Duplicates Removal Specification

- **Target Directory**: `backend/` (Django 6.0 + DRF / Python 3.14)
- **Specification Status**: Ready for Review / Execution
- **Verification Commands**: 
  - `python manage.py check` (from `backend/` with venv activated)
  - Targeted pytest: `python -m pytest apps/permits/tests/test_workflow.py apps/dashboard/tests/ apps/payment/tests/`

---

## 1. Executive Summary

| Category | Count | Impact |
| :--- | :--- | :--- |
| **Dead Files & Legacy Generators** | 2 legacy PDF generators (254 LOC) + 1 dummy file | Legacy PDF code bypassed by `report_drafter.py`; empty admin file. |
| **Duplicate Imports** | 7 production duplicate import blocks (18 in tests) | Redundant re-imports in functions and module bodies. |
| **Unused Imports** | 65 production unused imports across 16 files | Module loading clutter, unused database functions (`Q`, `Avg`, `TruncDate`). |
| **Dead Variables & Unused Symbols** | 5 dead view imports & uncalled helpers | Unused service functions and misleading module-level dependencies. |

---

## 2. Catalog of Dead Code & Dead Functions

### A. Dead Legacy PDF Generators in `apps/documents/services/summary_reports.py`
These functions were superseded by the unified LGU Memorandum Report generator (`report_drafter.py` + `generate_formal_government_report_pdf`). They are never invoked anywhere in the project.

| Function Name | Location | Lines of Code | Impact & Removal Action |
| :--- | :--- | :--- | :--- |
| `generate_permit_issuance_report_pdf` | `apps/documents/services/summary_reports.py:281-390` | 110 lines | **Delete**. Superseded by `get_report_draft("permit_issuance")` and `generate_formal_government_report_pdf`. |
| `generate_barangay_distribution_pdf` | `apps/documents/services/summary_reports.py:391-534` | 144 lines | **Delete**. Superseded by `get_report_draft("barangay_distribution")` and `generate_formal_government_report_pdf`. |

### B. Obsolete Re-exports in `apps/documents/services/__init__.py`
- Line 18: `generate_barangay_distribution_pdf`
- Line 23: `generate_permit_issuance_report_pdf`
- **Impact**: Clean up `__all__` and imports in `__init__.py` to eliminate broken re-exports once dead functions are deleted.

### C. Empty / Dummy Files
| File Path | Description | Impact & Action |
| :--- | :--- | :--- |
| `backend/apps/documents/admin.py` | 2 lines (`from django.contrib import admin`). No models registered. | Clean up unused import or delete if empty admin file is unneeded. |

---

## 3. Catalog of Duplicate Imports

Imports declared multiple times within the same file (often once at the module level and again inside functions, or repeated inside loops):

| File Path | Symbol | Source Module | Line Numbers | Fix |
| :--- | :--- | :--- | :--- | :--- |
| `apps/payment/services.py` | `transaction` | `django.db` | Lines 11 and 22 | Remove redundant import on Line 22. |
| `apps/payment/viewsets.py` | `timezone` | `django.utils` | Lines 97 and 299 | Remove redundant inline import on Line 299. |
| `apps/permits/services/application.py` | `transaction` | `django.db` | Lines 1 and 87 | Remove redundant inline import on Line 87. |
| `apps/permits/services/permit.py` | `logging` | `logging` | Lines 1 and 332 | Remove redundant inline import on Line 332. |
| `apps/permits/services/permit.py` | `timezone` | `django.utils` | Lines 5 and 334 | Remove redundant inline import on Line 334. |
| `apps/permits/services/permit.py` | `transaction` | `django.db` | Lines 3 and 335 | Remove redundant inline import on Line 335. |
| `apps/permits/views/documents.py` | `ValidationError` | `rest_framework.exceptions` | Lines 78 and 90 | Remove redundant inline import on Line 90. |

*(Note: In tests `apps/permits/tests/test_workflow.py`, `handle_application_status_change` is repeatedly imported 6 times across test methods; consolidate to module level).*

---

## 4. Catalog of Production Unused Imports (65 Total)

### Group 1: Dashboard (`apps/dashboard/`)
1. `apps/dashboard/views.py`:
   - Lines 3–5: `from apps.permits import models as permits`, `from apps.maps import models as maps`, `from apps.inspector import models as inspector` (All unused).
   - Line 6: `from apps.payment.models import PaymentHistory` (Unused).
   - Lines 7–8: `from django.db.models import Count, Q, Avg, Sum`, `TruncDate, TruncMonth, ExtractHour` (All unused; views delegate to `services.py`).
   - Lines 9–10: `from django.utils import timezone`, `from datetime import timedelta` (Unused).
   - **Impact**: Removes 13 unused imports in a single file.
2. `apps/dashboard/insights_engine.py`:
   - Line 6: `Q`, `Avg` from `django.db.models` (Unused).
   - Line 7: `TruncMonth`, `TruncDate` from `django.db.models.functions` (Unused).
3. `apps/dashboard/services.py`:
   - Line 5: `Q`, `Avg` from `django.db.models` (Unused).

### Group 2: Documents Service (`apps/documents/`)
1. `apps/documents/services/permit_documents.py`:
   - Line 1: `import csv` (Unused).
   - Line 5: `StringIO` from `io` (Unused; only `BytesIO` is used).
   - Line 11: `Count`, `Sum` from `django.db.models` (Unused).
   - Line 19: `SimpleDocTemplate`, `Spacer`, `Image` from `reportlab.platypus` (Unused; uses `canvas` and `Table`).
   - Line 20: `getSampleStyleSheet` from `reportlab.lib.styles` (Unused).
   - Line 22: `OfficialMemorandumPDF` from `apps.documents.pdf_builder` (Unused).
   - Lines 33–35: `InspectorLogs`, `PaymentHistory`, `IssuedPermit`, `TransportOrigin`, `OCRValidationResult` (All unused).
2. `apps/documents/report_drafter.py`:
   - Line 6: `datetime` from `datetime` (Unused).
   - Line 9: `PermitApplication` from `apps.permits.models` (Unused).

### Group 3: Permits Service & Views (`apps/permits/`)
1. `apps/permits/views/reports.py`:
   - Lines 10, 12, 13: `generate_permit_issuance_report_pdf`, `generate_barangay_distribution_pdf`, `generate_inspector_report_pdf` (Unused; endpoints call `generate_formal_government_report_pdf`).
2. `apps/permits/services/permit.py`:
   - Line 9: `from apps.sms.services import send_sms` (Unused).
3. ViewSet module-level imports:
   - `apps/permits/views/application.py` Line 1: `viewsets` (Unused; inherits `APIView`).
   - `apps/permits/views/documents.py` Line 1: `viewsets` (Unused; inherits `APIView`).
   - `apps/permits/views/ocr.py` Line 1: `viewsets` (Unused; inherits `APIView`).
   - `apps/permits/views/opv.py` Line 1: `viewsets` (Unused; inherits `APIView`).

### Group 4: Inspector, Maps, OCR, Payment, SMS
1. `apps/inspector/services.py`: Line 1 `ValidationError`, Line 2 `timezone`, Line 3 `models` (All unused).
2. `apps/inspector/viewsets.py`: Line 1 `viewsets` (Unused).
3. `apps/maps/services.py`: Line 6 `ValidationError` (Unused).
4. `apps/maps/viewsets.py`: Line 1 `viewsets` (Unused).
5. `apps/ocr/services.py`: Line 4 `requests`, Line 9 `ValidationError`, `NotFound`, `APIException` (All unused).
6. `apps/ocr/tasks.py`: Line 2 `requests` (Unused).
7. `apps/payment/viewsets.py`: Line 1 `viewsets`, Line 4 `IsAuthenticated`, Line 96 `Count` (All unused).
8. `apps/sms/services.py`: Line 6 `models` (Unused).

### Group 5: Config & Root Settings (`config/`)
1. `config/urls.py`: Line 2 `static` from `django.conf.urls.static` (Unused).
2. `config/settings/base.py`: Line 5 `import dj_database_url` (Unused).
3. `config/settings/prod.py`: Line 2 `from pathlib import Path`, Line 3 `from dotenv import load_dotenv`, Line 5 `from datetime import timedelta` (All unused).

---

## 5. Implementation Phasing & Safety Verification

### Phase 1: Dead Functions Deletion (Estimated: 4 minutes)
1. Delete `generate_permit_issuance_report_pdf` and `generate_barangay_distribution_pdf` from `apps/documents/services/summary_reports.py`.
2. Remove their exports in `apps/documents/services/__init__.py`.
3. Remove their imports in `apps/permits/views/reports.py`.
- **Verification**: Run `python manage.py check` and `python -m pytest apps/permits/tests/test_reports.py`.

### Phase 2: Duplicate Imports Deduplication (Estimated: 3 minutes)
1. Remove redundant duplicate imports in:
   - `apps/payment/services.py` (`transaction`)
   - `apps/payment/viewsets.py` (`timezone`)
   - `apps/permits/services/application.py` (`transaction`)
   - `apps/permits/services/permit.py` (`logging`, `timezone`, `transaction`)
   - `apps/permits/views/documents.py` (`ValidationError`)
- **Verification**: Run `python manage.py check`.

### Phase 3: Unused Imports Cleanup (Estimated: 8 minutes)
1. Clean Group 1: `apps/dashboard/` views, insights_engine, services.
2. Clean Group 2: `apps/documents/` permit_documents, report_drafter.
3. Clean Group 3: `apps/permits/` services and views.
4. Clean Group 4: `apps/inspector/`, `apps/maps/`, `apps/ocr/`, `apps/payment/`, `apps/sms/`.
5. Clean Group 5: `config/urls.py` and `config/settings/`.
- **Verification**: Run `python manage.py check`.

### Phase 4: Targeted Test Suite Verification (Estimated: 3 minutes)
Run targeted tests across affected modules:
```powershell
backend\venv\Scripts\Activate.ps1
python -m pytest apps/permits/tests/test_workflow.py
python -m pytest apps/permits/tests/test_reports.py
python -m pytest apps/dashboard/tests/test_analytics.py
python -m pytest apps/payment/tests/test_payment_workflow.py
```

---

## 6. Rollback Plan
```powershell
git checkout HEAD -- backend/
```
