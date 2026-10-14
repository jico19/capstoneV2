# FarmPass Security Routes Matrix

**Date**: 2026-10-14 | Route-by-route authentication, authorization, and security status.

**Legend**:
- **Auth**: Authentication requirement (JWT = JWT Bearer, None = unauthenticated, Session = Django session)
- **Role**: Required role(s) for access
- **Ownership**: Whether resource ownership is enforced
- **Status**: Security assessment (PASS / PARTIAL / FAIL)

---

## Authentication Endpoints

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| POST | `/login/` | None | Any | N/A | Login | PARTIAL | Rate limited 5/min per IP+username. No lockout. |
| POST | `/token/refresh/` | None | Any | N/A | Token refresh | PARTIAL | Old tokens not blacklisted. Stale claims preserved. |

---

## User Management (`/user/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/user/` | JWT | Scoped | Yes | List users | PASS | Queryset filtered by role (Agri sees Farmers, Farmer sees self). |
| POST | `/user/` | JWT | Agri/Admin | N/A | Create user | PARTIAL | Password validators not invoked. Password not required. |
| GET | `/user/{id}/` | JWT | Scoped | Yes | Read user | PASS | Filtered queryset. |
| PATCH | `/user/{id}/` | JWT | Scoped | Partial | Update user | FAIL | No `set_password()` on update. Agri can escalate role to Admin. |
| PUT | `/user/{id}/` | JWT | Scoped | Partial | Update user | FAIL | Same as PATCH. |
| DELETE | `/user/{id}/` | JWT | None enforced | No | Delete user | FAIL | Not overridden. No soft-delete, no audit. |
| POST | `/user/{id}/documents/` | JWT | Farmer | Yes | KYC upload | FAIL | File validators bypassed. Any file type/size accepted. |
| GET | `/user/{id}/documents/` | JWT | Scoped | Yes | Read KYC docs | PASS | Filtered by user. |
| POST | `/user/{id}/verify_account/` | JWT | Agri | N/A | Verify farmer | PASS | Role check enforced. |
| POST | `/user/{id}/reject_account/` | JWT | Agri | N/A | Reject farmer | PASS | Role check enforced. |
| GET | `/user/me/` | JWT | Any | Self | Current user | PASS | Returns authenticated user data. |
| POST | `/user/send_otp/` | **None** | Any | N/A | Send SMS OTP | FAIL | AllowAny, no throttle. SMS toll fraud vector. |
| POST | `/user/verify_otp/` | **None** | Any | N/A | Verify OTP | FAIL | AllowAny, no attempt limit. Brute-forceable. |

---

## Permit Applications (`/application/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/application/` | JWT | Scoped | Yes | List apps | PASS | Farmer: own apps. Agri: all. OPV: forwarded. |
| POST | `/application/` | JWT | Farmer | Yes | Create app | PASS | `perform_create` sets `farmer=request.user`. |
| GET | `/application/{id}/` | JWT | Scoped | Yes | Read app | PASS | Filtered queryset. |
| PATCH | `/application/{id}/` | JWT | Farmer | Partial | Update app | FAIL | Allowed at ANY workflow stage. Can modify after approval. |
| PUT | `/application/{id}/` | JWT | Farmer | Partial | Update app | FAIL | Same as PATCH. |
| DELETE | `/application/{id}/` | JWT | None enforced | No | Delete app | FAIL | Not disabled. Can delete issued permits. |
| POST | `/application/{id}/approve/` | JWT | Agri | N/A | Approve | PASS | Service layer role + state check. Audit logged. |
| POST | `/application/{id}/reject/` | JWT | Agri | N/A | Reject | PASS | Service layer role + state check. Audit logged. |
| POST | `/application/{id}/cancel/` | JWT | Farmer | Yes | Cancel | PASS | Ownership + role check. Audit logged. |
| POST | `/application/{id}/verify_documents/` | JWT | Agri | N/A | Doc verification | PASS | Role check enforced. |
| POST | `/application/{id}/resubmit/` | JWT | Farmer | Yes | Resubmit | PASS | Ownership + status check. |

---

