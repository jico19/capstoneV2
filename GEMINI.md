# 🐖 FarmPass — Project Context & AI Instructions

Senior Fullstack Engineer context for **FarmPass**, the Digital Permit & Hog Management System for the Sariaya Municipal Agriculture Office.

## 🏗️ Project Overview
FarmPass is a modern, paperless platform for managing livestock transport permits, document verification, and hog population analytics.

- **Backend:** Django 6.0.3 + Django REST Framework (DRF) 3.17.1
- **Frontend:** React 19.2.4 + Vite 8.0.4 + Tailwind CSS 4.2.2 + DaisyUI 5.5.19
- **Key Features:** 
    - **OCR:** Automated document reading (Azure/Custom API).
    - **Payments:** Online (PayMongo) and walk-in support.
    - **Verification:** Secure QR code generation and mobile scanning.
    - **Analytics:** ML-based density predictions and interactive Leaflet/MapLibre maps.
- **User Roles:** `Farmer`, `Agri` (Agriculture Officer), `Opv` (Veterinary Staff), `Inspector`.

## 🛠️ Development Setup & Commands

### Backend (Django)
- **Run Server:** `python manage.py runserver`
- **Migrations:** `python manage.py makemigrations` / `python manage.py migrate`
- **Testing:** `pytest` (Uses `pytest-django`)
- **App Root:** `backend/apps/`
- **Key Config:** `backend/config/settings.py`

### Frontend (React)
- **Dev Server:** `npm run dev` (run from `frontend/` directory)
- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **State:** Zustand
- **Query:** TanStack Query (React Query)
- **UI Base:** `shadcn`, `daisyui` (Customized via Tailwind)

## 📁 Project Structure (Key Directories)
- `backend/apps/api`: Custom User model, notifications, and audit trails.
- `backend/apps/permits`: Core logic for permit applications, validations, and issuance.
- `backend/apps/maps`: Geospatial data for barangays and hog surveys.
- `backend/apps/ocr`: Document processing services.
- `frontend/src/components`: UI components (follows `Design.MD` standards).
- `frontend/src/hooks`: Data fetching and business logic hooks.

---

## 🎭 Step 1: Identify Task Mode

Classify request into mode. Each mode has different behavior. Do not apply code task rules to non-code tasks.

### Mode A — Question / Audit / Discussion
Trigger: developer ask question, not code output.
Examples: "what libraries used?", "is pattern okay?", "why slow?", "audit deps", "explain this"

**How to respond:**
- Answer direct/clear — no reference project files first
- Use plain language
- Give honest assessment, brief reasoning
- Say plainly if wrong/better
- Skip code standards, structure rules, post-gen summaries
- Show code only if help illustrate answer

### Mode B — Code Task (Generate / Fix / Add)
Trigger: developer ask write/fix/add.
Examples: "write test", "fix bug", "add error handling", "build component", "add endpoint"

**How to respond:**
- Read project files first
- Apply code style rules
- Follow task-specific rules
- Include plain English summary after code

### Mode C — Mixed (Question + Possible Code)
Trigger: developer ask question, code output may help.
Examples: "how structure this?", "best way handle X?"

**How to respond:**
- Answer question first, plain language
- Ask before generate code
- Don't generate unasked code

---

## 🎨 Code Style Rules (Mode B Only)

### Keep Code Readable
- Use **clear, descriptive names** — no single letters/abbreviations unless universal (`id`, `pk`, `req`, `res`).
- Keep functions short — split if doing >1 thing.
- Avoid deep nesting — refactor if >3 levels deep.
- Break complex conditions into named variables for clarity.

### Write Comments That Actually Explain
- Every function/class/block must have a comment. 
- Explain **why exists** or **what does** in plain English. 
- Explain like a junior dev: smart but new.

### Explain What You Generated (After Every Code Task)
Include short **plain English summary** after generating code:
1. What code does.
2. Why structured that way.
3. Important details before use.

### Never Generate Code That Is Hard to Follow
- No one-liners cramming too much logic.
- No chained method calls >2 levels deep.
- No magic numbers — name them (e.g., `LARGE_SHIPMENT_THRESHOLD = 50`).
- No unused imports or commented-out old code.

---

## 🧪 Task: Generate Tests (Mode B)
- Use `pytest-django` with `APIClient`.
- Cover 4 roles per endpoint (`Farmer`, `Agri`, `Opv`, `Inspector`).
- Auth checks: Correct role → 200/201, Wrong role → 403, Unauthenticated → 401.
- Use `factory_boy` for data generation.
- Shared fixtures: `farmer_client`, `agri_client`, `opv_client`, `inspector_client`.
- Structure: **Arrange / Act / Assert**.

---

## 🏗️ Task: Frontend Components (Mode B)

### Design Style (Ref: Design.MD)
- **Philosophy:** High-signal minimalism, pure white canvas, square edges.
- **Edges:** Always `rounded-none`. No exceptions.
- **Shadows:** No shadows ever. Use `1px solid #e7e5e3` (stone-200) borders for structure.
- **Colors:** Primary: `green-700` (#15803d), Neutrals: `stone-*` scale (never use cold gray).
- **Typography:** Titles are `text-3xl font-black uppercase tracking-tighter`.
- **Icons:** `lucide-react` only. Size 16 (inline) or 20 (standalone).

### Component Rules
- Styling: Tailwind 4 + DaisyUI 5.
- No DaisyUI colors — always override with Tailwind (e.g., `bg-green-700` not `btn-primary`).
- Data via props/handlers (`onSubmit`, `onClick`, `onChange`).
- No data fetch or API calls inside UI components (use hooks).
- Forms: Accept `register`, `errors`, `onSubmit` as props.

---

## 📢 Plain Language in UI Copy
UI text must be simple and farmer-focused. Avoid technical jargon.

| Technical/Formal | Plain English (Use these) |
|---|---|
| Submit Application | Send Request |
| Authenticate | Log In |
| Request Denied | Your request was not approved |
| Unauthorized | You don't have permission to do this |
| Upload Document | Attach File |
| Processing | Please wait... |

---

## 🛡️ General Rules (All Modes)
- **No breaking functionality.**
- **Follow established naming conventions.**
- **No unnecessary dependencies.**
- **Ask if unsure about business logic or role permissions.**
