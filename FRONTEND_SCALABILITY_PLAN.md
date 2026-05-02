# Frontend Refactoring & Scalability Plan - LivestockPass

To ensure the project remains maintainable as it grows, we should move from a "type-based" structure to a "feature/domain-based" structure. This reduces cognitive load and makes it easier to locate related files.

## 1. Directory Structure Refactoring

### Proposed Folder Structure
```text
src/
├── api/              # Raw API definitions (Axios/Fetch instances)
│   ├── services/      # Service classes (ApplicationService, PaymentService)
├── components/
│   ├── ui/           # Atomic components (Buttons, Inputs, Modals)
│   ├── shared/       # Shared business components (StatusBadge, Sidebar)
├── constants/        # Centralized constants (Roles, Statuses, API Endpoints)
├── features/         # Logic grouped by domain
│   ├── permits/      # Everything related to Permit Application
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── maps/         # Leaflet logic and map components
├── layouts/          # Role-based layouts (FarmerLayout, AgriLayout)
├── pages/            # View components (should be thin, delegating to features)
├── utils/            # General helpers (Date formatting, Currency)
```

## 2. Decoupling Logic (The Service Layer)
Currently, logic might be mixed in hooks. We should separate them:
1. **Services (`src/api/services/`):** Pure functions that call the backend. No React logic.
2. **Hooks (`src/hooks/` or `src/features/X/hooks/`):** React-aware logic (TanStack Query, State) that calls Services.
3. **Components:** Purely for UI, receiving data from hooks.

## 3. Configuration-Driven Navigation
Instead of a large `switch` statement in `Sidebar.jsx`, use a config object. This makes it easier to add new roles or items without touching the component logic.

```javascript
// src/constants/navigation.js
export const NAV_ITEMS = {
  FARMER: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/farmer' },
    { label: 'My Permits', icon: Files, to: '/farmer/permits' },
  ],
  AGRI: [ ... ],
};
```

## 4. Layout Abstraction
Create role-specific Layout components. This allows you to change the "Shell" (Sidebar, Navbar, Footer) for an entire role in one place.
- `src/layouts/DashboardLayout.jsx`
- `src/layouts/PublicLayout.jsx`

## 5. Centralized State & Constants
- **Statuses:** Use a constant for Permit Status (`STATUS.PENDING`, `STATUS.APPROVED`) instead of hardcoded strings like `"PENDING"`. This prevents typos from breaking the app.
- **Permissions:** Move RBAC logic into a utility or a custom hook (`usePermission`) to easily hide/show UI elements based on roles.

## 6. CSS Management
- Continue using **Tailwind CSS** but avoid "Utility Soup". 
- Create small, reusable UI primitives in `src/components/ui/` to keep page components clean.
- Stick to the "No Shadows, No Gradients" rule from `GEMINI.md`.
