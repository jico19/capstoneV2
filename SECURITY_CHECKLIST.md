# FarmPass Security Checklist

**Date**: 2026-10-14 | **Status Legend**: PASS · PARTIAL · FAIL · NOT VERIFIED · NOT APPLICABLE

---

## 1. Authentication

| # | Control | Status | Evidence |
|---|---------|--------|----------|
| 1.1 | Password hashing (PBKDF2-SHA256) | PASS | Default `PASSWORD_HASHERS` active. `create_user()` hashes passwords. |
| 1.2 | Password validators configured | PARTIAL | 4 validators in `AUTH_PASSWORD_VALIDATORS` but never invoked in `UserWriteSerializer`. Weak passwords accepted. |
| 1.3 | Password stored securely on update | FAIL | `UserWriteSerializer.update()` not overridden. PATCH with `password` saves plaintext via `ModelSerializer.update()`. |
| 1.4 | Login rate limiting | PARTIAL | `LoginRateThrottle` at 5/min, but per IP+username key allows credential spraying across usernames. |
| 1.5 | Account lockout | FAIL | No failed attempt counter. No lockout after N failures. No `django-axes` or equivalent. |
| 1.6 | Password reset flow | FAIL | No endpoint exists. Recovery requires admin intervention. |
| 1.7 | MFA | NOT APPLICABLE | OTP exists for registration verification, not login MFA. |
| 1.8 | JWT access token lifetime | PASS | 5 minutes. Appropriately short. |
| 1.9 | JWT refresh token lifetime | PASS | 24 hours with rotation enabled. |
| 1.10 | Token blacklisting on rotation | FAIL | `BLACKLIST_AFTER_ROTATION` omitted (defaults `False`). Old refresh tokens remain valid. |
| 1.11 | Logout / token revocation | FAIL | No logout endpoint. No way to invalidate tokens. |
| 1.12 | Session cookie security | FAIL | `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` absent in all settings. |
| 1.13 | Stale claims on refresh | PARTIAL | Token refresh copies old claims. Role/status changes not reflected until re-login. |
| 1.14 | OTP security | FAIL | `random.randint` (insecure PRNG). No attempt limit. `AllowAny` + no throttle on send_otp. |

---

## 2. Authorization

| # | Control | Status | Evidence |
|---|---------|--------|----------|
| 2.1 | DEFAULT_PERMISSION_CLASSES | FAIL | Not set. DRF defaults to `AllowAny`. |
| 2.2 | Service-layer role guards | PASS | All workflow transitions enforce `user.role` checks with `PermissionDenied`. |
| 2.3 | ViewSet permission_classes | PARTIAL | Most viewsets set `IsAuthenticated` but no custom permission classes for role enforcement at ViewSet level. |
| 2.4 | Object-level permissions (IDOR) | FAIL | `OCRValidationResultViewSet`, `OPVValidationViewSet` return `all()` queryset. Cross-user access possible. |
| 2.5 | ModelViewSet CRUD restriction | FAIL | 6 viewsets inherit `ModelViewSet` without disabling `update`/`partial_update`/`destroy`. |
| 2.6 | Audit trail write protection | FAIL | Full CRUD on `/audit-trail/`. |
| 2.7 | Barangay/HogSurvey write protection | FAIL | Any authenticated user can modify municipal master data. |
| 2.8 | Application post-approval immutability | FAIL | PATCH allowed at any workflow stage. |
| 2.9 | Dashboard role isolation | PASS | Custom `RoleAllowed` permission. Proper queryset scoping. |
| 2.10 | Report access control | PASS | All report endpoints enforce `role == 'Agri'`. |
| 2.11 | Payment endpoint protection | PASS | `_can_manage_payment()` ownership check. Mutating methods raise `MethodNotAllowed`. |
| 2.12 | Privilege escalation on update | FAIL | Agri can PATCH any user to `role="Admin"` — role restriction only on create. |

---

## 3. Input Security

