# FarmPass Security Remediation Plan

**Date**: 2026-10-14 | Prioritized by exploitability and business impact.

---

## Priority 1 — Highest Impact Fixes

> [!NOTE]
> Payment auto-fulfill (previously R-01) is **by design** for this academic prototype. Documented in SECURITY_AUDIT.md as BD-01. No fix needed unless targeting real-world deployment.

### R-01: Make AuditTrail Read-Only
- **Finding**: C-02
- **File**: [`backend/apps/api/viewsets.py:366-381`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/viewsets.py#L366-L381)
- **Effort**: 5 min
- **Fix**: Change `BaseModelViewSet` to `viewsets.ReadOnlyModelViewSet`. Or add `http_method_names = ['get', 'head', 'options']`.
- **Regression Test**: Assert `POST/PUT/PATCH/DELETE /audit-trail/{id}/` all return 405 Method Not Allowed.

### R-02: Disable Generic CRUD on OPV, OCR, Inspector ViewSets
- **Finding**: C-03, C-04
- **Files**:
  - [`backend/apps/permits/views/opv.py:8`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/views/opv.py#L8)
  - [`backend/apps/permits/views/ocr.py:6`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/views/ocr.py#L6)
  - [`backend/apps/inspector/viewsets.py:9`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/inspector/viewsets.py#L9)
- **Effort**: 15 min
- **Fix**: Override `create`, `update`, `partial_update`, `destroy` to raise `MethodNotAllowed(request.method)`. For OCR, route `partial_update` through `override_ocr_result()`. Filter OCR queryset by user's applications.
- **Regression Test**: Assert `PATCH /opv/{id}/ {"status": "VALIDATED"}` returns 405. Assert `PATCH /ocr-validation/{id}/ {"status": "PASSED"}` returns 403 for non-Agri users.

### R-03: Set DEFAULT_PERMISSION_CLASSES
- **Finding**: C-06
- **File**: [`backend/config/settings/base.py:150`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/base.py#L150)
- **Effort**: 2 min
- **Fix**: Add `"DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"]` to `REST_FRAMEWORK`.
- **Regression Test**: Create a bare viewset with no `permission_classes`. Assert unauthenticated request returns 401.

### R-04: Protect Media File Serving
- **Finding**: C-05
- **File**: [`backend/config/urls.py:27-35`](file:///C:/Users/user/Documents/capstoneV2/backend/config/urls.py#L27-L35)
- **Effort**: 30 min
- **Fix**: Replace `django.views.static.serve` with an authenticated view that checks `request.user` ownership or role. In production, use signed Cloudinary URLs or serve via `X-Accel-Redirect` behind nginx.
- **Regression Test**: Assert unauthenticated `GET /media/submitted_docs/test.jpg` returns 401. Assert farmer A cannot access farmer B's documents.

### R-05: Add Production Security Headers
- **Finding**: H-09
- **File**: [`backend/config/settings/prod.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/prod.py)
- **Effort**: 10 min
- **Fix**:
  ```python
  SECURE_SSL_REDIRECT = True
  SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
  SECURE_HSTS_SECONDS = 31536000
  SECURE_HSTS_INCLUDE_SUBDOMAINS = True
  SECURE_HSTS_PRELOAD = True
  SESSION_COOKIE_SECURE = True
  CSRF_COOKIE_SECURE = True
  ```
- **Regression Test**: `python manage.py check --deploy --settings=config.settings.prod` returns 0 security warnings.

### R-06: Fix File Upload Validation
- **Finding**: C-07
- **File**: [`backend/apps/api/viewsets.py:114-138`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/viewsets.py#L114-L138)
- **Effort**: 15 min
- **Fix**: Route uploads through serializer with `full_clean()`, or explicitly call `doc.full_clean()` before `doc.save()`. Add content-type validation.
- **Regression Test**: Upload `.exe` file to `/user/{id}/documents/`. Assert rejected with validation error.

### R-07: Fix Permit Fee Override
- **Finding**: C-08
- **File**: [`backend/apps/permits/views/permit.py:58`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/views/permit.py#L58)
- **Effort**: 5 min
- **Fix**: Read `permit_fee` from `MunicipalConfig` model, not `request.data`. Ignore client-supplied value.
- **Regression Test**: Send `POST /issued-permit/ {"permit_fee": 0}`. Assert fee equals municipal config value.

---

## Priority 2 — High Severity (Fix Within 1 Week)

### R-09: Enable Token Blacklisting on Rotation
- **Finding**: H-01
- **File**: [`backend/config/settings/base.py:174`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/base.py#L174)
- **Effort**: 2 min
- **Fix**: Add `"BLACKLIST_AFTER_ROTATION": True` to `SIMPLE_JWT`.
- **Test**: After refresh, assert old refresh token returns 401.

### R-10: Add Logout Endpoint
- **Finding**: H-01
- **File**: [`backend/config/urls.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/urls.py)
- **Effort**: 15 min
- **Fix**: Create `LogoutView` that blacklists the refresh token. Register at `/logout/`.
- **Test**: After logout, assert refresh token returns 401.

### R-11: Fix AllowFramesMiddleware
- **Finding**: H-02
- **File**: [`backend/config/middleware.py:7-17`](file:///C:/Users/user/Documents/capstoneV2/backend/config/middleware.py#L7-L17)
- **Effort**: 10 min
- **Fix**: Instead of deleting `X-Frame-Options`, set `Content-Security-Policy: frame-ancestors 'self' https://farmpass-ph.me`.
- **Test**: Verify CSP header present on `/media/` responses.

### R-12: Fix Privilege Escalation on Update
- **Finding**: H-03
- **File**: [`backend/apps/api/serializers.py:100-106`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/serializers.py#L100-L106)
- **Effort**: 10 min
- **Fix**: Enforce role hierarchy on update: only `Admin` can set role to `Admin`. `Agri` limited to `Farmer`/`Barangay`.
- **Test**: Agri user PATCHes user with `role=Admin`. Assert 403 or role unchanged.

### R-13: Add select_for_update on Application Approval
- **Finding**: H-04
- **File**: [`backend/apps/permits/services/application.py:160`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/services/application.py#L160)
- **Effort**: 5 min
- **Fix**: Change `PermitApplication.objects.get(id=...)` to `PermitApplication.objects.select_for_update().get(id=...)`.
- **Test**: Concurrent approval requests. Assert only one succeeds.

### R-14: Protect Barangay and HogSurvey Write Operations
- **Finding**: H-05, H-06
- **File**: [`backend/apps/maps/viewsets.py:21-121`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/maps/viewsets.py#L21-L121)
- **Effort**: 15 min
- **Fix**: `BarangayViewSet` → `ReadOnlyModelViewSet`. `HogSurveyViewSet` → enforce `role in ['Agri', 'Barangay']` on all writes.
- **Test**: Farmer `POST /barangay/` returns 405. Farmer `POST /hog-survey/` returns 403.

### R-15: Guard Application Updates by Status
- **Finding**: H-07
- **File**: [`backend/apps/permits/views/application.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/views/application.py)
- **Effort**: 10 min
- **Fix**: Override `perform_update` to allow edits only when `status in [DRAFT, RESUBMISSION]`. Disable `destroy`.
- **Test**: PATCH application with status `FORWARDED_TO_OPV`. Assert 400.

### R-16: Fix Password Update to Use set_password
- **Finding**: CHECKLIST 1.3
- **File**: [`backend/apps/api/serializers.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/serializers.py)
- **Effort**: 10 min
- **Fix**: Override `update()` in `UserWriteSerializer`. Extract password, call `user.set_password()`, then save.
- **Test**: PATCH user with new password. Verify login works with new password. Verify DB field is hashed.

---

## Priority 3 — Medium Severity (Fix Within 2 Weeks)

### R-17: Secure OTP Generation and Verification
- **File**: [`backend/apps/api/utils.py:8`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/utils.py#L8), [`backend/apps/api/viewsets.py:284-327`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/viewsets.py#L284-L327)
- **Fix**: Replace `random.randint` with `secrets.randbelow(900000) + 100000`. Add 5-attempt lockout in cache. Add throttle class on `send_otp` (3/hour per phone).

### R-18: Fix Error Response Leakage
- **File**: [`backend/apps/payment/viewsets.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/payment/viewsets.py), [`backend/apps/inspector/viewsets.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/inspector/viewsets.py)
- **Fix**: Replace `{"error": str(e)}` with normalized error messages. Log `str(e)` server-side only.

### R-19: Set DATA_UPLOAD_MAX_NUMBER_FIELDS
- **File**: [`backend/config/settings/base.py:217`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/base.py#L217)
- **Fix**: Change `None` to `2000`.

### R-20: Remove Localhost from Production CORS
- **File**: [`backend/config/settings/prod.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/prod.py)
- **Fix**: Remove `http://localhost:5173`. Add `CORS_ALLOW_ALL_ORIGINS = False`.

### R-21: Guard Seed Script Against Production
- **File**: [`backend/scripts/seed_realistic_operations.py`](file:///C:/Users/user/Documents/capstoneV2/backend/scripts/seed_realistic_operations.py)
- **Fix**: Add `if not settings.DEBUG: raise RuntimeError("Seed script cannot run in production")` at entry.

### R-22: Escape User Strings in ReportLab
- **File**: [`backend/apps/documents/services/permit_documents.py:534-551`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/documents/services/permit_documents.py#L534-L551)
- **Fix**: Wrap all user strings with `html.escape()` before `Paragraph()`.

### R-23: Add Atomicity to Missing Services
- **Files**: `backend/apps/inspector/services.py`, `backend/apps/permits/services/ocr.py`, `backend/apps/permits/views/permit.py`
- **Fix**: Wrap each in `with transaction.atomic():`.

### R-24: Add Unique Constraint to OR Number
- **File**: [`backend/apps/payment/models.py:39`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/payment/models.py#L39)
- **Fix**: Add `unique=True` to `or_number` field. Create migration.

### R-25: Implement PayMongo Webhook
- **Files**: `backend/config/urls.py`, `backend/apps/payment/`
- **Fix**: Create webhook receiver. Verify `Paymongo-Signature` HMAC. Process payment confirmation server-side.

### R-26: Fix Inverted PayMongo Keys
- **File**: `backend/.env:12-13`
- **Fix**: Swap `PAYMONGO_LIVE_PUBLIC_KEY` and `PAYMONGO_LIVE_SECRET_KEY` values.

### R-27: Fix Login Throttle for Spraying
- **File**: [`backend/apps/api/views.py:5-25`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/views.py#L5-L25)
- **Fix**: Add secondary IP-only throttle (20/min regardless of username).

### R-28: Refresh JWT Claims from DB on Token Refresh
- **File**: [`backend/apps/api/serializers.py:156-168`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/serializers.py#L156-L168)
- **Fix**: Override `validate()` in `CustomTokenRefreshSerializer` to re-query user and inject fresh claims.

### R-29: Add Audit Logging for Municipal Config and Payment Verification
- **Files**: `backend/apps/permits/views/permit.py`, `backend/apps/payment/services.py`
- **Fix**: Create `AuditTrail` entries for config changes and successful payment verifications.

---

## Priority 4 — Low Severity (Fix Within 1 Month)

### R-30: Implement Password Reset Flow
- **Effort**: 2-4 hours
- **Fix**: Add forgot-password endpoint with token-based reset via SMS or email.

### R-31: Move Gemini API Key to Header
- **File**: [`backend/apps/ocr/providers.py:203`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/ocr/providers.py#L203)
- **Fix**: Use `headers={"x-goog-api-key": api_key}` instead of URL parameter.

### R-32: Add Content-Type / Magic Byte File Validation
- **Fix**: Install `python-magic` and validate uploaded file MIME type matches extension.

### R-33: Validate SMS Phone Numbers
- **File**: [`backend/apps/sms/services.py:18-24`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/sms/services.py#L18-L24)
- **Fix**: Validate digit count (10 or 12 digits), reject non-numeric characters.

### R-34: Restrict QR Verification to Staff Roles
- **File**: [`backend/apps/permits/services/permit.py:170`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/services/permit.py#L170)
- **Fix**: Remove `Farmer` from allowed roles in `verify_permit()`.

### R-35: Update Outdated Dependencies
- **Fix**: Replace `django-cloudinary-storage==0.3.0` with maintained alternative or fork.

### R-36: Add ALLOWED_HOSTS Custom Domain
- **File**: [`backend/config/settings/prod.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/prod.py)
- **Fix**: Add `farmpass-ph.me` to `ALLOWED_HOSTS`.

---

## Regression Testing Summary

| Priority | Items | Minimum Tests |
|----------|-------|---------------|
| P1 (Highest Impact) | R-01 through R-07 | 13 tests covering method restrictions, permissions, file validation, fee integrity |
| P2 (High) | R-08 through R-15 | 12 tests covering token lifecycle, role enforcement, status guards |
| P3 (Medium) | R-16 through R-28 | 18 tests covering OTP, error responses, CORS, atomicity |
| P4 (Low) | R-29 through R-35 | 8 tests for password reset, file validation, phone validation |

### Recommended Test Execution Order
1. Run existing test suite to establish baseline: `python -m pytest`
2. After each P1 fix, run targeted tests for that fix
3. After all P1 fixes, run full suite to verify no regressions
4. Repeat for P2, P3, P4

### Key Test Scenarios to Add
```python
# test_audit_trail_readonly.py
def test_audit_trail_rejects_post(self):
    """POST /audit-trail/ returns 405."""

def test_audit_trail_rejects_delete(self):
    """DELETE /audit-trail/{id}/ returns 405."""

# test_opv_method_restriction.py
def test_opv_rejects_patch(self):
    """PATCH /opv/{id}/ returns 405."""

# test_file_upload_validation.py
def test_kyc_upload_rejects_executable(self):
    """Upload .exe to /user/{id}/documents/ returns 400."""

# test_permit_fee_integrity.py
def test_issued_permit_ignores_client_fee(self):
    """POST /issued-permit/ with permit_fee=0 uses municipal config fee."""
```
