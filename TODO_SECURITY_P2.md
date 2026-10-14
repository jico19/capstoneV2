# Priority 2 Security Patches — Implementation Tracker

Target: Apply and verify 8 high-integrity and authorization Priority 2 security patches.

- [x] R-08: Enable Token Blacklisting on Refresh (`backend/config/settings/base.py`)
- [x] R-09: Add Logout Endpoint with Token Blacklisting (`backend/apps/api/views.py`, `backend/config/urls.py`)
- [x] R-10: Harden Iframe Embedding via CSP (`backend/config/middleware.py`)
- [x] R-11: Prevent Privilege Escalation on Profile Update (`backend/apps/api/serializers.py`)
- [x] R-12: Concurrency Lock on Application Approval (`backend/apps/permits/services/application.py`)
- [x] R-13: Restrict Barangay & Hog Survey Modifications (`backend/apps/maps/viewsets.py`)
- [x] R-14: Lock Applications Against Edits Once Approved (`backend/apps/permits/views/application.py`)
- [x] R-15: Password Hashing & Validation on User Update (`backend/apps/api/serializers.py`)
- [x] Regression Verification: Run targeted test suite (51 passed)
