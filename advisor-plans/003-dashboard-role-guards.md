# Plan 003: Dashboard endpoints — role guards

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving to the next step. If anything
> in the "STOP conditions" section occurs, stop and report — do not improvise. When
> done, update the status row for this plan in `advisor-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 8ea30ba..HEAD -- backend/apps/dashboard/views.py backend/apps/dashboard/urls.py backend/apps/dashboard/services.py`
> If any in-scope file changed, compare the "Current state" excerpts against live code before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `8ea30ba`, 2026-09-23
- **Issue**: —

## Why this matters

`AgriDashboardView` and `OPVDashboardView`/`OPVAnalyticsView` are `IsAuthenticated`-only
but their service functions aggregate **system-wide** LGU data — revenue totals, transport
volume, status distribution, rejection rates (`backend/apps/dashboard/services.py:10-69,118-206`).
Any Farmer (or any logged-in user) can pull the municipality's sensitive operational analytics.
`DashboardInsightsView`/`DashboardInsightsRefreshView` additionally accept an arbitrary
`role` from the client (`views.py:83,96`) and will generate/return insights for whatever role
the caller names.

## Current state

`backend/apps/dashboard/views.py` (whole file, 100 lines) — every view is:

```python
class AgriDashboardView(views.APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        from .services import get_agri_dashboard_data
        data = get_agri_dashboard_data()
        return Response(data, status=status.HTTP_200_OK)
```

`OPVDashboardView`, `OPVAnalyticsView` (delegates to `OPVDashboardView`), and
`DashboardInsightsView`/`DashboardInsightsRefreshView` all follow the same
`[IsAuthenticated]` pattern. `FarmerDashboardView` and `InspectorDashboardView` pass
`request.user` into their services (already scoped) — leave those two alone.

Routes: `backend/apps/dashboard/urls.py` → `agri-metrics/`, `opv-metrics/`, `opv-analytics/`, `insights/`, `insights/refresh/`, plus `farmer-metrics/`, `inspector-metrics/`.

Role values are Django choices: `Admin`, `Farmer`, `Inspector`, `Opv`, `Agri`, `Barangay`
— note the OPV role string is exactly **`'Opv'`** (capital O, lowercase `pv`, see
`backend/apps/api/migrations/0010_alter_user_role.py`).

## Commands you will need

