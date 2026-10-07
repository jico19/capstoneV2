# Frontend Dead Code & Unused Assets Removal Specification

- **Target Directory**: `frontend/src/`
- **Specification Status**: Ready for Review / Execution
- **Verification Commands**: `cmd /c npm run lint`, `cmd /c npm run build` (from `frontend/`)

---

## 1. Objectives & Scope

Clean up technical debt, bundle overhead, and dead code across the React 19 frontend codebase without breaking running features:
1. Eliminate orphaned files, test files without runners, and abandoned asset trees.
2. Resolve active runtime bugs discovered during scan (undeclared prop `noVariant`, illegal ref accesses during render).
3. Deduplicate duplicate import statements inside single files.
4. Remove 56 unused imports across 30 files.
5. Standardize verification with ESLint and Vite build gates.

---

## 2. Catalog of Dead Files & Unreferenced Assets

### A. Orphaned Files & Subtrees
| File Path | Classification | Current State | Removal Action & Impact |
| :--- | :--- | :--- | :--- |
| `frontend/src/hooks/useHogSurveys.js` | Dead Hook | 0 imports. Duplicate of queries in `HogSurveyPage.jsx`. | **Delete**. Saves 75 lines of redundant code. |
| `frontend/src/lib/__tests__/region4a.test.js` | Isolated Unit Test | Uses `node:test`. No frontend test runner exists (`npm run lint` only). | **Delete or Move**. Saves clutter from unsupported test runner. |
| `frontend/src/pages/opv/Analytics/OpvAnalytics.jsx` | Orphaned Page | 0 imports in router or codebase. | **Decision**: If unneeded, delete. If needed, register at `/opv/analytics` in router. |
| `frontend/src/pages/landing-page/About/sections/AboutTeam.jsx` | Inactive Subtree | Commented out in `about.jsx` line 13 (`{/* <AboutTeam /> */}`). | **Delete**. Removes orphaned developer section. |
| `frontend/src/components/ui/LandingProfilecard.jsx` | Inactive Component | Only imported by `AboutTeam.jsx`. | **Delete**. Dependent on `AboutTeam.jsx`. |
| `frontend/src/assets/about-icons/itachi.jpg` | Inactive Asset | Only referenced in `AboutTeam.jsx`. | **Delete**. Bundle size optimization. |
| `frontend/src/assets/about-icons/shizuku.jpg` | Inactive Asset | Only referenced in `AboutTeam.jsx`. | **Delete**. Bundle size optimization. |
| `frontend/src/assets/about-icons/toji.jpg` | Inactive Asset | Only referenced in `AboutTeam.jsx`. | **Delete**. Bundle size optimization. |

### B. Unreferenced Legacy Navbar Assets
Path: `frontend/src/assets/user-dashboard/navbar-icons/`  
Reason: The UI migrated to `lucide-react` icons in `Sidebar.jsx`. 0 files reference these raster/vector files.  
Files to delete:
- `dashboard.png`
- `history.png`
- `logout.png`
- `messages.png`
- `my-application.png`
- `my-permits.png`
- `new-application.png`
- `notification.svg`
- `tracking-icon.svg`

---

## 3. Catalog of Runtime Bugs & Dead Variables

| Location | Issue | Root Cause | Fix |
| :--- | :--- | :--- | :--- |
| `src/components/ui/ConfirmationModal.jsx:80` | `ReferenceError: noVariant is not defined` | `noVariant` used in `switch(noVariant)` in `getNoButtonClass` but omitted from destructured props. | Destructure `noVariant = 'danger'` in props on line 25. |
| `src/pages/landing-page/FAQs/sections/FAQsAccordion.jsx:108` | `Cannot access refs during render` | `bodyRef.current?.scrollHeight` read inside JSX render style object. | Use CSS grid transition (`grid-template-rows: 1fr / 0fr`) or measure height via `useEffect`. |
| `src/pages/agri/Map/DensityMap/MapDataHandler.jsx:45` | Cascading render loop | `setSelectedId(item.id)` called synchronously in `useEffect`. | Move selection state updates into map interaction event handlers. |
| `src/pages/agri/Map/DensityMap/MapDataHandler.jsx:295` | Dead calculation | `getDensityColor` function declared and assigned but never invoked. | Delete unused function. |
| `src/components/ui/LandingButton.jsx:13` | Unused state variable | `const [pressed, setPressed] = useState(false)` — `pressed` is never read. | Remove `pressed` state or wire to `aria-pressed`. |

---

## 4. Catalog of Duplicate Imports

| File Path | Duplicate Source | Lines | Resolution |
| :--- | :--- | :--- | :--- |
| `src/pages/farmer/Dashboard/DownloadApplication.jsx` | `react-router-dom` | Lines 1 & 11 | Combine: `import { useParams, Link } from "react-router-dom";` |
| `src/pages/farmer/Dashboard/FarmerDashboard.jsx` | `lucide-react` | Lines 1 & 16 | Merge all icon symbols into a single import statement on Line 1. |
| `src/pages/farmer/Dashboard/FarmerDashboard.jsx` | `react-router-dom` | Lines 11 & 18 | Combine: `import { Link, useNavigate } from 'react-router-dom';` |

---

## 5. Catalog of Unused Imports (56 Total)

