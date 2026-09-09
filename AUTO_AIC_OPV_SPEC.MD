# Auto-Generated AIC & MAO-to-OPV Validation Workflow Specification

**Status:** Implemented & Verified  
**Reference Document:** sample_docs/AIC.jpg (Official Sariaya Animal Inspection Certificate)  
**Target Roles:** Farmer (Applicant), MAO / Municipal Agriculture Office (Agri Officer), OPV (Office of the Provincial Veterinarian)

---

## 1. Executive Summary & Goal

In the livestock movement clearance process for Sariaya, Quezon:
1. When a farmer applies for a livestock transport permit, the Municipal Agriculture Office (MAO) conducts review/inspection.
2. Upon approval by MAO, the system auto-generates the official **Animal Inspection Certificate (AIC)** matching the municipal form template.
3. The applicant (Farmer) immediately gets a digital copy of the AIC that they can view and download from their dashboard.
4. MAO passes/forwards the application along with the auto-generated AIC to the Office of the Provincial Veterinarian (OPV) for validation (status: FORWARDED_TO_OPV).
5. OPV can inspect the AIC and application details. *(Note: OPV validation specifics are pending further client clarification, so forwarding and inspection capability is established first).*

---

## 2. Form Template Reference (sample_docs/AIC.jpg)

The auto-generated AIC must mirror the official government form:

### Header
* **Republic of the Philippines**
* **Region IV-A (CALABARZON)**
* **Province of Quezon**
* **MUNICIPALITY OF SARIAYA**
* **OFFICE OF THE MUNICIPAL AGRICULTURIST**
* **ANIMAL INSPECTION CERTIFICATE**
* *Certification text:*
  > "This is to certify that the following animals described below were found to be apparently healthy at the time of inspection. Furthermore, the animals are from areas where there are no reported outbreaks of animal diseases and will be transported in appropriately sanitized and accredited transport vehicle."

### Data Fields & Sources
| Form Field | Source in System |
| :--- | :--- |
| **Total Number of Heads** | Aggregated sum(number_of_pigs) across all TransportOrigin records |
| **In words** | Number-to-words converter (e.g., TEN HEADS ONLY) |
| **Classification** | Checkboxes dynamically checked based on counts: Breeder (inahin/barako), Grower (grower), Slaughter Animal (fattener) |
| **Name of Shipper** | Applicant's name from OCR Handler's License / Carrier Accreditation / User Profile |
| **Address of Shipper** | Applicant's address from Handler's License / Carrier Registration |
| **Livestock Handlers License & Expiry** | OCR-extracted registration_number and date_of_expiration from handlers_license |
| **Transport Carrier Accreditation & Expiry** | OCR-extracted license_number and date_of_expiration from transport_carrier_reg |
| **Plate Number & CP #** | OCR plate number & farmer's phone number |
| **Origin & Destination** | Origin barangay(s) in Sariaya & application destination |
| **Source Farm/s & Company Address** | Origin farm names / Carrier business address |

### Swine Breakdown Table
| Specie | Name of Owner | Barangay | No. of animals | Remarks |
| :--- | :--- | :--- | :--- | :--- |
| SWINE | Farmer / Owner Name | Barangay Name | Count | Type (e.g., FATTENER / SOW / BOAR) |
| **NOTHING FOLLOWS** | | | | |

### Footer & Signatures
* **Validity Clause:** "Issued this [Date], as transport requirement in the Province of Quezon and valid within 48 hours."
* **AIC No.:** Format MM-DD-NNN-YY (e.g. 02-02-164-26 / 09-07-001-26) generated atomically.
* **Official Receipt No. & Date:** Reference to transaction receipt / date issued.
* **Processed by:** MAO inspecting officer's name and signature line.
* **Approving Signatory:** AMALITA C. AMORES, OIC - Municipal Agriculturist.

---

## 3. Architecture & Data Flow

1. Farmer Submits Permit Application with Docs -> Status: SUBMITTED (OCR processing)
2. MAO Reviews application & clicks Approve
3. API Triggers generate_aic_pdf (assigns AIC number & generates PDF)
4. Application Status transitions to FORWARDED_TO_OPV
5. Farmer receives notification + AIC PDF unlocked for view/download
6. Application appears in OPV queue with AIC attached
7. OPV views application & inspects auto-generated AIC

---

## 4. Technical Implementation Details

### A. Database Model Updates (backend/apps/permits/models.py)
Decouple the AIC fields from IssuedPermit so that AIC can exist directly on the PermitApplication:
- aic_number = models.CharField(max_length=20, default="", blank=True)
- aic_pdf = models.FileField(upload_to='issued_docs/aic/', null=True, blank=True, validators=[validate_file_size])
- aic_issued_at = models.DateTimeField(null=True, blank=True)

### B. PDF Generation Service (backend/apps/documents/services.py)
Modify generate_aic_pdf(permit_application_id, issued_by_user_id=None):
- Look up PermitApplication directly rather than requiring application.issued_permit.
- Assign aic_number via atomic helper _generate_aic_number(application).
- Render ReportLab canvas matching sample_docs/AIC.jpg.
- Save resulting PDF to application.aic_pdf and set application.aic_issued_at = timezone.now().

### C. Application Workflow Service (backend/apps/permits/services/application.py)
In approve_application(application, user, remarks):
1. Validate user has role "Agri".
2. Generate AIC number and invoke generate_aic_pdf(application.pk, issued_by_user_id=user.pk).
3. Set status to models.PermitApplication.Status.FORWARDED_TO_OPV.
4. Create audit trail: "[AGRI OFFICER REVIEW] - Application #{id} approved. AIC generated and forwarded to OPV."
5. Send system notification and SMS to the applicant informing them their AIC is ready and forwarded to OPV.

### D. Serializers & Endpoints (backend/apps/permits/)
- In PermitApplicationDetailSerializer and PermitApplicationListSerializer, expose:
  - aic_number
  - aic_pdf (absolute URL)
  - aic_issued_at
- In get_all_documents, include the generated AIC so standard document viewer components automatically render it.
- Add endpoint @action(detail=True, methods=["get"]) def aic(self, request, pk=None) in PermitApplicationViewSet for direct streaming/download.

### E. Frontend Updates
1. **Farmer Portal (ApplicationDetail.jsx & DownloadApplication.jsx):**
   - When status is FORWARDED_TO_OPV (or later) and application.aic_pdf is present, display a banner/card:
     "Animal Inspection Certificate (AIC) Issued - Your application has been approved by MAO and forwarded to OPV. You can download your official AIC copy."
   - Provide a "Download AIC Copy" button.
2. **OPV Portal (OPVApplicationDetailView.jsx):**
   - Under Step 1 ("Check Documents"), feature the auto-generated AIC prominently with an action to inspect the certificate in the preview modal.

---

## 5. Quick Resume Checklist (When Ready to Implement)
- [x] Run migration to add aic_number, aic_pdf, and aic_issued_at to PermitApplication.
- [x] Update generate_aic_pdf in backend/apps/documents/services.py to use PermitApplication.
- [x] Connect generate_aic_pdf call inside approve_application in backend/apps/permits/services/application.py.
- [x] Expose aic_pdf and include it in get_all_documents in backend/apps/permits/serializers.py.
- [x] Add "Download AIC" button in Farmer UI (ApplicationDetail.jsx).
- [x] Add AIC inspection view in OPV UI (OPVApplicationDetailView.jsx).
- [x] Run pytest backend/apps/permits/tests/test_workflow.py to verify automated workflow tests.
