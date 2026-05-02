# Sidebar Expansion Plan - LivestockPass

This document outlines the proposed additions to the sidebar and system features, ensuring they align with the objectives and scope defined in the project manuscript.

## 1. Role-Specific Sidebar Enhancements

### Farmer (Applicant)
*Objective: Improve accessibility and tracking for livestock owners.*
- **Dashboard:** Overview of active permits and quick stats.
- **Apply for Permit:** Direct link to the submission form (Manuscript Obj 1).
- **My Applications:** Track status (Pending, OCR Validated, OPV Review, etc.) and view feedback/remarks.
- **Digital Receipts:** Access and download receipts for paid permits (Manuscript Obj 2.2).
- **Farmer Profile:** Manage farm location and contact details (Manuscript Scope).
- **Notifications:** Real-time updates via system and SMS (Manuscript Obj 1.3).

### Agri (Municipal Agriculture Office)
*Objective: Streamline administrative workflows and data-driven decision-making.*
- **Admin Dashboard:** High-level metrics (Total permits issued, revenue today, active diseases).
- **Permit Processing:**
    - **Pending Review:** New applications needing manual or OCR verification.
    - **OPV Queue:** Monitor applications currently with the Provincial Vet.
    - **Issued Permits:** Archive of all active and expired permits.
- **Financials:** Payment verification and revenue reports.
- **Monitoring & GIS:**
    - **Swine Density Map:** Barangay-level visualization (Manuscript Obj 1.1).
    - **Movement Analytics:** Tracking "Origin to Destination" trends.
- **Accountability:**
    - **Audit Trail:** Chronological record of who approved/modified what (Manuscript Output Stage).
    - **System Reports:** Exportable data for LGU reporting.

### OPV (Office of Provincial Veterinary)
*Objective: Focus on health standards and veterinary validation.*
- **Validation Dashboard:** Priority queue for applications forwarded by MAO.
- **Document Verification:** Specialized view for Veterinary Health Certificates.
- **Validation History:** Archive of approved/rejected validations with remarks.

### Inspector (Field Officers)
*Objective: Fast field verification and accountability.*
- **Inspector Dashboard:** Summary of today's inspections.
- **Scan QR Code:** Instant permit verification (Manuscript Obj 2.1).
- **Inspection Logs:** Historical record of all scans performed, including GPS coordinates (InspectorLogs model).
- **Checkpoint Map:** Visualization of active checkpoints and high-traffic routes.

---

## 2. Geospatial Map Integration
*The user asked if the map should be separated. Here is the strategy:*

**Recommendation: Contextual Integration**
Instead of just one "Map" link, provide specialized map views:
1. **Density Map (Agri/OPV):** Focused on disease prevention and population monitoring.
2. **Traffic/Checkpoint Map (Inspector/Agri):** Focused on enforcement and movement tracking.
3. **Inspection Heatmap (Admin):** Visualizing where inspections are most frequent based on `InspectorLogs` (lat/long).

---

## 3. Features "Missing" but Supported by Backend
These are supported by existing models but not fully utilized in the UI:
- **Audit Logs:** Use the `AuditTrail` model to show a "Recent Activity" feed on the Admin/Agri dashboards.
- **GPS-Tagged Inspections:** Use `InspectorLogs.lat` and `InspectorLogs.longi` to plot where permits are being checked in real-time.
- **OCR Validation Feedback:** Show the "Confidence Level" or "Extracted Data" from `OCRValidationResult` to the Agri staff during review.

---

## 4. Alignment with Manuscript
- **Objective 2.3:** "Monitoring dashboards that support planning" -> Added Movement Analytics and Admin Metrics.
- **Objective 2.4:** "System alerts for missing documents" -> Integrated into "My Applications" for Farmers.
- **Output Stage:** "Audit trail logs" -> Added dedicated Audit Trail view.
