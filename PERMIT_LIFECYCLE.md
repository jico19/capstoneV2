# LivestockPass Permit Application Lifecycle

This document provides a technical and logical overview of the permit application process, mapping the flow from initial submission by a Farmer to final verification by an Inspector.

## 1. User Roles & Responsibilities
- **Farmer:** Initiates applications and uploads required identification/clearance documents.
- **Agri Officer:** Conducts administrative review, manages rejections/approvals, and verifies payments.
- **OPV Staff:** Conducts technical veterinary validation and issues official health certificates.
- **Inspector:** Performs roadside verification by scanning the permit's QR code via the Inspector App.

---

## 2. Detailed Phase Breakdown

### Phase 1: Farmer Submission
- **Action:** Farmer fills out the transport form and uploads 5 required documents.
- **Endpoint:** `POST /api/application/`
- **Validation Guards:**
    - **Client-Side:** Frontend blocks files > 30MB with a UI error message.
    - **Server-Side:** Serializer and Model validators perform a final size check.
    - **Error:** Returns `400 Bad Request` if files are missing or too large.
- **Status Change:** `DRAFT` → `SUBMITTED`.
- **System Task:** Enqueues a background OCR task to extract text for review.

### Phase 2: Administrative Review (Agri)
- **Action:** Agri Officer reviews document images and OCR results.
- **Rejection Path:**
    - **Endpoint:** `POST /api/application/id/reject/`
    - **Logic:** Requires remarks; Status moves to `RESUBMISSION`.
    - **Notif:** Farmer receives a notification to fix specific documents.
- **Approval Path:**
    - **Endpoint:** `POST /api/application/id/approve/`
    - **Logic:** Status moves to `FORWARDED_TO_OPV`.
    - **Notif:** Farmer is notified that the application is with the Veterinary office.

### Phase 3: Technical Validation (OPV)
- **Action:** OPV staff review the health-related documents.
- **Rejection Path:**
    - **Endpoint:** `POST /api/opv/id/reject/`
    - **Logic:** Status moves to `OPV_REJECTED`. The application returns to the Agri review queue for oversight.
- **Approval Path:**
    - **Endpoint:** `POST /api/opv/id/approve/`
    - **Requirement:** OPV **must** upload the Veterinary Health Certificate (VHC) and Transportation Pass.
    - **Validation:** Files must be under 30MB.
    - **Status Change:** `FORWARDED_TO_OPV` → `OPV_VALIDATED`.

### Phase 4: Issuance & Payment
- **Action:** Agri Officer issues the official permit.
- **Endpoint:** `POST /api/issued-permit/`
- **System Logic:** 
    - Generates a unique 13-character `permit_number`.
    - Generates a `qr_token` (UUID) for secure scanning.
- **Status Change:** `OPV_VALIDATED` → `PAYMENT_PENDING`.
- **Payment:** 
    - **Online:** Handled via Paymongo integration.
    - **Offline:** Agri Officer manually marks as paid.
- **Finalization:** Once `is_paid` is true, the system generates the final **Permit PDF** and sets status to `RELEASED`.

### Phase 5: Roadside Verification (Inspector)
- **Action:** Inspector scans the QR code on the permit.
- **Endpoint:** `GET /api/application/verify/<qr_token>/`
- **Error Handling:**
    - **Invalid Token:** If the token does not exist, the UI displays an **Invalid Permit** alert.
    - **Unpaid/Pending:** If status is not `RELEASED`, the UI displays a **Not Active** warning.
- **Success:** If valid and released, the UI displays the Farmer's name, pig count, and origin/destination details.

---

## 3. Status Reference Table

| Status | Description | System Trigger |
| :--- | :--- | :--- |
| `DRAFT` | Initial creation. | Application saved. |
| `SUBMITTED` | Ready for Agri review. | Application submitted with 5 files. |
| `RESUBMISSION` | Correction required. | Agri Rejection. |
| `FORWARDED_TO_OPV` | Ready for OPV review. | Agri Approval. |
| `OPV_REJECTED` | Medical concern raised. | OPV Rejection. |
| `OPV_VALIDATED` | Ready for permit issuance. | OPV Approval + VHC/Pass upload. |
| `PAYMENT_PENDING` | Permit issued, awaiting fee. | Agri Issuance. |
| `RELEASED` | Valid for transport. | Payment confirmation. |

---

## 4. Security & Data Integrity
- **Field-Level Guards:** Mandatory remarks on all rejections.
- **Document Locking:** Permits and certificates are only accessible to the Farmer once the status is `RELEASED`.
- **QR Token Security:** Verification relies on a non-sequential UUID `qr_token` rather than a predictable ID, preventing unauthorized data access.
