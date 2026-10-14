# Priority 2 Security Patches — Completion Report

**Date**: 2026-10-14  
**Scope**: Applied and verified 8 high-integrity and authorization Priority 2 security patches.  
**Test Suite**: 51 passed, 0 failed across `apps/api/`, `apps/permits/`, and `apps/maps/`.

---

### Applied Patches & Evidence

| Patch | Area | Affected Files | Status | Details & Verification |
| :--- | :--- | :--- | :--- | :--- |
| **R-08** | Token Lifecycle | [`backend/config/settings/base.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/base.py#L181) | **APPLIED** | Added `"BLACKLIST_AFTER_ROTATION": True` under `SIMPLE_JWT`. Old refresh tokens cannot be reused. |
| **R-09** | Session Revocation | [`backend/apps/api/views.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/views.py#L30)<br>[`backend/config/urls.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/urls.py#L18) | **APPLIED** | Added `LogoutView` at `POST /logout/`. Accepts `refresh` token, invalidates it via `token.blacklist()`. |
| **R-10** | Clickjacking / CSP | [`backend/config/middleware.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/middleware.py#L17) | **APPLIED** | Replaced blanket header stripping with explicit `Content-Security-Policy: frame-ancestors 'self' http://localhost:5173 http://127.0.0.1:5173 https://farmpass-ph.me https://farm-pass-smoky.vercel.app`. |
| **R-11** | Privilege Escalation | [`backend/apps/api/serializers.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/serializers.py#L101) | **APPLIED** | `UserWriteSerializer.validate()` ensures `Agri` role can only update/assign `Farmer` or `Barangay` roles, preventing elevation to `Admin` or `Opv`. Non-staff cannot edit `role`. |
| **R-12** | Race Conditions | [`backend/apps/permits/services/application.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/services/application.py#L162) | **APPLIED** | Added `select_for_update()` on `PermitApplication` in `approve_application()` atomic block, blocking concurrent double-approvals and duplicate AIC allocation. |
| **R-13** | Municipal Data Integrity | [`backend/apps/maps/viewsets.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/maps/viewsets.py#L21) | **APPLIED** | `BarangayViewSet` converted to `ReadOnlyModelViewSet`. `HogSurveyViewSet` mutation methods (`create`, `update`, `destroy`) enforce `user.role in ['Admin', 'Agri', 'Barangay']`. |
| **R-14** | Workflow Immutability | [`backend/apps/permits/views/application.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/views/application.py#L16) | **APPLIED** | `destroy()` raises `MethodNotAllowed`. `perform_update()` restricts Farmer modifications strictly to `DRAFT` and `RESUBMISSION` states. |
| **R-15** | Password Storage Integrity | [`backend/apps/api/serializers.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/serializers.py#L125) | **APPLIED** | `UserWriteSerializer` implements `update()` using `instance.set_password()` and triggers password validator inspection. |

---

### Verification Proof

1. **Django System Check**:
   ```
   .\venv\Scripts\python.exe manage.py check
   System check identified no issues (0 silenced).
   ```

2. **Full Priority 2 Regression Suite**:
   ```
   .\venv\Scripts\python.exe -m pytest apps/api/tests/ apps/permits/tests/test_workflow.py apps/maps/tests/ -q
   ...................................................                      [100%]
   51 passed in 179.82s (0:02:59)
   ```
