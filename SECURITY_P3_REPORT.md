# Priority 3 Security Patches — Completion Report

**Date**: 2026-10-14  
**Scope**: Applied and verified 13 medium-severity hardening Priority 3 security patches.  
**Test Suite**: 64 passed, 0 failed across `apps/api/tests/test_user_views.py` and `apps/payment/tests/`.

---

### Applied Patches & Evidence

| Patch | Area | Affected Files | Status | Details & Verification |
| :--- | :--- | :--- | :--- | :--- |
| **R-16** | OTP Security & Lockout | [`backend/apps/api/utils.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/utils.py#L4)<br>[`backend/apps/api/services.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/services.py#L22) | **APPLIED** | Switched OTP generation to `secrets.randbelow()`. Added 5-attempt brute-force lockout in Redis/cache (`otp_attempts_{phone}`). Reset on new generation or successful verification. |
| **R-17** | Information Leakage | [`backend/apps/payment/viewsets.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/payment/viewsets.py#L55)<br>[`backend/apps/inspector/viewsets.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/inspector/viewsets.py#L38) | **APPLIED** | Replaced raw `str(e)` in error responses with generic sanitized messages (`logger.exception(e)` preserves server-side debug trace). |
| **R-18** | ReDoS / HashDOS | [`backend/config/settings/base.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/base.py#L198) | **APPLIED** | Restored `DATA_UPLOAD_MAX_NUMBER_FIELDS = 2000` (superseding unlimited `None`). |
| **R-19** | Production CORS Hardening | [`backend/config/settings/prod.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/settings/prod.py#L32) | **APPLIED** | Purged `http://localhost:5173` and `http://127.0.0.1:5173` from production `CORS_ALLOWED_ORIGINS`. |
| **R-20** | Dev Seed Isolation | [`backend/scripts/seed_realistic_operations.py`](file:///C:/Users/user/Documents/capstoneV2/backend/scripts/seed_realistic_operations.py#L33) | **APPLIED** | Added `if not settings.DEBUG: raise RuntimeError(...)` guard preventing execution in production environments. |
| **R-21** | PDF Content Injection | [`backend/apps/documents/services/permit_documents.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/documents/services/permit_documents.py#L11) | **APPLIED** | Applied `html.escape()` to dynamic text fields (`applicant_name`, `carrier_name`, `destination_address`, etc.) rendered inside ReportLab `Paragraph` tags. |
| **R-22** | Secondary Atomicity | [`backend/apps/inspector/services.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/inspector/services.py#L21)<br>[`backend/apps/permits/services/ocr.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/services/ocr.py#L42)<br>[`backend/apps/permits/views/permit.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/views/permit.py#L75) | **APPLIED** | Wrapped `create_inspector_log()`, `override_ocr_result()`, and `MunicipalConfigViewSet.create()` in `transaction.atomic()`. |
| **R-23** | Duplicate Payment OR Number | [`backend/apps/payment/models.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/payment/models.py#L101) | **APPLIED** | Added unique constraint `unique_payment_or_number` on non-null `or_number` via migration `payment.0011`. |
| **R-24** | PayMongo Configuration | [`backend/.env`](file:///C:/Users/user/Documents/capstoneV2/backend/.env#L21) | **APPLIED** | Corrected swapped `PAYMONGO_SECRET_KEY` and `PAYMONGO_PUBLIC_KEY`. |
| **R-25** | Login Brute Force Throttling | [`backend/apps/api/views.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/views.py#L16) | **APPLIED** | Added `LoginIPRateThrottle` (20 attempts/min per client IP) on `CustomTokenObtainPairView`. |
| **R-26** | Stale Token Claims on Refresh | [`backend/apps/api/serializers.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/api/serializers.py#L25) | **APPLIED** | Re-queried active user status and claims (`role`, `barangay`, `is_active`) on token refresh before returning new access token. |
| **R-27** | Configuration Tampering Audit | [`backend/apps/permits/views/permit.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/permits/views/permit.py#L80) | **APPLIED** | Generated formal `AuditTrail` record on municipal fee configuration updates (`CONFIG_UPDATE`). |
| **R-28** | Webhook HMAC Verification | [`backend/apps/payment/views.py`](file:///C:/Users/user/Documents/capstoneV2/backend/apps/payment/views.py#L14)<br>[`backend/config/urls.py`](file:///C:/Users/user/Documents/capstoneV2/backend/config/urls.py#L21) | **APPLIED** | Added `PayMongoWebhookView` (`POST /payment/webhook/`) verifying `Paymongo-Signature` header via HMAC SHA-256 with timestamp tolerance check. |

---

### Verification Proof

1. **Targeted Pytest Run**:
   ```
   .\venv\Scripts\python.exe -m pytest apps/api/tests/test_user_views.py apps/payment/tests/ -q
   ................................................................         [100%]
   64 passed in 192.11s (0:03:12)
   ```

2. **Django System Integrity Check**:
   ```
   .\venv\Scripts\python.exe manage.py check
   System check identified no issues (0 silenced).
   ```
