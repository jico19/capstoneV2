# LivestockPass Primary Tech Stack

This audit focuses on the intentional architectural choices and primary libraries used in the LivestockPass project, excluding standard built-in dependencies.

## Backend (Django)

### Core Framework
- **Django 6.0 & DRF:** The backbone of the API and administrative system.
- **SimpleJWT:** Chosen for secure, token-based authentication.

### Background & Integration
- **Django Tasks (DB Backend):** Used for reliable background processing (SMS, PDF generation) without the complexity of Celery.
- **Android SMS Gateway:** Specific integration for sending mobile notifications.
- **Paymongo:** Integrated via custom service for processing permit payments.

### Document & Data Processing
- **ReportLab:** Engine for generating official PDF permits.
- **QRCode:** Generates secure, scannable codes for transport validation.
- **Pillow:** Handles image processing for submitted documentation.
- **Pandas/NumPy:** Utilized for analyzing survey data and generating reports.

### Testing
- **Model Bakery:** The primary tool for generating smart test data and mock objects.

---

## Frontend (React)

### Core Stack
- **React 19:** Utilizing the latest React features and performance improvements.
- **Vite:** Modern build tool and development server.
- **Tailwind CSS 4 & DaisyUI:** The utility-first styling stack used for the "LivestockPass" design system.

### State & Networking
- **Zustand:** Lightweight client-side state management.
- **TanStack Query (v5):** Robust server-state management, caching, and synchronization.
- **Axios:** Standard HTTP client for backend communication.

### Specialized UI & Tools
- **MapLibre GL:** High-performance mapping engine for geospatial features.
- **Shadcn UI:** Accessible, customizable component primitives.
- **Lucide React:** The primary iconography system.
- **Html5-QRCode:** Browser-based scanning for inspector validation.
- **React Hook Form:** Handles complex form state and validation.
