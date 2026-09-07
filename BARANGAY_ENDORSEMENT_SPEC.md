# Barangay Official Endorsement & Clearance Workflow Specification

**Status:** On Hold / Discussion Draft (For Alignment with Capstone Group Mates)  
**Reference Documents:** 
- `sample_docs/Endorsement Letter-1.jpg` (Official Barangay Endorsement to MAO)
- `sample_docs/Endorsement Letter-2.jpg` (Barangay Pagpapatunay - Certificate of Legitimacy & Health)
- `sample_docs/cis.jpg` (Certificate of Immediate Slaughter for Slaughter Animals)  
**Target Roles:** Barangay Official (Punong Barangay / Secretary / Agri Committee), Farmer / Outside Hauler (Applicant), Municipal Agriculture Office (MAO)

---

## 1. Executive Summary & Regulatory Purpose

In Sariaya's livestock disease control and African Swine Fever (ASF) zoning protocols:
1. **Inter-Municipal Trade Requirement**: When a hauler, trader, or meat shop operator from **outside Sariaya** (e.g., Lucban, Tayabas, Batangas, Metro Manila) enters a Sariaya barangay (e.g., Brgy. Janagdong 1) to buy and transport live hogs out of the municipality, they are required to obtain official barangay clearances before an animal inspection certificate (AIC) or shipping permit can be issued by the Municipal Agriculture Office (MAO).
2. **Verification Against Hog Survey**: The Barangay Official must verify that:
   - The buyer is legitimate and authorized to purchase ASF-free swine within the barangay.
   - The swine were raised by registered local farmers listed in the **Barangay Agriculture Committee's Hog Survey**.
   - The swine are verified healthy and free from reported disease.
   - Designated biosecurity perimeters (loading boundaries / checkpoints) are specified.
3. **Paired Issuance**: The barangay typically issues two complementary documents:
   - **`ENDORSEMENT` (English)**: Addressed to MAO/OPV endorsing the buyer to be issued an Animal Health Certificate (AIC) and stipulating boundary pickup rules.
   - **`PAGPAPATUNAY` (Filipino)**: Certifies the buyer's legitimacy, lists the source farmers, head counts, and contact numbers, and attests to animal health based on the barangay survey.

---

## 2. Reference Documents Breakdown

### A. Document 1: `sample_docs/Endorsement Letter-1.jpg` (Endorsement to MAO)
* **Issuing Authority**: Republic of the Philippines, Province of Quezon, Municipality of Sariaya, Brgy. Janagdong 1.
* **Seals**: Municipality of Sariaya (Left) & Barangay Janagdong-1 (Right) with Janagdong-1 watermark.
* **Document Title**: `ENDORSEMENT`
* **Addressed To**: The Municipal Agriculture Office ("your good office").
* **Endorsed Party**:
  * **Hauler / Trader Name**: `RICHELLE T. BABIA`
  * **Business Name**: `JEICIA'S MEAT SHOP`
  * **Business Address**: `BRGY. 4 LUCBAN, QUEZON` *(Outside Sariaya)*
* **Objective**: "...be allowed to get and be issued with Animal Health Certificate (AIC)."
* **Table of Hauled Swine**:
  | Name of Swine Raiser | Sitio/Barangay | No. of Heads Hauled | Company Name (Destination) | Complete Company Address (Destination) |
  | :--- | :--- | :--- | :--- | :--- |
  | `ANTONINO M. RAZON` | `ILAYA` | `12` | `LUCBAN SLAUGHTERHOUSE` | `BRGY. KALYATT LUCBAN QUEZON` |
* **Territorial & Boundary Restriction Clause**:
  > *"He/She has been allowed by the Sangguniang Barangay to facilitate buying of ASF free swine ONLY IN THE AREAS OF BARANGAY JANAGDONG 1, SARIAYA, QUEZON and all vehicles will only allow at area boundary/ between of SITIO ILAYA BRGY. JANAGDONG 1 SARIAYA, QUEZON."*
* **Validity Clause**: Issued `24th day of FEBRUARY 2026 at 8:30 am` for `LIVE PIG TRANSPORT ONLY`.
* **Signatory**: `TEODORO VALDEZ`, Barangay Chairman.

---

### B. Document 2: `sample_docs/Endorsement Letter-2.jpg` (Pagpapatunay)
* **Issuing Authority**: Same dual-seal header (Sariaya & Janagdong 1).
* **Document Title**: `PAGPAPATUNAY`
* **Salutation**: `Sa Sinumang Kinauukulan,` (To Whom It May Concern)
* **Certification of Buyer**:
  > *"Ito ay pagpapatunay na si RICHELLE T. BABIA may sapat na taong gulang, residente ng BRGY. 4 LUCBAN, QUEZON ay isa sa mga lehitimong mamimili (ahente) ng baboy dito sa aming Barangay JANAGDONG 1, Sariaya, Quezon."*
* **Table of Sourced Swine & Contacts**:
  | PANGALAN | BILANG | Contact No. |
  | :--- | :--- | :--- |
  | `ANTONINO M. RAZON` | `12` | `09640969620` |
* **Health & Survey Verification Clause**:
  > *"at base sa Survey ng Komite ng Agrikultura ng barangay ay nasa maayos na kalusugan ang mga baboy."*
* **Date & Location of Issuance**: `ika-24 ng PEBRERO taong 2026, sa Barangay JANAGDONG 1, Sariaya, Quezon`.
* **Signatory**: `TEODORO V. VALDEZ`, Punong Barangay.

