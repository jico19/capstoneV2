# 🐖 FarmPass
### **Digital Livestock Transport Permit & Swine Biosecurity System**
*Developed for the Sariaya Municipal Agriculture Office (MAO), Quezon Province.*

FarmPass is an end-to-end digital governance and biosecurity platform for livestock transit in the Municipality of Sariaya. It streamlines swine transport permits, enforces quarantine document verification, tracks hog population density across all 43 barangays, and provides real-time QR code checkpoint validation for roadside inspectors.

---

## 👥 Five Role-Based Portals

### 🌾 1. Farmer Portal (`/farmer`)
* **Online Permit Application:** Apply from any mobile device or PC with multi-origin and destination specs.
* **Document Upload & Pre-check:** Upload required clearances (Barangay Endorsement, CIS, Trader's Pass, Handler's License) with immediate deletion/replace capabilities.
* **Application Tracker:** Visual stage-by-stage status tracker from submission to release.
* **Flexible Payments:** Pay online via PayMongo (GCash, Maya, Cards) with an active countdown timer, or pay in person at MAO.
* **Permit Download:** Download official PDF transport permits with unforgeable QR verification once payment is confirmed.

### 🏛️ 2. Municipal Agriculture Office (MAO) Portal (`/agri`)
* **Document Verification Checklist:** Mandatory review gate requiring staff to inspect and verify uploaded documents before endorsement.
* **Interactive Dashboard:** Actionable KPI counters for pending, overdue, and OPV-approved requests.
* **Hog Density & Transport Heatmap:** High-resolution MapLibre GL geospatial map visualizing pig concentrations and active transit volumes.
* **AI Biosecurity Insights:** Powered by Google Gemini 2.5 Flash, providing predictive risk assessments, transit cadence advice, and biosecurity recommendations.
* **Cashier & Records:** Process walk-in cash payments, manage registered farmers/officials, export regulatory reports, and inspect immutable audit logs.

### 🩺 3. Office of the Provincial Veterinarian (OPV) Portal (`/opv`)
* **Provincial Veterinary Queue:** Review MAO-cleared applications for animal health and quarantine compliance.
* **Document Locking:** Finalized documents are automatically locked upon OPV approval to prevent tampering.
* **One-Click Decisioning:** Approve with formal shipping permit details or reject with itemized remarks and resubmission guidance.

### 🏘️ 4. Barangay Official Portal (`/barangay`)
* **Hog Census Surveys:** Track backyard and commercial swine demographics (Inahin, Barako, Fattener, Grower, Starter, Bulaw).
* **CIS Generator:** Generate official Certificates of Inspection and Sanitization with automatic Philippine Peso number-to-words conversion.
* **Local Audit Logs:** Track census submissions and certificates issued within the barangay.

### 🛡️ 5. Roadside Inspector Portal (`/inspector`)
* **Camera QR Scanner:** Scan driver and hauler QR permits directly from mobile browsers using `html5-qrcode`.
* **Instant Manifest Verification:** Validate tamper-proof cryptographic tokens to verify origin, destination, vehicle plate, and permitted swine count.
* **Inspection History:** Maintain inspection timestamps and checkpoint records across transit corridors.

---

## 🔄 The Permit Lifecycle

```text
1. Application Submission (Farmer uploads details and certificates)
       │
       ▼
2. Document Pre-Check & OCR (Automated text extraction & validation)
       │
       ▼
3. MAO Review & Verification (Staff checklist gate)
       │
       ▼
4. OPV Review & Approval (Provincial vet approval; documents locked)
       │
       ▼
5. Payment Processing (PayMongo online or MAO walk-in with countdown timer)
       │
       ▼
6. Official Permit Issuance (ReportLab PDF generated with cryptographic QR)
       │
       ▼
7. Roadside Verification (Inspectors scan QR at quarantine checkpoints)
```

---

## ⚙️ Technology Stack