| # | Control | Status | Evidence |
|---|---------|--------|----------|
| 3.1 | SQL injection | PASS | All queries use Django ORM parameterization. No raw SQL. |
| 3.2 | XSS (backend) | PASS | No HTML templates. All responses are JSON or binary. |
| 3.3 | XSS (frontend) | PASS | No `dangerouslySetInnerHTML`. React 19 auto-escapes. |
| 3.4 | CSRF | PASS | JWT Bearer auth in `Authorization` header. Session CSRF middleware active for admin. |
| 3.5 | SSRF | PASS | All outbound URLs from static `settings.*` config. No user-controlled URLs. |
| 3.6 | Command injection | PASS | No `os.system`, `subprocess`, `eval`, `exec`. |
| 3.7 | Path traversal (uploads) | PARTIAL | Django storage sanitizes filenames. But file upload validation bypassed (see C-07). |
| 3.8 | Unsafe deserialization | PASS | No `pickle`, `yaml.load`, `eval`. Standard `json.loads` only. |
| 3.9 | Open redirects | PASS | No user-controlled redirects. Payment URLs from `settings.FRONTEND_URL`. |
| 3.10 | ReportLab XML injection | PARTIAL | User strings in `Paragraph()` without `html.escape()`. Causes ExpatError crash. |
| 3.11 | File upload type validation | FAIL | Model validators bypassed on direct `save()`. No content-type inspection. |
| 3.12 | File upload size limits | PARTIAL | Model validators defined but not invoked on direct save. Serializer/model mismatch on OPV files (30MB vs 10MB). |
| 3.13 | Request body size limit | FAIL | `DATA_UPLOAD_MAX_NUMBER_FIELDS = None`. DoS risk. |

---

## 4. API and HTTP

| # | Control | Status | Evidence |
|---|---------|--------|----------|
| 4.1 | HTTPS enforcement | FAIL | `SECURE_SSL_REDIRECT` absent in prod. |
| 4.2 | HSTS | FAIL | `SECURE_HSTS_SECONDS` absent. |
| 4.3 | Security headers (CSP) | FAIL | No `Content-Security-Policy` header configured. |
| 4.4 | X-Frame-Options | PARTIAL | Set to `SAMEORIGIN` globally but stripped by `AllowFramesMiddleware` on media/document paths. |
| 4.5 | CORS | PARTIAL | Production whitelists specific origins but includes `http://localhost:5173`. |
| 4.6 | Rate limiting (global) | PASS | Anon 10/min, User 100/min configured. |
| 4.7 | Rate limiting (login) | PARTIAL | 5/min but per IP+username allows spraying. |
| 4.8 | Rate limiting (OTP) | FAIL | `send_otp` and `verify_otp` have no rate limiting. |
| 4.9 | Error responses | PARTIAL | Custom exception handler exists but 6+ endpoints return raw `str(e)`. |
| 4.10 | Method restrictions | PARTIAL | Payment viewset properly blocks methods. Others inherit full ModelViewSet. |
| 4.11 | Proxy SSL header | FAIL | `SECURE_PROXY_SSL_HEADER` missing for Render. |

---

## 5. Data Protection

| # | Control | Status | Evidence |
|---|---------|--------|----------|
| 5.1 | Password not in API responses | PASS | `password` is `write_only` in serializer. |
| 5.2 | PII encryption at rest | NOT VERIFIED | Phone, address, license stored plaintext. Standard for municipal apps but noted. |
| 5.3 | Payment card data | PASS | Delegated to PayMongo. No PAN/CVV stored locally. |
| 5.4 | Secrets in code | PASS | All secrets from `os.environ`. No hardcoded fallbacks for SECRET_KEY. |
| 5.5 | .gitignore coverage | PASS | `.env`, `media/`, `venv/`, `node_modules/` excluded. |
| 5.6 | Sensitive data in logs | PARTIAL | Phone numbers masked in SMS logs. But `str(e)` can leak DB info. |
| 5.7 | Frontend token storage | PARTIAL | `sessionStorage` (tab-scoped, clears on close). XSS-accessible. |
| 5.8 | Media file authorization | FAIL | All documents served publicly without auth. |

---

## 6. File Handling