---

### C. Document 3: `sample_docs/cis.jpg` (Certificate of Immediate Slaughter)
* **Document Title**: `CERTIFICATE OF IMMEDIATE SLAUGHTER FOR SLAUGHTER ANIMALS`
* **Nature**: Shipper/Proprietor declaration required when animals are transported directly to a slaughterhouse.
* **Certification Statement**:
  > *"This is to certify that TEN (10) of swine from EDWIN ROJALES, ZAPOTE LAS PINAS CITY shipped on FEB 02, 2024 to METRO MANILA are for immediate slaughter within twenty-four (24) hours."*
* **Signatory**: `Darrel Anonuevo`, PROPRIETOR/SHIPPER (`Davrel Anonuevo trucking services`).
* **Core Data**: Quantity in words and digits, origin, shipping date, destination, 24-hour slaughter commitment, and shipper signature.

---

## 3. Data Schema & Architecture Design

### Proposed Model: `BarangayEndorsement`
```python
class BarangayEndorsement(models.Model):
    endorsement_no = models.CharField(max_length=64, unique=True) # e.g. BRGY-JAN1-2026-001
    barangay = models.ForeignKey('maps.Barangay', on_delete=models.CASCADE)
    issued_by = models.ForeignKey('api.User', on_delete=models.SET_NULL, null=True)
    
    # Outside Hauler / Buyer Information
    buyer_name = models.CharField(max_length=255)            # e.g. Richelle T. Babia
    business_name = models.CharField(max_length=255)         # e.g. Jeicia's Meat Shop
    buyer_address = models.CharField(max_length=255)         # e.g. Brgy. 4, Lucban, Quezon
    buyer_phone_no = models.CharField(max_length=20, blank=True)
    
    # Transport Details & Restrictions
    destination_company = models.CharField(max_length=255)   # e.g. Lucban Slaughterhouse
    destination_address = models.CharField(max_length=255)   # e.g. Brgy. Kalyatt, Lucban, Quezon
    boundary_restriction = models.TextField(blank=True)       # e.g. Area boundary between Sitio Ilaya
    transport_purpose = models.CharField(max_length=100, default="LIVE PIG TRANSPORT ONLY")
    
    issued_at = models.DateTimeField(default=timezone.now)
    punong_barangay_name = models.CharField(max_length=255)  # e.g. Teodoro V. Valdez

    # Generated PDF documents
    endorsement_pdf = models.FileField(upload_to='barangay_endorsements/', null=True, blank=True)
    pagpapatunay_pdf = models.FileField(upload_to='barangay_pagpapatunay/', null=True, blank=True)


class BarangayEndorsementItem(models.Model):
    endorsement = models.ForeignKey(BarangayEndorsement, related_name='items', on_delete=models.CASCADE)
    farmer_name = models.CharField(max_length=255)           # Swine Raiser Name
    sitio = models.CharField(max_length=100, blank=True)     # Sitio within the barangay
    number_of_heads = models.PositiveIntegerField()          # Number of heads hauled
    farmer_phone_no = models.CharField(max_length=20)        # Contact number for SMS alerts
    survey_record = models.ForeignKey('maps.HogSurvey', null=True, blank=True, on_delete=models.SET_NULL)
```

---

## 4. Key Questions to Verify with Group Mates

Before proceeding with code implementation, align on these specific questions:

### Question 1: System Issuance vs. Physical Upload
* **Flow A (System Generation by Barangay Official)**: 
  Outside traders visit the Barangay Hall in person. The Barangay Official logs into the system, fills out the endorsement form (picking farmers from their existing `HogSurvey`), and prints the system-generated PDF with seals and signature lines.
* **Flow B (Digital Application & Approval)**: 
  The applicant applies online for a livestock permit with an external destination. The system automatically creates a pending endorsement task in the Barangay Official's dashboard. Once the Barangay Official approves it online, the permit application proceeds to MAO review.
* **Flow C (Hybrid / Pre-requisite Attachment)**: 
  The applicant gets the physical paper from the barangay, then uploads photos of both `Endorsement Letter` and `Pagpapatunay` under the `endorsement_cert` and `cis` document slots in Step 2 of `CreateApplication.jsx`.

### Question 2: Generation of Documents
* Should the system generate:
  1. **Both** the English `ENDORSEMENT` and Filipino `PAGPAPATUNAY`?
  2. The `Certificate of Immediate Slaughter (CIS)` as an auto-filled template when destination is a slaughterhouse?

### Question 3: Decrement & Stock Reserve
* Does issuing a Barangay Endorsement reserve or deduct stock immediately from the `HogSurvey`, or does the deduction only occur when the final transport permit is released by MAO (as currently implemented)?

---

## 5. Ready-to-Implement Modules (Once Approved)

When ready, implementation will encompass:
1. **Backend**:
   - `BarangayEndorsement` & `BarangayEndorsementItem` models + migrations.
   - ReportLab PDF generator in `backend/apps/documents/services.py` for both the Endorsement Letter and Pagpapatunay replicating the official layout and seals.
   - API ViewSet & Serializers scoped strictly to users with `role='Barangay'`.
2. **Frontend (Barangay Portal)**:
   - New **"Endorsements"** page in `frontend/src/pages/barangay/`.
   - Issue Endorsement modal with `HogSurvey` auto-lookup.
   - One-click print/download for both documents.
3. **Integration**:
   - Link issued endorsements with `PermitApplication` and `TransportOrigin`.