### Backend
* **Framework:** Django 6.0 + Django REST Framework (Python 3.14)
* **Database:** PostgreSQL via `psycopg2-binary`
* **Async Tasks:** `django-tasks` / `django_tasks_db`
* **Authentication:** SimpleJWT (custom token claims for role and barangay scoping)
* **Document Extraction (OCR):** Resilient provider chain (PaddleOCR AI Studio with OCR.space fallback)
* **AI & Analytics:** Google Gemini 2.5 Flash REST API (`insights_engine.py`) with deterministic fallback
* **PDF & Security:** ReportLab PDF generator + signed verification tokens + QR code generation
* **Integrations:** PayMongo API (e-wallets/cards), Android SMS Gateway

### Frontend
* **Core:** React 19 + Vite 8
* **Styling & UI:** Tailwind CSS v4 + daisyUI 5 + Lucide Icons + Sonner
* **State & Data Fetching:** Zustand (sessionStorage persisted auth) + TanStack React Query v5
* **Forms & Routing:** React Hook Form + React Router v7
* **Mapping:** MapLibre GL
* **Hardware Interfacing:** `html5-qrcode` (camera barcode/QR reader)

---

## 🚀 Quickstart for Developers

### Prerequisites
* Python 3.14+
* Node.js 20+ & npm
* PostgreSQL running locally (matching credentials in `backend/.env`)

### 1. Backend Setup
```powershell
# From the project root:
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements/psql_requirements.txt

# Run database migrations
python manage.py migrate

# (Optional) Seed realistic demo operations and accounts
python manage.py runscript seed_realistic_operations

# Start Django development server
python manage.py runserver 8000
```

> **Targeted Testing:** To run specific test suites (do not run full suite by default):
> ```powershell
> python -m pytest apps/permits/tests/test_workflow.py
> python -m pytest -k "test_full_workflow"
> ```

### 2. Frontend Setup
```powershell
# From the project root:
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```

The frontend will run at `http://localhost:5173`, connecting directly to `http://127.0.0.1:8000`.

---

## 🔑 Default Seeded Accounts
When seeded via `seed_realistic_operations`, all accounts share the password: `password123`

| Role | Username / Identifier | Portal |
|---|---|---|
| **Farmer** | Demo Farmer accounts (or register new) | `/farmer` |
| **MAO Agri Staff** | `agri_staff` | `/agri` |
| **OPV Officer** | `opv_staff` | `/opv` |
| **Barangay Official**| Assigned barangay official | `/barangay` |
| **Roadside Inspector**| `inspector1` | `/inspector` |

---

## 📁 Repository Structure

```text
capstoneV2/
├── backend/
│   ├── apps/
│   │   ├── api/          # Custom User, authentication, notifications, audit trail
│   │   ├── dashboard/    # Gemini 2.5 Flash insights engine, executive KPIs
│   │   ├── documents/    # Generated PDF permits and file storage
│   │   ├── inspector/    # Checkpoint scans and cryptographic QR verification
│   │   ├── maps/         # Barangay boundaries, hog census surveys, density aggregations
│   │   ├── ocr/          # PaddleOCR & OCR.space pipeline and regulatory parsers
│   │   ├── payment/      # PayMongo checkout, payment countdowns, cash logs
│   │   ├── permits/      # Core application, verification, OPV workflow, document locking
│   │   └── sms/          # Android SMS Gateway integration
│   ├── config/           # Django settings, root URLs, DRF DefaultRouter
│   ├── requirements/     # Python dependency specs
│   └── scripts/          # Realistic operation seeders
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI widgets and layout shells
│   │   ├── hooks/        # React Query hooks for permits, surveys, payments
│   │   ├── lib/          # Axios client with auto-refresh interceptors
│   │   ├── pages/        # Portals: farmer, agri, opv, inspector, barangay, landing
│   │   ├── routes/       # Protected router configuration
│   │   └── store/        # Zustand auth context store
│   └── package.json
└── README.md
```