| Purpose   | Command                                      | Expected on success |
|-----------|----------------------------------------------|---------------------|
| Django check | `python manage.py check` (from `backend/`) | exit 0 |
| Tests     | `python -m pytest apps/permits/tests/test_security.py` (or the app's existing test dir) | all pass |

Tests need PostgreSQL. There is no existing `apps/dashboard/tests/` module in the test dirs list at plan time — create `backend/apps/dashboard/tests/` with `__init__.py` and a `test_roles.py` if one is absent.

## Suggested executor toolkit

None required. Match the DRF permission style already used in `backend/apps/api/viewsets.py` (custom permission on an action) and the test conventions in `backend/apps/permits/tests/test_security.py`.

## Scope

**In scope**:
- `backend/apps/dashboard/views.py`
- `backend/apps/dashboard/tests/` (create `__init__.py` + `test_roles.py` if no tests dir exists)

**Out of scope**:
- `backend/apps/dashboard/services.py` — data aggregation is fine; only the auth gate is missing. Do not restructure aggregation.
- `FarmerDashboardView` and `InspectorDashboardView` — already user-scoped.
- The insights engine (`dashboard/insights_engine.py`) and its serializers.
- Any frontend file.

## Git workflow

- Branch: `advisor/003-dashboard-role-guards`.
- Commit once after tests pass. Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add a reusable role permission

At the top of `backend/apps/dashboard/views.py` (after the existing imports), add:

```python
from rest_framework.permissions import BasePermission

class RoleAllowed(BasePermission):
    """Allow only the roles listed in the view's ``allowed_roles``."""
    allowed_roles = ()

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) in view.allowed_roles
        )
```

**Verify**: `python manage.py check` → exit 0.

### Step 2: Wire role guards onto the system-wide views

Replace the `permission_classes = [IsAuthenticated]` line on each of these views and add `allowed_roles`:

- `AgriDashboardView` → `permission_classes = [RoleAllowed]`, `allowed_roles = ('Agri', 'Admin')`
- `OPVDashboardView` → `permission_classes = [RoleAllowed]`, `allowed_roles = ('Opv', 'Admin')`
- `OPVAnalyticsView` → `allowed_roles = ('Opv', 'Admin')`
- `DashboardInsightsView` → `permission_classes = [RoleAllowed]`, `allowed_roles = ('Admin', 'Agri', 'Opv', 'Inspector', 'Barangay')` and operate on the caller's own role only (see step 3)
- `DashboardInsightsRefreshView` → same `allowed_roles` as the insights view

**Verify**: `Select-String -Path backend/apps/dashboard/views.py -Pattern "permission_classes"` → the five system-wide views now show `[RoleAllowed]`.

### Step 3: Stop honoring a client-supplied role on the insights endpoints

In `DashboardInsightsView.get` and `DashboardInsightsRefreshView.post`, the current code reads:

```python
role = request.query_params.get('role') or getattr(request.user, 'role', 'Farmer')
```

Change both to **ignore** any client-supplied `role` and always operate on the authenticated user's own role:

```python
role = getattr(request.user, 'role', 'Farmer')
```

(The insight service already keys on the user — see `get_or_generate_insight(request.user, role, ...)`. Scoping to the caller's own role means the caller can only see the insight JSON their own role is mapped to.)

**Verify**: `Select-String -Path backend/apps/dashboard/views.py -Pattern "query_params.get\('role'\)|data.get\('role'\)"` → no matches.

### Step 4: Add role-matrix tests

Create `backend/apps/dashboard/tests/test_roles.py` (with `backend/apps/dashboard/tests/__init__.py`). Using the APIClient + `force_authenticate` pattern:

Calling `GET /dashboard/agri-metrics/`:
- `Farmer` → 403
- `Barangay` → 403
- `Opv` → 403
- `Agri` → 200
- `Admin` → 200

Calling `GET /dashboard/opv-metrics/`:
- `Farmer` → 403
- `Agri` → 403
- `Opv` → 200

Calling `GET /dashboard/insights/?role=Agri`:
- a `Farmer` → the response must NOT contain an Agri-labelled insight (assert the response reflects the user's own role — at minimum assert status is 200 and no server error; if the insight payload is inspectable, assert it is keyed to the `Farmer` role).

**Verify**: `python -m pytest apps/dashboard/tests/` → all pass.

## Test plan

- New tests: the role matrix in Step 4 in `backend/apps/dashboard/tests/test_roles.py`.
- Structural pattern: `backend/apps/permits/tests/test_security.py`.
- Verification: `python -m pytest apps/dashboard/tests/` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `python manage.py check` exits 0
- [ ] `python -m pytest apps/dashboard/tests/` exits 0
- [ ] The five system-wide views use `RoleAllowed` with the correct `allowed_roles`
- [ ] `insights`/`insights/refresh` no longer read `role` from the request (grep clean)
- [ ] `git status` shows only `backend/apps/dashboard/views.py` and the new test files
- [ ] `advisor-plans/README.md` status row for 003 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- A frontend page calls an insights endpoint with a cross-role `role` param and depends on the current behavior — that's a product decision to surface, not a workaround to encode.
- The exact OPV role string turns out to be different from `'Opv'` in the live database (check `User.objects.values_list('role', flat=True).distinct()` if unsure) — use the live value.
- Any in-scope file drifted from the excerpts.

## Maintenance notes

- New dashboard endpoints must declare `RoleAllowed` + `allowed_roles` explicitly; the default-permit style is a foot-gun.
- The insights endpoints are the ones most likely to be wired into a frontend feature toggle later — a reviewer should double-check the insights JSON isn't used cross-role anywhere.
- Deferred: scoping `get_agri_dashboard_data`/`get_opv_dashboard_data` to a user (they are system-wide by design for Agri/Opv/Admin) — out of scope here.