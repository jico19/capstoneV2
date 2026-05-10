# Permit ViewSets Remediation Plan

This document tracks the security and logic fixes required for `backend/apps/permits/viewset.py` and related services.

## 🔴 CRITICAL: Security & Access Control
- [ ] **Enable Global Authentication**: Uncomment `DEFAULT_PERMISSION_CLASSES` in `backend/config/settings.py`.
- [ ] **Secure ViewSets**: Ensure all ViewSets in `viewset.py` have explicit `permission_classes = [IsAuthenticated]`.
    - [ ] `SubmittedDocumentViewSets`
    - [ ] `OPVValidationViewSets`
    - [ ] `IssuedPermitViewSets`

## 🟠 HIGH: Data Isolation (IDOR Protection)
- [ ] **Implement `get_queryset` Filtering**: Override `get_queryset` in the following ViewSets to ensure Farmers only see their own records:
    - [ ] `SubmittedDocumentViewSets`
    - [ ] `OPVValidationViewSets`
    - [ ] `IssuedPermitViewSets`
    - [ ] `OCRValidationResultViewSets`

## 🟡 MEDIUM: Robustness & Data Integrity
- [ ] **Sanitize Error Responses**: Replace `str(e)` in `create` and `resubmit` with user-friendly messages to prevent technical info leakage.
- [ ] **Fix Document Mapping**: Refactor `services.create_permit` and `services.resubmit_permit` to use a more robust linking mechanism than simple indexing.
- [ ] **Add Missing Transactions**: Wrap `OPVValidationViewSets.approve` and `reject` in `transaction.atomic()`.
- [ ] **Minimize PII in Verification**: Create a dedicated `PermitVerificationSerializer` for the `verify` endpoint to limit data exposed to Inspectors.

## 🔵 LOW: Refactoring & Cleanup
- [ ] **Standardize Retrieve**: Refactor `IssuedPermitViewSets.retrieve` to use standard ID lookups or a dedicated action name.
- [ ] **Optimize N+1 Queries**: Use `prefetch_related` in `PermitApplicationDetailSerializer` for origins and documents.
- [ ] **Sync Opv QuerySet**: Ensure `get_queryset` for Opv role includes all relevant statuses defined in the `Status` model.