### Group 1: Routing & Shared UI Components
1. `src/routes/index.jsx`: Remove `Navigate` (line 1).
2. `src/components/ui/ApplicationTracker.jsx`: Remove `Clock`, `AlertCircle`, `Circle` (line 2).
3. `src/components/ui/AuditDetailModal.jsx`: Remove `ShieldCheck`, `Calendar` (line 2).
4. `src/components/ui/MobileNavbar.jsx`: Remove `Bell` (line 3).
5. `src/components/ui/SmartInsights.jsx`: Remove `ArrowRight`, `SlidersHorizontal`, `Layers` (line 2).

### Group 2: Agri Portal
1. `src/pages/agri/Applications/ApplicationDashboard.jsx`: Remove `FileText` (line 2).
2. `src/pages/agri/Audit/AuditTrailPage.jsx`: Remove `Filter`, `Eye` (line 3).
3. `src/pages/agri/BarangayOfficialManagementPage.jsx`: Remove `User` (line 5).
4. `src/pages/agri/Map/DensityMap/MainMap.jsx`: Remove `useEffect`, `useState`, `useMap`, `MapPopup` (lines 1–2).
5. `src/pages/agri/Payment/AgriPaymentPage.jsx`: Remove `AlertCircle`, `Download`, `FileText`, `ArrowUpDown` (line 3).
6. `src/pages/agri/Payment/TransactionDetailModal.jsx`: Remove `AlertCircle`, `Building2` (line 2).
7. `src/pages/agri/Map/DensityMap/MapDataHandler.jsx`: Remove `ArrowRight` (line 3).

### Group 3: Farmer Portal
1. `src/pages/farmer/Applications/FarmerInfo.jsx`: Remove `Trash2` (line 3).
2. `src/pages/farmer/Applications/ResubmitApplication.jsx`: Remove `ArrowRight` (line 6).
3. `src/pages/farmer/Applications/UploadDocument.jsx`: Remove `FileCheck` (line 2).
4. `src/pages/farmer/Dashboard/DownloadApplication.jsx`: Remove `Download` (line 5).
5. `src/pages/farmer/Dashboard/FarmerDashboard.jsx`: Remove `ShieldCheck` (line 16).
6. `src/pages/farmer/Dashboard/FarmerApplicationDashboard.jsx`: Remove `ActionGroup` (line 15).
7. `src/pages/farmer/Notification/NotificationPage.jsx`: Remove `CheckCircle2`, `AlertTriangle`, `Info`, `ChevronRight` (line 2).
8. `src/pages/farmer/Payments/PaymentCheckout.jsx`: Remove `CheckCircle2`, `Banknote` (line 3).
9. `src/pages/farmer/Verification/DocumentVerificationPage.jsx`: Remove `FileText`, `Calendar` (line 5).

### Group 4: Inspector & OPV Portals
1. `src/pages/inspector/Application/VerifyApplication.jsx`: Remove `Calendar`, `ExternalLink`, `CreditCard`, `Info`, `Check`, `Clock` (line 4).
2. `src/pages/inspector/Dashboard/InspectionHistory.jsx`: Remove `FileText` (line 4).
3. `src/pages/inspector/Dashboard/InspectorDashboard.jsx`: Remove `Clock` (line 1).
4. `src/pages/opv/Application/OpvApplicationDashboard.jsx`: Remove `Filter` (line 2).
5. `src/pages/opv/Application/OPVApprovalControl.jsx`: Remove `CheckCircle2` (line 2).
6. `src/pages/opv/Dashboard/OpvDashboard.jsx`: Remove `TrendingUp`, `FileSignature`, `ArrowRight`, `AlertTriangle` (line 1).

### Group 5: Hooks & Auth
1. `src/hooks/usePayment.jsx`: Remove `useQueryClient` (line 2).
2. `src/pages/auth/LoginPage.jsx`: Remove `ShieldCheck` (line 4).

---

## 6. Implementation Phasing & Safety Verification

### Phase 1: Bug & Syntax Remediation (Estimated: 5 mins)
- Fix `ConfirmationModal.jsx` missing `noVariant` prop.
- Fix `FAQsAccordion.jsx` render ref violation.
- Fix `MapDataHandler.jsx` effect loop & dead `getDensityColor`.
- Fix `LandingButton.jsx` unused `pressed` state.
- **Verification**: `cmd /c npm run lint` must show 0 runtime/syntax violations in these files.

### Phase 2: Duplicate Imports Consolidation (Estimated: 3 mins)
- Deduplicate `react-router-dom` in `DownloadApplication.jsx`.
- Deduplicate `lucide-react` and `react-router-dom` in `FarmerDashboard.jsx`.
- **Verification**: Check files for clean single import blocks per package.

### Phase 3: Unused Imports Cleanup (Estimated: 8 mins)
- Clean all 56 unused imports across Groups 1 through 5.
- **Verification**: Run `cmd /c npm run lint` to verify reduced problem count down to 0.

### Phase 4: Dead File & Asset Tree Pruning (Estimated: 4 mins)
- Remove `useHogSurveys.js`.
- Remove `region4a.test.js`.
- Clean commented `{/* <AboutTeam /> */}` from `about.jsx`.
- Delete `AboutTeam.jsx`, `LandingProfilecard.jsx`, and `itachi.jpg`, `shizuku.jpg`, `toji.jpg`.
- Delete `src/assets/user-dashboard/navbar-icons/`.
- Handle `OpvAnalytics.jsx` based on user routing preference.
- **Verification**: Run `cmd /c npm run build` to confirm Vite bundler resolves all remaining assets and routes without error.

---

## 7. Rollback Plan
All modifications are tracked in Git. Should any regression occur during execution:
```powershell
git checkout HEAD -- frontend/src/
git clean -fd frontend/src/
```
