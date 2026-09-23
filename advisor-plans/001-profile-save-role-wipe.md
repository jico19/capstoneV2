# Plan 001: Profile save must not overwrite role / verification status

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving to the next step. If anything
> in the "STOP conditions" section occurs, stop and report — do not improvise. When
> done, update the status row for this plan in `advisor-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 8ea30ba..HEAD -- backend/apps/api/serializers.py backend/apps/api/tests/test_user_views.py`
> If either file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as a
> STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: security / bug
- **Planned at**: commit `8ea30ba`, 2026-09-23
- **Issue**: —

## Why this matters

The user write serializer forces `role='Farmer'` and `verification_status='UNVERIFIED'`
on **every** save that is not made by an Admin/Agri pair supplying `role`. The Settings
page PATCHes only contact fields (never `role`), so any Barangay/OPV/Inspector/Agri who
saves their profile is silently demoted to `Farmer` and loses portal access; a VERIFIED
farmer who edits their profile becomes UNVERIFIED and is then refused when submitting
applications (`backend/apps/permits/views/application.py:85`). The bug is silent and
self-inflicted — a profile save destroys the account's privileges.

## Current state

`backend/apps/api/serializers.py:77-101` — this serializer is used for create (public
registration, `UserViewSet.get_permissions()` returns `[]` for `"create"`) AND for
`update`/`partial_update` (Settings page PATCH via `frontend/src/hooks/useProfile.js:22`).

```python
def validate(self, attrs):
    request = self.context.get('request')
    user = request.user if request else None

    if not user or not user.is_authenticated or user.role not in ['Admin', 'Agri']:
        attrs['role'] = 'Farmer'
    else:
        role = attrs.get('role')
        if role:
            if user.role == 'Agri' and role not in ['Farmer', 'Barangay']:
                raise serializers.ValidationError({"role": "Agri can only register Farmers and Barangay Officials."})
        else:
            attrs['role'] = 'Farmer'

    # KYC state is owned by the verify flow, never by the client.
    if attrs.get('role') != 'Farmer':
        attrs['verification_status'] = models.User.VerificationStatus.VERIFIED
    else:
        attrs['verification_status'] = models.User.VerificationStatus.UNVERIFIED
    attrs['is_active'] = True

    return attrs

def create(self, validated_data):
    return models.User.objects.create_user(**validated_data)
```

Repo conventions:
- Role strings are exact Django choices: `Admin`, `Farmer`, `Inspector`, `Opv`, `Agri`, `Barangay` (see `backend/apps/api/migrations/0010_alter_user_role.py`).
- Regression tests for this viewset live in `backend/apps/api/tests/test_user_views.py` (already exercises role assignment on create at lines ~138-322). Follow its structure: APIClient, force_authenticate, assert on returned/DB state.
- Serializers distinguish create vs update via `self.instance is None` — the standard DRF idiom already used elsewhere in this file's siblings.

## Commands you will need

| Purpose   | Command                                      | Expected on success |
|-----------|----------------------------------------------|---------------------|
| Django check | `python manage.py check` (from `backend/`) | exit 0, no errors |
| Tests     | `python -m pytest apps/api/tests/test_user_views.py` | all pass |
| Full API tests | `python -m pytest apps/api/tests/` | all pass |

Note: tests need a running PostgreSQL matching `backend/.env` (settings default to `config.settings.base`; sqlite is not usable — see AGENTS.md).

## Suggested executor toolkit

None required. Read `backend/apps/api/tests/test_user_views.py` before writing the new tests and match its style.

## Scope

**In scope** (the only files you should modify):
- `backend/apps/api/serializers.py`
- `backend/apps/api/tests/test_user_views.py` (add tests only — do not rewrite existing ones)

**Out of scope** (do NOT touch, even though they look related):
- `backend/apps/api/viewsets.py` — the `verify_documents` action legitimately owns KYC state; do not change it.
- The `documents` action (`UserViewSet.documents`).
- Any frontend file — the Settings page PATCH payload is correct; the bug is server-side.
- Any migration. This is a pure serializer behavior change; no schema change.

## Git workflow

- Branch: `advisor/001-profile-save-role` (repo uses one-line lowercase commit messages; match that).
- Commit once after tests pass. Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Distinguish create vs update in `validate`

In `backend/apps/api/serializers.py`, replace the body of `validate` with logic that branches on `self.instance is None`:

