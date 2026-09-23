# Plan 005: Release path — lock rows and re-check inside the transaction

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving to the next step. If anything
> in the "STOP conditions" section occurs, stop and report — do not improvise. When
> done, update the status row for this plan in `advisor-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 8ea30ba..HEAD -- backend/apps/payment/services.py backend/apps/payment/tests/test_payment_workflow.py`
> If either file changed, compare the "Current state" excerpts against live code before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: 006 (both edit `payment/services.py`; land 006 first, then this, in the same session)
- **Category**: bug
- **Planned at**: commit `8ea30ba`, 2026-09-23
- **Issue**: —

## Why this matters

Two of the release paths — `confirm_offline_payment` and `farmer_simulate_payment` — read
`application.status` and `issued_permit.is_paid` **outside** the `transaction.atomic()` block and
never lock either row inside it. Two concurrent submits (double-click, retry after a network blip,
or a webhook/worker racing an admin click) can both pass the guards, both advance to `RELEASED`,
and double-run the release side effects: `handle_application_status_change` re-executes
`deduct_hog_survey_for_application` (double stock deduction, clamped but wrong), plus duplicate
PDF enqueues, SMS, notifications, and AuditTrail rows. The `verify_paymongo_session` path already
shows the correct pattern — lock + re-check inside the atomic block. This plan makes all release
paths idempotent at the database level.

## Current state

`backend/apps/payment/services.py`:

**The correct pattern (verify path, already in place)** — lines 286-315:
```python
if is_paid:
    with transaction.atomic():
        payment_history = models.PaymentHistory.objects.select_for_update().get(pk=payment_history.pk)
        if payment_history.status == models.PaymentHistory.Status.SUCCESS:
            return True, payment_history
        ...
        _release_permit_and_queue_pdfs(application)
```

**The broken pattern — `farmer_simulate_payment`** (lines 351-370):
```python
application = get_object_or_404(permits.PermitApplication, pk=application_pk)
if application.status != permits.PermitApplication.Status.PAYMENT_PENDING:
    raise ValidationError(...)
try:
    issued_permit = application.issued_permit
except permits.IssuedPermit.DoesNotExist:
    raise ValidationError("No permit has been issued for this application yet.")
if issued_permit.is_paid:
    raise ValidationError("This permit has already been paid.")
with transaction.atomic():
    payment_history, _ = models.PaymentHistory.objects.update_or_create(...)   # status SUCCESS
    issued_permit.is_paid = True
    ...
    _release_permit_and_queue_pdfs(application)
```

**The broken pattern — `confirm_offline_payment`** (lines 438-453):
```python
application = get_object_or_404(permits.PermitApplication, pk=application_pk)
if application.status != permits.PermitApplication.Status.PAYMENT_PENDING:
    raise ValidationError(...)
try:
    issued_permit = application.issued_permit
except permits.IssuedPermit.DoesNotExist:
    raise ValidationError("No permit has been issued for this application.")
if issued_permit.is_paid:
    raise ValidationError("This permit has already been paid.")
with transaction.atomic():
    payment_history, _ = models.PaymentHistory.objects.update_or_create(...)   # status SUCCESS
    issued_permit.is_paid = True
    ...
    _release_permit_and_queue_pdfs(application)
    AuditTrail.objects.create(...)
```

`deduct_hog_survey_for_application` (`backend/apps/permits/services/permit.py:296-348`) runs under its own `transaction.atomic()` + `select_for_update` per survey — it is pure DB work, safe to rerun-guard by row state.

Repo conventions:
- The release/issue workflow adheres to: role check → status guard → `transaction.atomic()` → re-check under lock → mutate → formal `AuditTrail` (see AGENTS.md and `backend/apps/permits/services/opv.py`).
- Concurrency tests for this area live in `backend/apps/payment/tests/test_payment_workflow.py` (full release flow) and `backend/apps/permits/tests/test_workflow.py::TestPermitWorkflow`.

## Commands you will need

| Purpose   | Command                                      | Expected on success |
|-----------|----------------------------------------------|---------------------|
| Django check | `python manage.py check` (from `backend/`) | exit 0 |
| Tests     | `python -m pytest apps/payment/tests/test_payment_workflow.py apps/payment/tests/test_payment_security.py` | all pass |
| Full release suite | `python -m pytest apps/payment/tests/ apps/permits/tests/test_workflow.py` | all pass |

Tests need PostgreSQL.

## Suggested executor toolkit

None required. Read `backend/apps/payment/tests/test_payment_workflow.py` first and match its fixtures/patterns.

## Scope

**In scope**:
- `backend/apps/payment/services.py`
- `backend/apps/payment/tests/test_payment_workflow.py` (add tests only)

**Out of scope**:
- `verify_paymongo_session` — already correct; do not modify.
- The transition map in `backend/apps/permits/services/application.py` and `handle_application_status_change` — plan 006 handles the HogSurvey swallow and on_commit changes; do not duplicate them here.
- Any frontend file.

## Git workflow

- Branch: `advisor/005-release-path-locking`.
- Commit once after tests pass. Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Lock and re-check inside `farmer_simulate_payment`

Inside the existing `with transaction.atomic():` block in `farmer_simulate_payment`, re-fetch with locks in the SAME order the verify path uses (PaymentHistory → IssuedPermit → PermitApplication), then re-check all guards:

```python
with transaction.atomic():
    payment_history = models.PaymentHistory.objects.select_for_update().get(pk=payment_history.pk)
    if payment_history.status == models.PaymentHistory.Status.SUCCESS:
        return payment_history
    issued_permit = permits.IssuedPermit.objects.select_for_update().get(pk=issued_permit.pk)
    application = permits.PermitApplication.objects.select_for_update().get(pk=application.pk)
    if issued_permit.is_paid:
        raise ValidationError("This permit has already been paid.")
    if application.status != permits.PermitApplication.Status.PAYMENT_PENDING:
        raise ValidationError(f"Application is not awaiting payment. Current status: {application.status}")
    # ... existing update_or_create + mark-paid + ensure_aic_number + save logic ...
    _release_permit_and_queue_pdfs(application)
```

Keep the pre-transaction status/is_paid checks as a cheap fast path (they make the common happy-path error message identical), but the authoritative guard is the in-lock re-check. Replace the `update_or_create` for PaymentHistory with a guarded create/fetch so a concurrent first-writer isn't clobbered: after locking, if no PaymentHistory exists, create it (the locked `SELECT ... FOR UPDATE` of the issued permit serializes writers, so `update_or_create` is then safe — but do the lock BEFORE the create).

**Verify**: `python manage.py check` → exit 0.

### Step 2: Lock and re-check in `confirm_offline_payment`

Same treatment inside `confirm_offline_payment`'s atomic block — re-fetch `PaymentHistory` (if it exists; else lazy-create after lock), `IssuedPermit`, `PermitApplication` with `select_for_update()`, and re-check `is_paid`/`status`/`PaymentHistory.status == SUCCESS` before mutating. Move the `AuditTrail.objects.create(...)` call to remain after the mutations inside the block (it already is).

**Verify**: `python manage.py check` → exit 0.

### Step 3: Add idempotency / race regression tests

In `backend/apps/payment/tests/test_payment_workflow.py`, add:

1. **Sequential double-call**: build a PAYMENT_PENDING application with an issued permit (use the same helpers the full-workflow test uses), call `confirm_offline_payment(app.pk, agri, "OR-123")` twice. Second call raises `ValidationError`; `PaymentHistory.status == SUCCESS`, `IssuedPermit.is_paid == True`, and application status `RELEASED` — the "already released" message, and no second AuditTrail row / no second HogSurvey deduction (assert HogSurvey counts unchanged after the second call).
2. **Sequential double-call for simulate**: same shape for `farmer_simulate_payment`.
3. If a threaded concurrent test is practical against your Postgres (two transactions calling the same confirm on the same app), add one with `threading.Barrier` and assert exactly one succeeds and exactly one HogSurvey deduction occurred. If the test infra makes this flaky, skip it and note that in the commit message — the sequential idempotency tests + in-lock re-check are the primary coverage.

**Verify**: `python -m pytest apps/payment/tests/test_payment_workflow.py apps/payment/tests/test_payment_security.py` → all pass.

### Step 4: Run the full release surface

**Verify**: `python -m pytest apps/payment/tests/ apps/permits/tests/test_workflow.py` → all pass.

## Test plan

- New tests: the sequential double-call idempotency tests (and optional threaded test) in `backend/apps/payment/tests/test_payment_workflow.py`.
- Structural pattern: `backend/apps/payment/tests/test_payment_workflow.py::TestPaymentWorkflow` (full release flow).
- Verification: `python -m pytest apps/payment/tests/ apps/permits/tests/test_workflow.py` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `python manage.py check` exits 0
- [ ] Both release services lock `PaymentHistory`/`IssuedPermit`/`PermitApplication` and re-check status + `is_paid` inside the atomic block (grep for `select_for_update` in the two functions)
- [ ] The sequential double-call tests exist and pass (second call raises, no double AuditTrail/HogSurvey)
- [ ] `grep -n "select_for_update" backend/apps/payment/services.py` shows the verify path plus both release paths
- [ ] `git status` shows only `backend/apps/payment/services.py` and `backend/apps/payment/tests/test_payment_workflow.py` modified
- [ ] `advisor-plans/README.md` status row for 005 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Locking `PermitApplication` in these paths deadlocks against the verify path in tests — lock in the exact same order as `verify_paymongo_session` (PaymentHistory first, then IssuedPermit, then application) and if that does not resolve it, report.
- A migration or model change since `8ea30ba` altered `PaymentHistory`/`IssuedPermit`/`PermitApplication` such that the `select_for_update` re-checks can't map onto the current fields.
- The `update_or_create` pattern can't be reconciled with the lock ordering (e.g. PaymentHistory row does not exist yet at lock time) and you can't find a clean insert-after-lock path — report rather than guessing.

## Maintenance notes

- Keep all release-side effects inside the single atomic block; any new side effect (SMS, notify, PDF) belongs there or behind `on_commit` (see plan 006).
- The fast-path pre-checks exist only to return friendly messages; never rely on them for correctness.
- Reviewer focus: lock ordering identical across all three release paths, and that the second caller gets the *same* ValidationError/PermissionDenied the happy path would have returned (no 500s from the locked re-checks).