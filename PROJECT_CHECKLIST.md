# LivestockPass Project Checklist

This checklist tracks the remaining tasks for the LivestockPass project, organized by user role and system requirements. It is based on the objectives in the Project Manuscript and the current state of the codebase.

## 1. Role: Farmer (Applicant)
*Objective: Improve accessibility and tracking for livestock owners.*

- [x] **Sidebar Enhancement**: Add "Apply for Permit" and "My Applications" as direct sidebar links.
- [ ] **Digital Receipts**: Create a "My Receipts" page to view/download receipts for paid permits (`IssuedPermit`).
- [x] **Farmer Profile**: Implement a profile management page for farm location and contact details.
- [ ] **Actionable Feedback**: Display specific rejection remarks and OCR validation warnings on the application detail view.
- [x] **SMS Preferences**: Add a toggle in settings to enable/disable SMS notifications.

## 2. Role: Agri (Municipal Agriculture Office)
*Objective: Streamline administrative workflows and accountability.*

- [ ] **Audit Trail Dashboard**: Create a view for the `AuditTrail` model to show a chronological record of system actions.
- [ ] **System Reports**: Implement data export (CSV/PDF) for LGU reporting (e.g., permits issued, revenue).
- [ ] **OCR Detail View**: Show "Confidence Levels" and "Extracted Fields" from `OCRValidationResult` during the review process.
- [ ] **Movement Analytics**: Enhance the map views to show "Origin to Destination" trends based on issued permits.

## 3. Role: OPV (Office of Provincial Veterinary)
*Objective: Specialized health standards validation.*

- [ ] **Health Doc Viewer**: A specialized, high-readability UI for reviewing Veterinary Health Certificates.
- [ ] **Validation History**: An archive view for OPV staff to track their previous decisions and remarks.

## 4. Role: Inspector (Field Officers)
*Objective: Fast field verification and GPS tracking.*

- [ ] **Inspection History**: A UI for inspectors to view their previous `InspectorLogs`.
- [ ] **Checkpoint Heatmap**: A map view visualizing `InspectorLogs` coordinates to identify high-traffic routes.
- [ ] **Offline Mode Buffer**: (Optional/Advanced) Basic support for scanning without an active connection.

## 5. Technical Debt & UI Consistency
*Objective: Maintainability and adherence to Design.MD.*

- [ ] **Feature-Based Refactoring**: Move code from type-based folders to the domain-based structure in `FRONTEND_SCALABILITY_PLAN.md`.
- [ ] **Design System Audit**: 
    - [ ] Ensure all components use `rounded-none`.
    - [ ] Replace all shadows with `1px stone-200` borders.
    - [ ] Standardize typography scale (Headings vs Labels).
- [ ] **RBAC Refactoring**: Implement a `usePermission` hook to handle UI visibility across roles consistently.
- [ ] **Navigation Config**: Move the sidebar logic to a centralized configuration object.

## 6. Testing & Validation
- [ ] **Role-Based API Tests**: Ensure all 4 roles are tested for each endpoint (200 for allowed, 403 for denied).
- [ ] **State Transition Tests**: Verify permit status flow (Draft → Submitted → OPV → Payment → Released).
- [ ] **OCR Edge Cases**: Test OCR behavior with low-quality images or missing fields.