- **Create** (`self.instance is None`): preserve exactly the current behavior — default untrusted actors to `Farmer`, enforce the Agri-only-Farmers-and-Barangays rule, default KYC, set `is_active=True`. This keeps public registration working.
- **Update** (instance exists): a plain profile PATCH must never mutate `role`, `verification_status`, or `is_active`.
  - If the requesting user is authenticated AND `role in ['Admin', 'Agri']` AND `role` was explicitly supplied in `attrs`, keep the supplied `role` (trusted staff role reassignment).
  - Otherwise `attrs.pop('role', None)`.
  - Always `attrs.pop('verification_status', None)` and `attrs.pop('is_active', None)` on update — neither is owned by a profile save regardless of role.

Target shape:

```python
def validate(self, attrs):
    request = self.context.get('request')
    user = request.user if request else None
    is_create = self.instance is None

    if is_create:
        if not user or not user.is_authenticated or user.role not in ['Admin', 'Agri']:
            attrs['role'] = 'Farmer'
        else:
            role = attrs.get('role')
            if role:
                if user.role == 'Agri' and role not in ['Farmer', 'Barangay']:
                    raise serializers.ValidationError({"role": "Agri can only register Farmers and Barangay Officials."})
            else:
                attrs['role'] = 'Farmer'
        attrs['verification_status'] = (
            models.User.VerificationStatus.VERIFIED
            if attrs.get('role') != 'Farmer'
            else models.User.VerificationStatus.UNVERIFIED
        )
        attrs['is_active'] = True
    else:
        # A profile save must never mutate privilege or KYC state.
        if not (user and user.is_authenticated and user.role in ['Admin', 'Agri'] and attrs.get('role')):
            attrs.pop('role', None)
        attrs.pop('verification_status', None)
        attrs.pop('is_active', None)

    return attrs
```

**Verify**: `python manage.py check` → exit 0.

### Step 2: Add regression tests in `test_user_views.py`

Model your tests on the existing helpers in `backend/apps/api/tests/test_user_views.py` (APIClient + `client.force_authenticate(user)`). Add these cases:

1. **Barangay profile PATCH preserves role** — create a `Barangay` user, PATCH `/user/{id}/` with `{"first_name": "New"}`, assert DB role is still `Barangay` and `verification_status` unchanged.
2. **VERIFIED farmer profile PATCH preserves KYC** — create a verified `Farmer` (`verification_status="VERIFIED"`), PATCH `/user/{id}/` with `{"phone_no": "09xxxxxxxxx"}`, assert status still `VERIFIED`.
3. **Public registration still forces Farmer** — unauthenticated `POST /user/` with `role='Barangay'` still results in a `Farmer` (current behavior preserved).
4. **Agri/Admin can still assign roles on create** — existing test coverage already asserts this (lines ~258-322); make sure those still pass unchanged.

**Verify**: `python -m pytest apps/api/tests/test_user_views.py` → all pass, including the new cases.

## Test plan

- New tests: the four cases above in `backend/apps/api/tests/test_user_views.py`.
- Structural pattern: `backend/apps/api/tests/test_user_views.py` (existing create-role tests).
- Verification: `python -m pytest apps/api/tests/test_user_views.py` then `python -m pytest apps/api/tests/` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `python manage.py check` exits 0
- [ ] `python -m pytest apps/api/tests/` exits 0
- [ ] The four new regression tests above exist and pass
- [ ] `git status` shows only `backend/apps/api/serializers.py` and `backend/apps/api/tests/test_user_views.py` modified
- [ ] No migration file created
- [ ] `advisor-plans/README.md` status row for 001 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at `backend/apps/api/serializers.py:77-98` doesn't match the "Current state" excerpt (codebase has drifted).
- Any existing test in `test_user_views.py` breaks as a result of this change *other than* the expected behavior difference (i.e. a test asserting that a profile PATCH demotes a user) — that indicates a hidden caller relies on the bug; report, don't work around it.
- The Settings page or any other PATCH caller is found to send `role` and actually depend on it being applied — that's a scope change.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- If a future feature lets staff edit roles/verification from the UI, that must go through a dedicated admin serializers/action, not through this generic write serializer — keep the update branch free of KYC/role defaulting.
- The `else` branch must never start re-defaulting `verification_status`; the `verify_documents` action in `api/viewsets.py` is the only owner of KYC state.
- Reviewer focus: confirm the create branch is byte-for-byte equivalent to the old behavior (public registration is the regressions risk), and that `attrs.pop` on update cannot silently drop a field the caller needs (only the three privileged fields are popped).