## Submitted Documents (`/document/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/document/` | JWT | Scoped | Partial | List docs | PARTIAL | Inspector/Barangay see all documents. |
| POST | `/document/` | JWT | Farmer | Yes | Upload doc | PASS | `perform_create` links to farmer's app. |
| PATCH | `/document/{id}/` | JWT | Farmer | Yes | Update doc | PARTIAL | Locked after OPV validated but not during OPV review. |
| DELETE | `/document/{id}/` | JWT | Farmer | Yes | Delete doc | PARTIAL | Same locking gap. |

---

## OPV Validation (`/opv/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/opv/` | JWT | Scoped | Yes | List validations | PASS | Filtered queryset. |
| GET | `/opv/{id}/` | JWT | Any auth | No | Read validation | PARTIAL | Full queryset for all roles. |
| PATCH | `/opv/{id}/` | JWT | **None enforced** | No | Update validation | **FAIL** | Status/aic_verified writable. Bypasses OPV role guard. |
| PUT | `/opv/{id}/` | JWT | **None enforced** | No | Update validation | **FAIL** | Same. |
| DELETE | `/opv/{id}/` | JWT | **None enforced** | No | Delete validation | **FAIL** | Not disabled. |
| POST | `/opv/{id}/approve/` | JWT | OPV | N/A | Approve OPV | PASS | Service layer role check. |
| POST | `/opv/{id}/reject/` | JWT | OPV | N/A | Reject OPV | PASS | Service layer role check. |
| POST | `/opv/{id}/resubmit/` | JWT | Farmer | Yes | Resubmit | PASS | Service layer role + ownership. |

---

## OCR Validation (`/ocr-validation/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/ocr-validation/` | JWT | Any auth | **No** | List OCR results | FAIL | Returns `all()`. Any user sees all OCR data. |
| PUT | `/ocr-validation/{id}/` | JWT | Agri | N/A | Override OCR | PASS | Routes through `override_ocr_result()`. |
| PATCH | `/ocr-validation/{id}/` | JWT | **None enforced** | **No** | Partial update | **FAIL** | Bypasses override service. Status writable. |
| DELETE | `/ocr-validation/{id}/` | JWT | **None enforced** | **No** | Delete OCR | **FAIL** | Not disabled. |

---

## Issued Permits (`/issued-permit/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/issued-permit/` | JWT | Scoped | Yes | List permits | PASS | Farmer: own. Others: role-filtered. |
| POST | `/issued-permit/` | JWT | Agri | N/A | Issue permit | PARTIAL | Role-guarded but accepts client `permit_fee`. |
| POST | `/issued-permit/{id}/release/` | JWT | Agri | N/A | Release permit | PASS | Service layer with `select_for_update`. |

---

## Payment (`/payment/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/payment/` | JWT | Scoped | Yes | List payments | PASS | Farmer: own. Agri: all. |
| POST | `/payment/` | JWT | — | — | Create | PASS | Raises `MethodNotAllowed`. |
| PUT | `/payment/{id}/` | JWT | — | — | Update | PASS | Raises `MethodNotAllowed`. |
| DELETE | `/payment/{id}/` | JWT | — | — | Delete | PASS | Raises `MethodNotAllowed`. |
| POST | `/payment/{id}/create_paymongo_session/` | JWT | Farmer | Yes | Create payment | PASS | Ownership check via `_can_manage_payment()`. |
| POST | `/payment/{id}/verify_paymongo_session/` | JWT | Farmer | Yes | Verify payment | **BY DESIGN** | Auto-fulfill is intentional prototype for academic capstone. |
| POST | `/payment/{id}/confirm_offline/` | JWT | Agri | N/A | Confirm payment | PASS | Role check + duplicate guard. |
| POST | `/payment/{id}/simulate_payment/` | JWT | Farmer | Yes | Demo payment | PARTIAL | Guarded by `DEBUG` but exists in codebase. |

---

