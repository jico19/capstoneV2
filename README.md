# LivestockPass: Municipal Permit & Hog Density Management System

LivestockPass is a specialized full-stack platform designed for the **Sariaya Municipal Agriculture Office** to digitize the issuance, tracking, and verification of livestock transport permits. It combines administrative workflows with geospatial data and machine learning to monitor hog populations effectively.

## 🚀 Core Features

### 1. Digital Permit Lifecycle
- **Farmer Submission:** Automated document upload (Max 30MB) with built-in **OCR (Optical Character Recognition)** to extract data from clearances and licenses.
- **Multi-Role Approval:** Seamless workflow transitions between **Agri Officers** (Administrative) and **OPV Staff** (Veterinary/Technical).
- **Secure Issuance:** Unique 13-digit permit numbers and encrypted QR tokens for every approved application.

### 2. Payment & Release
- **Hybrid Payment Gateway:** Supports online payments via **Paymongo** and manual walk-in verification by Agri staff.
- **Automated PDF Generation:** Once paid, the system generates an official Permit PDF containing all clearances and a scannable QR code.

### 3. Field Verification (Inspector App)
- **Real-time Scanning:** Roadside Inspectors can scan permit QR codes to instantly verify the validity, pig count, and origin/destination details.
- **GPS Logging:** Automatically logs the location and timestamp of every inspection.

### 4. Hog Density & ML Engine
- **Geospatial Heatmaps:** Visualizes historical hog populations across Sariaya barangays using Leaflet.
- **Predictive Analytics:** Features an **ML Engine (Random Forest Regressor)** to predict future pig density based on seasonal trends and historical survey data.

## 🛠️ Tech Stack
- **Backend:** Django, Django REST Framework, SQLite/PostgreSQL.
- **Frontend:** React, Tailwind CSS, DaisyUI, Lucide React.
- **Analysis:** Pandas, Scikit-Learn, Joblib (ML Engine).
- **Background Tasks:** Django Tasks for OCR and PDF generation.

## 🔒 Security & Standards
- **RBAC:** Robust Role-Based Access Control (Admin, Agri, Opv, Farmer, Inspector).
- **Data Integrity:** Strict file size validation (30MB) and unique tokenization for all issued documents.
- **Audit Logs:** Full traceability for every status change and inspection log.
