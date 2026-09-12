# AGENTS.md

FarmPass: farm/hog livestock transport permit system for Sariaya Municipal Agriculture Office.

## Layout & stack

- `backend/` — Django 6.0 + DRF (Python 3.14). Apps under `backend/apps/`: `api` (custom `User`, notifications, `AuditTrail`), `permits` (core application→OPV→issue workflow), `payment` (PayMongo), `ocr`, `documents`, `dashboard`, `inspector` (QR scans), `sms`, `maps` (barangay, hog survey).
- `frontend/` — React 19 + Vite + Tailwind v4 + daisyUI 5. No frontend test suite; lint only.
- Root `*.MD` files are the living specs (e.g. `AUTO_AIC_OPV_SPEC.MD`, `BARANGAY_ENDORSEMENT_SPEC.md`, `RAG_Insights_Spec.MD`) — read them before touching those areas.

## Commands

Backend (venv: `backend\venv`, activate via `backend\venv\Scripts\Activate.ps1`; always run from `backend/`):

- run: `python manage.py runserver 8000` — settings default to `config.settings.base` (set in `manage.py`); `config.settings.prod` is for Render + Cloudinary.
- tests: `python -m pytest` — `pytest.ini` sets `DJANGO_SETTINGS_MODULE=config.settings.base`, `testpaths=apps`. The DB is **PostgreSQL** (`backend/apps/../config/settings/base.py`), so tests need a running Postgres matching `backend/.env` — sqlite is not usable. Focused: `python -m pytest apps/permits/tests/test_workflow.py::TestPermitWorkflow::test_full_workflow`.
- seed demo data: `python manage.py runscript seed_realistic_operations` (django_extensions `runscript`; scripts live in `backend/scripts/`). Seeded accounts: `TEST_CREDENTIALS.txt`, all passwords `password123`.
- migrations: standard `makemigrations` / `migrate` per app.

Frontend:

- dev: `npm install` then `npm run dev` (Vite, port 5173). `npm run lint` = eslint.

## Environment

- `backend/.env`: `SECRET_KEY`, `DEBUG`, `DB_NAME/USER/PASSWORD/HOST/PORT`, plus service keys: `OCR_API_URL/KEY`, `PAYMONGO_*`, `SMS_*`, `GEMINI_API_KEY`, Cloudinary (prod only).
- `frontend/.env`: `VITE_BASE_URL=http://127.0.0.1:8000` — **no `/api` suffix**. App viewsets are mounted at the root of `backend/config/urls.py`, so endpoints are `/login/`, `/user/me/`, `/application/`, `/opv/`, `/payment/` etc. Only `/admin/`, `/dashboard/`, and `/api/health-check/` live under prefixes. (`TEST_CREDENTIALS.txt` showing `.../api/` is stale.)

## Architecture notes

- Every app's viewsets are registered in `backend/config/router.py` (DRF `DefaultRouter`) — add new resources there.
- JWT: SimpleJWT with custom serializers that embed `role`/`barangay` into the access token; frontend `atob()`-decodes it to branch on role. Access 5 min, refresh 1 day with rotation. Frontend auto-refreshes via interceptor in `frontend/src/lib/api.js`, which reads tokens from **sessionStorage** key `auth-context` (zustand persist — don't switch to localStorage).
- UI portals are keyed by role under `frontend/src/pages/`: `farmer`, `agri`, `opv`, `inspector`, `barangay`, `auth`, `landing-page` (public), `shared`. Routing in `frontend/src/routes/`.
- Workflow actions (approve/reject/validate) follow a fixed pattern — see `backend/apps/permits/services/opv.py`: check `staff.role`, guard current status, wrap in `transaction.atomic()`, then create a formal `AuditTrail` entry.
- DRF defaults: `LimitOffsetPagination` with `PAGE_SIZE=10`; throttling `anon 10/min`, `user 100/min` — heavy bulk seeding or load testing can trip the limits.