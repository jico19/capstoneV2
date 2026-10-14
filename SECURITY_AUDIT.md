# FarmPass Security Audit Report

**Date**: 2026-10-14
**Auditor**: Automated Security Audit (Read-Only Inspection)
**Scope**: Full-stack application — Django 6.0 + DRF backend, React 19 + Vite frontend
**Repository**: `capstoneV2/`

> [!NOTE]
> **Deployment Context**: FarmPass is an academic capstone project deployed for thesis/defense evaluation only. It is not intended for real-world production use. The payment auto-fulfill behavior is **intentional prototype design** — real PayMongo transactions are not expected. Findings are still documented for academic completeness and to address potential panel questions.

---

## Executive Summary

FarmPass has **7 critical**, **10 high**, **13 medium**, and **10 low/informational** security findings (including 1 by-design item). The most severe exploitable issues are tamperable audit logs, workflow bypass via unguarded generic CRUD endpoints, unauthenticated media file access, and missing default permission classes.

The services layer (`backend/apps/permits/services/`) demonstrates strong security patterns — role guards, state machine transitions, `transaction.atomic()`, `select_for_update()`, and formal audit trail logging. However, these controls are consistently undermined by the ViewSet layer inheriting `ModelViewSet` without disabling generic CRUD actions, allowing direct database manipulation that bypasses all business logic safeguards.

### Findings by Severity

| Severity | Count |
|---|---|
| CRITICAL | 7 |
| HIGH | 10 |
| MEDIUM | 13 |
| LOW / INFORMATIONAL (incl. BY DESIGN) | 10 |
| **Total** | **40** |

### Baseline Control Counts

| Status | Count |
|---|---|
| PASS | 16 |
| PARTIAL | 12 |
| FAIL | 17 |
| NOT VERIFIED | 2 |
| NOT APPLICABLE | 2 |
| BY DESIGN | 1 |

---

## Five Highest-Priority Risks

1. **Audit Trail Tampering** — `AuditTrailViewSet` exposes full CRUD (create/update/delete) on security audit logs. Any authenticated user can fabricate, alter, or erase forensic evidence.

2. **Workflow Bypass via Generic CRUD** — `OPVValidationViewSet`, `OCRValidationResultViewSet`, and `PermitApplicationViewSet` inherit `ModelViewSet` without disabling `update`/`partial_update`/`destroy`. Users can PATCH status fields directly, bypassing all role guards and state machine validations in the services layer.

3. **Unauthenticated Document Access** — All uploaded farmer credentials, issued permits, AIC certificates, and VHCs at `/media/*` are served with zero authentication via `django.views.static.serve`.

4. **Missing Default Permission Classes** — DRF defaults to `AllowAny` when `DEFAULT_PERMISSION_CLASSES` is not set. Any new viewset without explicit `permission_classes` is publicly exposed.

5. **File Upload Validation Bypass** — Farmer KYC uploads bypass model validators (`FileExtensionValidator`, size limits) because `Model.save()` skips field validation. Combined with unauthenticated media serving, enables arbitrary file upload and public access.

---

## Issues That Should Block Real-World Deployment

> [!NOTE]
> These are documented for academic completeness. Since FarmPass is deployed for thesis defense only, these are not immediate blockers but would be required before any real-world municipal deployment.

1. Audit trail CRUD exposure — `backend/apps/api/viewsets.py:366-381`
2. Missing `DEFAULT_PERMISSION_CLASSES` — `backend/config/settings/base.py:150`
3. Unauthenticated media serving — `backend/config/urls.py:27-35`
4. OPV/OCR validation status tampering via PATCH
5. Missing production security headers (no HSTS, no SSL redirect, no secure cookies)
6. File upload validation bypass on farmer KYC documents
7. Permit fee override from client request data

---

## Detailed Findings

### CRITICAL Findings

