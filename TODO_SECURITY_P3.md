# Priority 3 Security Patches — Implementation Tracker

Target: Apply and verify 13 medium-severity hardening Priority 3 security patches.

- [x] R-16: Secure OTP Generation & Add Failed Attempt Lockout (`backend/apps/api/utils.py`, `backend/apps/api/services.py`, `backend/apps/api/viewsets.py`)
- [x] R-17: Sanitize Exception Responses (`backend/apps/payment/viewsets.py`, `backend/apps/inspector/viewsets.py`)
- [x] R-18: Restore Parameter Bomb Protection (`backend/config/settings/base.py`)
- [x] R-19: Remove Localhost from Production CORS (`backend/config/settings/prod.py`)
- [x] R-20: Guard Seed Script Against Production Execution (`backend/scripts/seed_realistic_operations.py`)
- [x] R-21: XML-Escape User Strings in PDF Generation (`backend/apps/documents/services/permit_documents.py`)
- [x] R-22: Wrap Secondary Services in `transaction.atomic()` (`backend/apps/inspector/services.py`, `backend/apps/permits/services/ocr.py`, `backend/apps/permits/views/permit.py`)
- [x] R-23: Add Unique Constraint to Payment OR Number (`backend/apps/payment/models.py`)
- [x] R-24: Fix Swapped PayMongo Keys in `.env` (`backend/.env`)
- [x] R-25: Add IP-Level Rate Limiter on Login (`backend/apps/api/views.py`)
- [x] R-26: Re-Query Live User Claims on Token Refresh (`backend/apps/api/serializers.py`)
- [x] R-27: Audit Log Municipal Config Changes (`backend/apps/permits/views/permit.py`)
- [x] R-28: PayMongo Webhook Signature Verification Stub & Architecture Note (`backend/apps/payment/views.py`, `backend/config/urls.py`)
- [x] Regression Verification: Run targeted test suite (64/64 passed)
