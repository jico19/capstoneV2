# Plan 002: Payment endpoints — explicit authz allowlist

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving to the next step. If anything
> in the "STOP conditions" section occurs, stop and report — do not improvise. When
> done, update the status row for this plan in `advisor-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 8ea30ba..HEAD -- backend/apps/payment/viewsets.py backend/apps/payment/services.py backend/apps/payment/tests/test_payment_security.py`
> If any in-scope file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `8ea30ba`, 2026-09-23
- **Issue**: —

## Why this matters

Three payment actions guard only against a *non-owning Farmer*: `checkout_session`,
`create_qrph_payment`, and `verify_paymongo_session` each block with `if role == 'Farmer' and not owner`. Every other authenticated role (`Inspector`, `Barangay`, `Opv`, `Admin`) passes the check and can initiate or observe payment sessions for **any** application. A single low-privilege but non-Farmer account becomes a way to read payment state and generate gateway sessions/QR codes for arbitrary permits. The fix replaces the deny-one-role pattern with an explicit allowlist.

## Current state

`backend/apps/payment/viewsets.py`:
```python
@action(detail=True, methods=['post'])
def checkout_session(self, request, pk=None):
    application = get_object_or_404(Permits.PermitApplication, pk=pk)
    # Ownership check
    if request.user.role == 'Farmer' and application.farmer != request.user:
        return Response({"error": "Unauthorized access to this application"}, status=status.HTTP_403_FORBIDDEN)
    ...
```
(the same two-line guard is duplicated at lines ~155 and ~180; `verify_paymongo_session` has it in `backend/apps/payment/services.py:206`).

`backend/apps/payment/services.py`:
```python
def verify_paymongo_session(application_pk: int, user):
    application = get_object_or_404(permits.PermitApplication, pk=application_pk)
    # Ownership check
    if user.role == 'Farmer' and application.farmer != user:
        raise PermissionDenied("Unauthorized access to this application")
    ...
```

A correct allowlist example already exists in the same file — `farmer_simulate_payment` (`services.py:342-355`): role + ownership both required, plus DEBUG gate. Note: `simulate_payment` (Agri-only) and `confirm_offline_payment` (Agri-only) already guard correctly — leave them alone.

Role values are Django choices: `Admin`, `Farmer`, `Inspector`, `Opv`, `Agri`, `Barangay` (see `backend/apps/api/migrations/0010_alter_user_role.py`).

## Commands you will need

| Purpose   | Command                                      | Expected on success |
|-----------|----------------------------------------------|---------------------|
| Django check | `python manage.py check` (from `backend/`) | exit 0 |
| Tests     | `python -m pytest apps/payment/tests/` | all pass |

Tests need PostgreSQL (settings default to `config.settings.base`; see AGENTS.md).

## Suggested executor toolkit

None required. Read `backend/apps/payment/tests/test_payment_security.py` before adding tests and match its style.

## Scope

**In scope**:
- `backend/apps/payment/viewsets.py`
- `backend/apps/payment/services.py`
- `backend/apps/payment/tests/test_payment_security.py` (or a new `test_payment_authz.py` if style favors it)

**Out of scope**:
- `simulate_payment` and `confirm_offline_payment` guard logic (already allowlisted).
- PayMongo behavior, webhooks, or anything about how payment state is computed.
- Any frontend file.

## Git workflow

- Branch: `advisor/002-payment-authz`.
- Commit once after tests pass. Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add a shared allowlist helper in viewsets

At module level in `backend/apps/payment/viewsets.py`, add:

```python
def _can_manage_payment(user, application):
    """Only the owning Farmer, or Agri/Admin staff, may manage payment sessions."""
    if user.role == 'Farmer':
        return application.farmer_id == user.id
    return user.role in ('Agri', 'Admin')
```

Use `application.farmer_id == user.id` rather than `application.farmer != user` to avoid loading the farmer relation.

**Verify**: `python manage.py check` → exit 0.

### Step 2: Replace the per-view guards with the helper

In `backend/apps/payment/viewsets.py`, replace both occurrences of

```python
if request.user.role == 'Farmer' and application.farmer != request.user:
    return Response({"error": "Unauthorized access to this application"}, status=status.HTTP_403_FORBIDDEN)
```

with

```python
if not _can_manage_payment(request.user, application):
    return Response({"error": "Unauthorized access to this application"}, status=status.HTTP_403_FORBIDDEN)
```

**Verify**: `Select-String -Path backend/apps/payment/viewsets.py -Pattern "role == 'Farmer' and application.farmer"` → no matches.

### Step 3: Apply the same rule inside the services

In `backend/apps/payment/services.py`, `verify_paymongo_session` takes `user` — replace its guard:

```python
if user.role == 'Farmer' and application.farmer != user:
    raise PermissionDenied("Unauthorized access to this application")
```

with

```python
is_owner_or_staff = (user.role == 'Farmer' and application.farmer_id == user.id) or user.role in ('Agri', 'Admin')
if not is_owner_or_staff:
    raise PermissionDenied("Unauthorized access to this application")
```

Do the same in `create_checkout_session` / `create_qrph_payment` if their caller can pass a non-owner user (they are called from the already-guarded viewsets, but the guard is cheap defense-in-depth — add `user` as a parameter ONLY if it is not already one; if it isn't, leave those two and rely on the viewset guard, and note so in the commit message).

**Verify**: `python manage.py check` → exit 0.

### Step 4: Add authorization tests

In `backend/apps/payment/tests/test_payment_security.py`, add (matching the existing APIClient conventions):

1. A `Barangay` user calling `POST /payment/{app_pk}/checkout_session/` for another farmer's PAYMENT_PENDING application → 403.
2. An `Inspector` calling `POST /payment/{app_pk}/create_qrph_payment/` for another farmer's app → 403.
3. The owning `Farmer` calling the same endpoint → NOT 403 (may be 400 depending on permit state — assert only that it is not 403).
4. An `Agri` user calling it for any app → NOT 403.

**Verify**: `python -m pytest apps/payment/tests/` → all pass.

## Test plan

- New tests: the four cases in Step 4, in `backend/apps/payment/tests/test_payment_security.py`.
- Structural pattern: existing tests in `backend/apps/payment/tests/test_payment_security.py`.
- Verification: `python -m pytest apps/payment/tests/` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `python manage.py check` exits 0
- [ ] `python -m pytest apps/payment/tests/` exits 0
- [ ] No `"role == 'Farmer' and application"` guard remains in `payment/viewsets.py` or `payment/services.py` (grep returns no matches)
- [ ] New authz tests exist and pass
- [ ] `git status` shows only the three in-scope files modified
- [ ] `advisor-plans/README.md` status row for 002 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Any in-scope file drifted so the guards at `viewsets.py:155/180` and `services.py:206` no longer match the excerpts.
- Removing the `Farmer`-only guard breaks an existing payment test that (implicitly) relied on a non-owner non-Farmer having access.
- The frontend is discovered calling `checkout_session`/`verify_paymongo_session` from an Inspector/Barangay/OPV context that legitimately needs it — that's a product decision, not something to encode around.

## Maintenance notes

- Any future payment action must use `_can_manage_payment` (or the service-level equivalent), never a bespoke `role == X` comparison.
- Reviewer focus: the `simulate_payment` and `confirm_offline_payment` guards were deliberately left unchanged — diff should be limited to the three specified sites.
- Deferred: `verify_permit` (permits side) access control is tracked separately; do not touch it here.