#### ~~C-01~~ BD-01: Payment Auto-Fulfill (BY DESIGN — Academic Prototype)
- **Location**: [`backend/apps/payment/services.py:296-308`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/payment/services.py#L296-L308)
- **Endpoint**: `POST /payment/{id}/verify_paymongo_session/`
- **Classification**: **INFORMATIONAL — BY DESIGN**
- **Description**: When PayMongo returns non-200, times out, or reports unpaid, the code forces `is_paid = True`. This is intentional prototype behavior for the academic capstone — real payment processing is not in scope.
- **Evidence**:
  ```python
  # Line 305-307: Intentional prototype fallback
  if not is_paid:
      logger.info("Auto-fulfilling payment verification... in demo mode")
      is_paid = True
  ```
- **Note for Defense Panel**: If asked "what would you change for real deployment?", answer: guard behind `settings.DEBUG`, implement PayMongo webhook with signature verification, remove client-polling architecture.

#### C-02: Audit Trail Full CRUD Exposure
- **Location**: [`backend/apps/api/viewsets.py:366-381`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/viewsets.py#L366-L381)
- **Endpoints**: `POST/PUT/PATCH/DELETE /audit-trail/{id}/`
- **Description**: `AuditTrailViewSet` inherits `BaseModelViewSet` (ModelViewSet) without restricting HTTP methods. `AuditTrailSerializer` has all fields writable.
- **Attack Scenario**: Staff member approves corrupt permit, then `DELETE /audit-trail/{id}/` removes evidence. Or fabricates `POST /audit-trail/` entries to frame another officer.
- **Impact**: Complete destruction of forensic integrity.

#### C-03: OPV Validation Status Tampering
- **Location**: [`backend/apps/permits/views/opv.py:8`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/views/opv.py#L8)
- **Endpoints**: `PATCH /opv/{id}/`, `PUT /opv/{id}/`
- **Description**: While `@action approve/reject` check `staff.role == 'Opv'`, standard `partial_update` is not disabled. `OPVValidationWriteSerializer` exposes writable `status` and `aic_verified` fields.
- **Attack Scenario**: Farmer sends `PATCH /opv/{id}/ {"status": "VALIDATED", "aic_verified": true}` to bypass OPV review.
- **Impact**: Complete workflow bypass. Permits issued without veterinary inspection.

#### C-04: OCR Validation Bypass via PATCH
- **Location**: [`backend/apps/permits/views/ocr.py:6-28`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/views/ocr.py#L6-L28)
- **Endpoint**: `PATCH /ocr-validation/{id}/`
- **Description**: `update()` routes through `override_ocr_result()` (checks `user.role == 'Agri'`), but `partial_update()` (PATCH) is NOT overridden. Queryset returns `all()` — IDOR across all applications.
- **Attack Scenario**: Farmer whose document failed OCR sends `PATCH /ocr-validation/{id}/ {"status": "PASSED", "manually_overridden": true}`.
- **Impact**: Document verification bypass without audit logging.

#### C-05: Unauthenticated Media File Serving
- **Location**: [`backend/config/urls.py:27-35`](file:///C:/Users/user/Documents/capstoneV2/backend/config/urls.py#L27-L35)
- **Endpoint**: `/media/*`
- **Description**: `django.views.static.serve` mounted unconditionally (even `DEBUG=False`). All uploaded farmer licenses, CIS certificates, VHCs, AIC PDFs, issued permits served without authentication.
- **Attack Scenario**: Attacker enumerates or discovers media URLs to download all farmer KYC documents and issued government permits.
- **Impact**: Mass PII exposure. Government document exfiltration.

#### C-06: Missing DEFAULT_PERMISSION_CLASSES
- **Location**: [`backend/config/settings/base.py:150-163`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/base.py#L150-L163)
- **Description**: `REST_FRAMEWORK` does not define `DEFAULT_PERMISSION_CLASSES`. DRF defaults to `AllowAny`. Any new viewset or APIView without explicit `permission_classes` is publicly exposed.
- **Impact**: Systemic risk — every future viewset is unauthenticated by default.

#### C-07: File Upload Validation Bypass (Farmer KYC)
- **Location**: [`backend/apps/api/viewsets.py:114-138`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/viewsets.py#L114-L138)
- **Endpoint**: `POST /user/{id}/documents/`
- **Description**: Files saved via `doc.file = file; doc.save()` — Django `Model.save()` does not invoke field validators. `FileExtensionValidator` and `validate_license_file_size` are bypassed. Any file type/size accepted.
- **Attack Scenario**: Upload `.exe`, `.php`, or `.html` file as KYC document. If media is served publicly (C-05), stored XSS or malware delivery.
- **Impact**: Arbitrary file upload combined with public media serving.

#### C-08: Permit Fee Override from Client
- **Location**: [`backend/apps/permits/views/permit.py:58`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/views/permit.py#L58)
- **Endpoint**: `POST /issued-permit/`
- **Description**: `permit_fee = request.data.get("permit_fee", 150.00)` accepts client-supplied fee amount, bypassing municipal configuration.
- **Attack Scenario**: Agri officer (or anyone if RBAC weak) sends `{"permit_fee": 0}` to issue permits at zero cost.
- **Impact**: Revenue manipulation. Financial integrity compromise.

---

### HIGH Findings

#### H-01: No Token Blacklisting on Rotation
- **Location**: [`backend/config/settings/base.py:174-180`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/base.py#L174-L180)
- **Description**: `BLACKLIST_AFTER_ROTATION` defaults to `False`. Old refresh tokens remain valid for full 24h lifetime after rotation. No logout endpoint exists.
- **Impact**: Stolen refresh tokens cannot be revoked. Session hijacking persists.

#### H-02: Clickjacking — X-Frame-Options Stripped Without CSP
- **Location**: [`backend/config/middleware.py:7-17`](file:///C:/Users/user/Documents/capstoneV2/backend/config/middleware.py#L7-L17)
- **Description**: `AllowFramesMiddleware` deletes `X-Frame-Options` on `/media/`, `/document/`, `/aic`, `.pdf` paths without adding `Content-Security-Policy: frame-ancestors`.
- **Impact**: Third-party sites can embed permits and farmer documents in iframes.

#### H-03: Privilege Escalation on Profile Update
- **Location**: [`backend/apps/api/serializers.py:100-106`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/serializers.py#L100-L106)
- **Description**: Role restriction logic only runs during creation (`is_create == True`). On update, Agri user can PATCH any user to `role="Admin"`.
- **Impact**: Horizontal and vertical privilege escalation.

#### H-04: Race Condition on Application Approval
- **Location**: [`backend/apps/permits/services/application.py:160`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/services/application.py#L160)
- **Description**: `approve_application()` lacks `select_for_update()` on application object. Concurrent approval requests can trigger duplicate AIC counter increments.
- **Impact**: Double AIC allocation, duplicate async tasks.

#### H-05: Barangay Master Data Unprotected
- **Location**: [`backend/apps/maps/viewsets.py:21-42`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/maps/viewsets.py#L21-L42)
- **Endpoints**: `POST/PUT/PATCH/DELETE /barangay/{id}/`
- **Description**: Any authenticated user can create, modify coordinates/GeoJSON, or delete municipal barangay records.
- **Impact**: Municipal data integrity compromise.

#### H-06: Hog Survey Unprotected CRUD
- **Location**: [`backend/apps/maps/viewsets.py:44-121`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/maps/viewsets.py#L44-L121)
- **Description**: Queryset returns `all()` for Farmer/Inspector roles. Write operations have incomplete role guards.
- **Impact**: Farmers can insert fake surveys, view all municipal hog data.

#### H-07: Application Data Tamperable After Approval
- **Location**: [`backend/apps/permits/views/application.py:11`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/views/application.py#L11)
- **Description**: `PermitApplicationViewSet` inherits ModelViewSet. `update`/`partial_update`/`destroy` not disabled. Farmer can PATCH transport destination, dates, pig counts after OPV validation or payment.
- **Impact**: Permit data altered post-approval. Regulatory integrity compromise.

#### H-08: No Password Reset Flow
- **Location**: [`backend/config/urls.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/urls.py)
- **Description**: No password reset endpoint, token generator, or email/SMS reset flow exists.
- **Impact**: Account recovery requires manual admin intervention.

#### H-09: Missing Production Security Headers
- **Location**: [`backend/config/settings/prod.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/prod.py)
- **Description**: Missing `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_PROXY_SSL_HEADER`.
- **Impact**: Admin session cookies transmitted over HTTP. No HSTS enforcement.

#### H-10: OTP Brute-Forceable
- **Location**: [`backend/apps/api/utils.py:8`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/utils.py#L8), [`backend/apps/api/viewsets.py:284-327`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/viewsets.py#L284-L327)
- **Description**: OTP uses `random.randint` (insecure PRNG). `verify_otp` has no attempt counter. `send_otp` is `AllowAny` with no throttle. 6-digit space brute-forceable within 5-minute TTL.
- **Impact**: Account takeover via OTP bypass. SMS toll fraud via unthrottled sends.

---

### MEDIUM Findings

#### M-01: Stale JWT Claims on Token Refresh
- **Location**: [`backend/apps/api/serializers.py:146-168`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/serializers.py#L146-L168)
- **Description**: `CustomTokenRefreshSerializer` copies claims from old token without re-querying DB. Role/status changes not reflected until next login.

#### M-02: Login Throttle Allows Credential Spraying
- **Location**: [`backend/apps/api/views.py:5-25`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/views.py#L5-L25)
- **Description**: Cache key `f"{ip}_{username}"` allows 5 req/min per IP+username combination. 100 usernames = 500 attempts/min from single IP.

#### M-03: Information Leakage via str(e)
- **Location**: [`backend/apps/payment/viewsets.py:153,178,203,246,286,400`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/payment/viewsets.py#L153), [`backend/apps/inspector/viewsets.py:35,64`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/inspector/viewsets.py#L35)
- **Description**: Catch-all `Exception as e` returns `{"error": str(e)}` exposing DB table names, constraints, file paths.

#### M-04: DATA_UPLOAD_MAX_NUMBER_FIELDS = None
- **Location**: [`backend/config/settings/base.py:217`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/base.py#L217)
- **Description**: Removes Django's Hash Collision DoS protection. POST with thousands of parameters can pin CPU.

#### M-05: CORS Localhost in Production
- **Location**: [`backend/config/settings/prod.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/prod.py)
- **Description**: `http://localhost:5173` whitelisted in production CORS. `CORS_ALLOW_ALL_ORIGINS` not explicitly set to `False`.

#### M-06: Seed Script Resets Production Passwords
- **Location**: [`backend/scripts/seed_realistic_operations.py:220-221`](file:///C:/Users/user/Documents/capstoneV2/backend/scripts/seed_realistic_operations.py#L220-L221)
- **Description**: `set_password("password123")` unconditionally resets all seeded account passwords including admin. No `DEBUG` guard.

#### M-07: ReportLab XML Injection
- **Location**: [`backend/apps/documents/services/permit_documents.py:534-551`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/documents/services/permit_documents.py#L534-L551)
- **Description**: User strings interpolated into ReportLab `Paragraph` XML without escaping. `<` or `&` in names causes `ExpatError` crash (DoS).

#### M-08: Inspector Log Missing transaction.atomic()
- **Location**: [`backend/apps/inspector/services.py:15-43`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/inspector/services.py#L15-L43)
- **Description**: Partial database state if post-save operations fail.

#### M-09: OR Number Not Unique
- **Location**: [`backend/apps/payment/models.py:39`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/payment/models.py#L39)
- **Description**: `PaymentHistory.or_number` lacks `unique=True`. Same receipt reusable across permits.

#### M-10: No PayMongo Webhook Implementation
- **Location**: [`backend/config/urls.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/urls.py), [`backend/apps/payment/`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/payment/)
- **Description**: No webhook receiver. No signature verification. System relies entirely on client-initiated polling compromised by payment bypass.

#### M-11: Inverted PayMongo Keys in .env
- **Location**: `backend/.env:12-13`
- **Description**: Secret key assigned to `PAYMONGO_LIVE_PUBLIC_KEY` variable and vice versa. Risk of secret key exposure if public key variable referenced in frontend.

#### M-12: QR Verification Permits Farmer Cross-Access
- **Location**: [`backend/apps/permits/services/permit.py:170`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/services/permit.py#L170)
- **Description**: `verify_permit()` allows `Farmer` role. Any farmer can view other farmers' permit details via QR token.

#### M-13: Missing Atomicity in OCR Override and Municipal Config
- **Location**: [`backend/apps/permits/services/ocr.py:6-27`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/services/ocr.py#L6-L27), [`backend/apps/permits/views/permit.py:190-204`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/views/permit.py#L190-L204)
- **Description**: Both operations save state and create audit entries outside `transaction.atomic()`.

---

### LOW / INFORMATIONAL Findings

#### L-01: PII Stored Unencrypted
Phone numbers, addresses, license numbers stored as plaintext in PostgreSQL. Standard for non-regulated municipal systems but noted.

#### L-02: API Key in URL Query String (Gemini OCR)
[`backend/apps/ocr/providers.py:203`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/ocr/providers.py#L203) — API key visible in proxy/access logs.

#### L-03: Frontend sessionStorage Token XSS Exposure
Tokens in `sessionStorage` readable by JavaScript. Tab-scoped (clears on close) but vulnerable to XSS.

#### L-04: Outdated django-cloudinary-storage
Version 0.3.0 (last updated 2020). Long-term compatibility risk.

#### L-05: SMS Phone Number Validation Insufficient
[`backend/apps/sms/services.py:18-24`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/sms/services.py#L18-L24) — Only checks prefix, not digit count or character validity.

#### L-06: No Content-Type / Magic Byte File Inspection
File uploads validated by extension only. Renamed scripts pass validation.

#### L-07: Municipal Config Changes Not Audit-Logged
Fee and validity period changes have no `AuditTrail` record.

#### L-08: Missing ALLOWED_HOSTS Custom Domain
[`backend/config/settings/prod.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/prod.py) — `farmpass-ph.me` not in `ALLOWED_HOSTS`.

#### L-09: SMS Content Injection
[`backend/apps/sms/task.py:127-129`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/sms/task.py#L127-L129) — User-controlled `source_farmer_name` interpolated into SMS without length/newline filtering.

---

## Areas That Could Not Be Verified

1. **Production .env values** — Cannot verify actual SECRET_KEY strength or whether DEBUG=False in production deployment.
2. **Database permissions** — Cannot verify PostgreSQL role restrictions without DB access.
3. **Render platform configuration** — Cannot verify HTTPS enforcement, firewall rules, or environment variable security at the hosting level.
4. **CI/CD pipeline** — No CI/CD configuration files found in repository. Cannot verify build security.
5. **Cloudinary signed URLs** — Production media serving via Cloudinary not auditable without credentials.

---

## Audit Limitations

- Read-only static analysis only. No runtime testing, penetration testing, or dynamic analysis performed.
- Findings based on code inspection of current repository state.
- No access to production environment, database, or infrastructure configuration.
- Dependency CVE scanning not performed (would require `pip audit` / `npm audit` runtime).