| # | Control | Status | Evidence |
|---|---------|--------|----------|
| 6.1 | Upload type validation | FAIL | Validators defined but bypassed on `Model.save()`. No magic byte inspection. |
| 6.2 | Upload size limits | PARTIAL | Defined but not consistently enforced. Serializer/model mismatch on OPV. |
| 6.3 | Path traversal prevention | PASS | Django storage sanitizes. Downloads use in-memory BytesIO. |
| 6.4 | Executable upload prevention | FAIL | Any file type accepted via direct save in KYC upload endpoint. |
| 6.5 | Download authorization | FAIL | `/media/*` served without authentication. |

---

## 7. Secrets and Configuration

| # | Control | Status | Evidence |
|---|---------|--------|----------|
| 7.1 | SECRET_KEY management | PASS | From environment only. No fallback. |
| 7.2 | DEBUG mode default | PASS | Defaults to `False` if env var missing. |
| 7.3 | ALLOWED_HOSTS | PARTIAL | Set in prod but missing custom domain `farmpass-ph.me`. |
| 7.4 | API keys in URLs | PARTIAL | Gemini API key in query string (`providers.py:203`). Should use header. |
| 7.5 | Inverted PayMongo keys | FAIL | Secret/public keys assigned to wrong variable names in `.env`. |
| 7.6 | Seed script safety | PARTIAL | No `DEBUG` guard. Resets passwords to `password123` unconditionally. |

---

## 8. Dependencies and Supply Chain

| # | Control | Status | Evidence |
|---|---------|--------|----------|
| 8.1 | Known vulnerable packages | NOT VERIFIED | Requires `pip audit` / `npm audit` runtime execution. |
| 8.2 | Outdated packages | PARTIAL | `django-cloudinary-storage==0.3.0` last updated 2020. |
| 8.3 | Secret scanning | NOT VERIFIED | No CI/CD config found. |
| 8.4 | CI/CD pipeline security | NOT APPLICABLE | No CI/CD configuration in repository. |
| 8.5 | Lock files | PASS | `package-lock.json` present for frontend. `requirements.txt` pinned. |

---

## 9. Business Logic

| # | Control | Status | Evidence |
|---|---------|--------|----------|
| 9.1 | Workflow state machine | PASS | `_VALID_STATUS_TRANSITIONS` with enforcement in service layer. |
| 9.2 | Self-approval prevention | PASS | Role checks in all service transitions. |
| 9.3 | Transaction atomicity | PARTIAL | Most transitions wrapped. Missing in inspector log, OCR override, municipal config. |
| 9.4 | Race condition protection | PARTIAL | `select_for_update` on permit issuance and AIC counter. Missing on application approval. |
| 9.5 | Payment verification | BY DESIGN | Auto-fulfill is intentional prototype behavior for academic capstone. Not intended for real payment processing. |
| 9.6 | Webhook security | FAIL | No PayMongo webhook receiver or signature verification. |
| 9.7 | Replay prevention | PARTIAL | Duplicate payment blocked. OR number not unique across permits. |
| 9.8 | QR code forgery resistance | PARTIAL | UUIDv4 (unguessable) but unsigned. No HMAC verification. |
| 9.9 | QR cross-access | PARTIAL | Farmer role can view other farmers' permits via QR token. |
| 9.10 | Permit fee integrity | FAIL | Client can override `permit_fee` in request body. |

---

## 10. Operations

| # | Control | Status | Evidence |
|---|---------|--------|----------|
| 10.1 | Audit trail logging | PASS | `AuditTrail` entries created on all workflow transitions. |
| 10.2 | Audit trail immutability | FAIL | Full CRUD exposed. Logs can be altered/deleted. |
| 10.3 | Audit trail completeness | PARTIAL | Missing on municipal config changes and online payment verifications. |
| 10.4 | Error handling | PARTIAL | Custom exception handler exists. Raw `str(e)` leaks in 6+ endpoints. |
| 10.5 | Production config | FAIL | 7 Django security warnings on `check --deploy`. |
| 10.6 | Monitoring | NOT VERIFIED | No monitoring configuration found in repository. |
| 10.7 | Backup protection | NOT VERIFIED | Infrastructure-level concern. Not auditable from code. |
