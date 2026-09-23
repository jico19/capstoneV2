# Plan 006: Release queueing on `on_commit` + HogSurvey deduction must not be swallowed

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving to the next step. If anything
> in the "STOP conditions" section occurs, stop and report — do not improvise. When
> done, update the status row for this plan in `advisor-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 8ea30ba..HEAD -- backend/apps/payment/services.py backend/apps/permits/services/application.py`
> If either file changed, compare the "Current state" excerpts against live code; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (land BEFORE plan 005 — same file; 005's tests then validate both)
- **Category**: bug
- **Planned at**: commit `8ea30ba`, 2026-09-23
- **Issue**: —

## Why this matters

Two related release-path bugs:

1. **PDFs queued before commit.** `_release_permit_and_queue_pdfs` (`backend/apps/payment/services.py:20-25`) calls `generate_permit_pdf.enqueue(...)` / `generate_aic_pdf.enqueue(...)` **inside** the `transaction.atomic()` blocks of every release path. If a later write in the same transaction fails (e.g. the `AuditTrail.objects.create` in `confirm_offline_payment` at `services.py:479-487`), the transaction rolls back but the already-enqueued tasks still run — workers generate and overwrite PDFs for an application still in `PAYMENT_PENDING`, and each regeneration re-saves `issued_at`. Every other enqueue in the repo wraps in `transaction.on_commit` (see excerpts below); this one doesn't.

2. **HogSurvey deduction failure swallowed.** `handle_application_status_change` wraps `deduct_hog_survey_for_application` in `try/except Exception` that only logs (`backend/apps/permits/services/application.py:86-94`). The application is already committed as `RELEASED` (and the permit as paid) when the deduction runs — if it raises, a released permit ships with barangay hog stock never deducted, silently corrupting the maps/density data the office relies on.

## Current state

`backend/apps/payment/services.py:20-25`:
```python
def _release_permit_and_queue_pdfs(application):
    """Advance application to RELEASED status and queue PDF generation tasks."""
    from apps.permits.services import handle_application_status_change
    handle_application_status_change(application, permits.PermitApplication.Status.RELEASED)
    generate_permit_pdf.enqueue(permit_application_id=application.pk)
    generate_aic_pdf.enqueue(permit_application_id=application.pk)
```

`backend/apps/permits/services/application.py:53-94` (relevant portion):
```python
def handle_application_status_change(application, new_status, reason=None):
    if application.status == new_status:
        return
    allowed = _VALID_STATUS_TRANSITIONS.get(application.status, [])
    if new_status not in allowed:
        raise ValidationError(...)
    application.status = new_status
    application.save()
    ...
    if new_status in monitored_statuses:
        from django.db import transaction as db_transaction
        from apps.sms.task import send_via_status
        db_transaction.on_commit(lambda: send_via_status.enqueue(application.id))

    # When a permit is officially released (payment confirmed), deduct from HogSurvey.
    if new_status == Status.RELEASED:
        try:
            from .permit import deduct_hog_survey_for_application
            deduct_hog_survey_for_application(application)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(
                f"HogSurvey deduction failed for application #{application.application_id}: {e}"
            )
    ...
```

The repo's established pattern for this exact concern — `backend/apps/permits/services/application.py:161-166`:
```python
transaction.on_commit(
    lambda: generate_aic_pdf.enqueue(
        permit_application_id=application.id,
        ...
    )
)
```
Also `permit.py:91,140` (OCR docs) and `permit.py:197,215` (scan SMS) — all `transaction.on_commit(lambda ...)` or default-arg-captured lambdas.

`deduct_hog_survey_for_application` (`backend/apps/permits/services/permit.py:296-348`) is pure DB work under its own `transaction.atomic()` + `select_for_update`; it does NOT enqueue tasks, so running it inside the release transaction is safe.

## Commands you will need

| Purpose   | Command                                      | Expected on success |
|-----------|----------------------------------------------|---------------------|
| Django check | `python manage.py check` (from `backend/`) | exit 0 |
| Payment tests | `python -m pytest apps/payment/tests/` | all pass |
| Status-workflow tests | `python -m pytest apps/permits/tests/test_workflow.py` | all pass |

Tests need PostgreSQL.

## Suggested executor toolkit

None required. The django-tasks backend is `django_tasks_db.DatabaseBackend` (`base.py:204-206`); for asserting task *dispatch* timing, patch `generate_permit_pdf.enqueue` / `generate_aic_pdf.enqueue` and assert they were only invoked via `on_commit` (i.e. not before commit). Look at how `test_workflow.py` asserts PDF generation to match style.

## Scope

**In scope**:
- `backend/apps/payment/services.py`
- `backend/apps/permits/services/application.py`
- `backend/apps/payment/tests/test_payment_workflow.py` (add tests)
- `backend/apps/permits/tests/test_workflow.py` (add tests)

**Out of scope**:
- The transition map `_VALID_STATUS_TRANSITIONS` (do not change allowed transitions).
- `verify_paymongo_session`'s other logic (payment amount reconciliation).
- The frontend.

## Git workflow

- Branch: `advisor/006-oncommit-hogsurvey`.
- Commit once after tests pass. Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Move PDF enqueues behind `on_commit`

Rewrite `_release_permit_and_queue_pdfs` in `backend/apps/payment/services.py` so both enqueues run only after the surrounding transaction commits, binding arguments with default-arg capture (matches the existing pattern):

```python
def _release_permit_and_queue_pdfs(application):
    """Advance application to RELEASED status; queue PDF tasks after commit."""
    from django.db import transaction as db_tx
    from apps.permits.services import handle_application_status_change
    handle_application_status_change(application, permits.PermitApplication.Status.RELEASED)
    p_app_pk = application.pk
    db_tx.on_commit(lambda f=generate_permit_pdf, k=p_app_pk: f.enqueue(permit_application_id=k))
    db_tx.on_commit(lambda f=generate_aic_pdf, k=p_app_pk: f.enqueue(permit_application_id=k))
```

If a caller invokes `_release_permit_and_queue_pdfs` outside a transaction, Django's `on_commit` runs the callback immediately after the outermost atomic block — still correct.

**Verify**: `Select-String -Path backend/apps/payment/services.py -Pattern "\.enqueue\("` → hits appear only inside `on_commit` lambdas (lines ~24-25 gone).

### Step 2: Make the HogSurvey deduction fail the release instead of being swallowed

In `backend/apps/permits/services/application.py`, remove the `try/except` wrapper around `deduct_hog_survey_for_application` so an exception propagates and rolls back the entire release transaction (status stays `PAYMENT_PENDING`, permit stays unpaid — consistent state):

```python
if new_status == Status.RELEASED:
    from .permit import deduct_hog_survey_for_application
    deduct_hog_survey_for_application(application)
```

Because the deduction runs *inside* each caller's `transaction.atomic()` (all release paths already wrap `handle_application_status_change` — `payment/services.py` release functions all call it inside their atomic blocks), a failure now rolls back the status change + `is_paid` together. No partial release.

If — and only if — you find any caller of `handle_application_status_change` that reaches `RELEASED` outside a surrounding `transaction.atomic()`, STOP and report it (see STOP conditions) instead of wrapping it ad hoc.

**Verify**: `python manage.py check` → exit 0.

### Step 3: Remove the now-dead `logging` import if unused

After Step 2, check `backend/apps/permits/services/application.py` — the `import logging` and `logging.getLogger(__name__)` inside the RELEASED branch are deleted. If `logging` is no longer used anywhere in that file, remove its import (function-local `import logging` was added at line 91 inside the branch; the module's top may or may not have one — only remove if clearly unused).

**Verify**: `python manage.py check` → exit 0.

### Step 4: Add tests

In `backend/apps/payment/tests/test_payment_workflow.py`:
1. **on_commit timing**: patch `apps.documents.services.generate_permit_pdf.enqueue` and `generate_aic_pdf.enqueue` with mocks; call `confirm_offline_payment` and assert the mocks were called, and that they were invoked *after* the DB commit (check: with `atomic()` nested and a forced failure before commit, the enqueue mocks must NOT be called).

In `backend/apps/permits/tests/test_workflow.py`:
2. **Deduction failure blocks release**: patch `apps.permits.services.permit.deduct_hog_survey_for_application` (the `.permit` module import used by `application.py`) to raise; call the release service; assert the application is NOT `RELEASED` and the permit is not paid after the exception.

**Verify**: `python -m pytest apps/payment/tests/ apps/permits/tests/test_workflow.py` → all pass.

## Test plan

- New tests: the two cases in Step 4, in `backend/apps/payment/tests/test_payment_workflow.py` and `backend/apps/permits/tests/test_workflow.py`.
- Structural pattern: existing full-release-flow tests in both files.
- Verification: `python -m pytest apps/payment/tests/ apps/permits/tests/test_workflow.py` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `python manage.py check` exits 0
- [ ] No bare `.enqueue(` remains inside an atomic block in `payment/services.py` (all behind `on_commit`)
- [ ] The `try/except Exception ... logging.error` around HogSurvey deduction in `application.py` is gone
- [ ] New mocks-based tests exist and pass for on_commit timing and deduction-failure-rolls-back
- [ ] `git status` shows only the four in-scope files modified
- [ ] `advisor-plans/README.md` status row for 006 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- You find a caller that reaches `RELEASED` through `handle_application_status_change` outside a `transaction.atomic()` — making the deduction raise would then leave a half-applied transition. Report the caller; do not wrap it ad hoc.
- `deduct_hog_survey_for_application`'s module-level import adds a circular import from `application.py` (it imports `from .permit import ...` — the sibling module) at the point of call; if import-at-top causes a cycle, keep the function-local import as-is.
- Any in-scope file drifted from the excerpts.

## Maintenance notes

- Any future release-side side effect (new SMS, new PDF, cache invalidation) must be queued via `on_commit`, matching this and `permit.py`/`application.py` siblings.
- Plan 005 depends on this: land this plan first, then 005, so the on_commit tests and the lock-re-check tests run together without merge friction.
- Reviewer focus: Step 2 changes transactional guarantees — confirm the deduction rollback surfaces a useful error to the operator (the release service catches `Exception` and returns `str(e)` on some paths; that's acceptable for demo, but a human reviewer should confirm no *swallowed* path remains).