## Maps (`/barangay/`, `/hog-survey/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/barangay/` | JWT | Any | N/A | List barangays | PASS | Read-only public data. |
| POST | `/barangay/` | JWT | **None enforced** | N/A | Create barangay | **FAIL** | Any authenticated user. |
| PATCH | `/barangay/{id}/` | JWT | **None enforced** | N/A | Update barangay | **FAIL** | Any authenticated user. |
| DELETE | `/barangay/{id}/` | JWT | **None enforced** | N/A | Delete barangay | **FAIL** | Any authenticated user. |
| GET | `/hog-survey/` | JWT | Scoped | Partial | List surveys | PARTIAL | Barangay: own. Others: all. |
| POST | `/hog-survey/` | JWT | Partial check | N/A | Create survey | FAIL | Incomplete role guard. |
| PATCH | `/hog-survey/{id}/` | JWT | Partial check | N/A | Update survey | FAIL | Same. |
| DELETE | `/hog-survey/{id}/` | JWT | Partial check | N/A | Delete survey | FAIL | Same. |
| POST | `/hog-survey/batch_create/` | JWT | Agri/Barangay | Yes | Batch create | PASS | Role + barangay scoping enforced. |

---

## Inspector (`/inspector/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/inspector/` | JWT | Scoped | Yes | List logs | PASS | Inspector: own. Agri: all. |
| POST | `/inspector/` | JWT | Inspector | Yes | Create log | PASS | Service layer role check. |
| PATCH | `/inspector/{id}/` | JWT | **None enforced** | No | Update log | **FAIL** | Not blocked. Inspector can alter logs. |
| DELETE | `/inspector/{id}/` | JWT | **None enforced** | No | Delete log | **FAIL** | Not blocked. |

---

## Audit Trail (`/audit-trail/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/audit-trail/` | JWT | Scoped | Partial | List logs | PASS | Farmer/Inspector: own. Staff: all. |
| POST | `/audit-trail/` | JWT | **None enforced** | No | Create log | **FAIL** | Fabricate audit entries. |
| PATCH | `/audit-trail/{id}/` | JWT | **None enforced** | No | Update log | **FAIL** | Alter audit entries. |
| DELETE | `/audit-trail/{id}/` | JWT | **None enforced** | No | Delete log | **FAIL** | Destroy forensic evidence. |

---

## Notifications (`/notification/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/notification/` | JWT | Scoped | Yes | List notifications | PASS | Filtered to user. |
| PATCH | `/notification/{id}/` | JWT | Scoped | Yes | Mark read | PASS | User-scoped. |

---

## Reports (`/report/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/report/draft/` | JWT | Agri | N/A | Draft report | PASS | Role enforced. |
| GET | `/report/export-formal-pdf/` | JWT | Agri | N/A | Export PDF | PASS | Role enforced. |
| GET | `/report/permit-issuance/pdf/` | JWT | Agri | N/A | Issuance report | PASS | Role enforced. |
| GET | `/report/*/csv/` | JWT | Agri | N/A | CSV exports | PASS | Role enforced. |

---

## Municipal Config (`/municipal-config/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/municipal-config/` | JWT | Any | N/A | Read config | PASS | Public fee schedule. |
| POST | `/municipal-config/` | JWT | Agri | N/A | Update config | PARTIAL | Role enforced but Admin blocked. No audit log. No atomicity. |

---

## Documents (`/cis-template/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/cis-template/generate/` | JWT | Any | N/A | Generate blank PDF | PASS | Read-only PDF generator. |

---

## Dashboard (prefix `/dashboard/`)

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/dashboard/agri/` | JWT | Agri/Admin | N/A | Dashboard data | PASS | `RoleAllowed` permission. |
| GET | `/dashboard/opv/` | JWT | OPV/Admin | N/A | OPV dashboard | PASS | `RoleAllowed` permission. |
| GET | `/dashboard/farmer/` | JWT | Farmer | Yes | Farmer dashboard | PASS | Scoped to `request.user`. |
| GET | `/dashboard/insights/` | JWT | Scoped | N/A | AI insights | PASS | Role-scoped content. |

---

## Static / Media

| Method | Endpoint | Auth | Role | Ownership | Sensitive Op | Status | Notes |
|--------|----------|------|------|-----------|-------------|--------|-------|
| GET | `/media/*` | **None** | **None** | **None** | Serve files | **FAIL** | All uploaded documents publicly accessible. |
| GET | `/admin/` | Session | Staff | N/A | Django admin | PARTIAL | Active but missing secure cookie flags. |
| GET | `/api/health-check/` | None | Any | N/A | Health check | PASS | Read-only status. |
