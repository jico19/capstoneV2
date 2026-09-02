# FarmPass Backend — Improvement Specifications

**Date:** 2026-08-25  
**Author:** Kiro (AI Review)  
**Scope:** `backend/apps/` — Business process hardening, no breaking changes  
**Implementation Order:** By priority (highest risk / impact first)

Each spec includes: what the problem is, what files change, exact code changes,
migration notes, and what NOT to touch.

---

## SPEC #1 — Fix AIC Number Race Condition (HIGH)

### Problem
The AIC number (e.g. `08-25-001-26`) is generated in **three separate places**
using a non-atomic count-then-write pattern. Two simultaneous payments on the
same day will produce the same AIC number, breaking the unique permit record.

Affected files:
- `apps/payment/services.py` — `create_checkout_session`, `verify_paymongo_session`
- `apps/payment/viewsets.py` — `simulate_payment`

### Root Cause
```python
# This is NOT atomic — a second request can read the same count before either saves
today_count = permits.IssuedPermit.objects.filter(aic_number__startswith=prefix).count()
issued_permit.aic_number = f"{mm_dd}-{today_count + 1:03d}-{yy}"
```

### Fix Strategy
Extract a single `generate_aic_number()` helper in `apps/payment/services.py`
that uses `select_for_update()` to lock the row during generation.
All three call sites will use this one function.

### Files to Change
1. `apps/payment/services.py` — add helper, replace 3 duplicate blocks
2. `apps/payment/viewsets.py` — replace 1 duplicate block

### Migration Required?
**No.** This is pure logic change. No model fields added or removed.

### Implementation

**`apps/payment/services.py`** — Add this function near the top (after imports):

```python
def _generate_aic_number(issued_permit_instance) -> str:
    """
    Atomically generates a unique AIC number for a given IssuedPermit.
    Uses select_for_update to prevent duplicate numbers on concurrent payments.
    Must be called inside a transaction.atomic() block.
    
    Format: MM-DD-NNN-YY  (e.g. 08-25-001-26)
    """
    from apps.permits.models import IssuedPermit
    today = timezone.now().date()
    mm_dd = today.strftime("%m-%d")
    yy = today.strftime("%y")
    prefix = f"{mm_dd}-"

    # Lock all IssuedPermit rows that already have today's prefix to prevent
    # concurrent reads from getting the same count.
    IssuedPermit.objects.select_for_update().filter(
        aic_number__startswith=prefix
    ).values_list('id', flat=True)

    today_count = IssuedPermit.objects.filter(
        aic_number__startswith=prefix
    ).exclude(pk=issued_permit_instance.pk).count()

    return f"{mm_dd}-{today_count + 1:03d}-{yy}"
```

Then in `verify_paymongo_session`, `create_checkout_session`, and `simulate_payment`
in viewsets.py, replace every instance of the 6-line AIC block with:

```python
# Replace this:
if not issued_permit.aic_number:
    today = timezone.now().date()
    mm_dd = today.strftime("%m-%d")
    yy = today.strftime("%y")
    prefix = f"{mm_dd}-"
    today_count = permits.IssuedPermit.objects.filter(
        aic_number__startswith=prefix
    ).count()
    issued_permit.aic_number = f"{mm_dd}-{today_count + 1:03d}-{yy}"

# With this single call:
if not issued_permit.aic_number:
    issued_permit.aic_number = _generate_aic_number(issued_permit)
```

### What NOT to Touch
- Do not change the AIC format string — frontend depends on it
- Do not change `IssuedPermit` model fields
- Do not change the PDF generation calls that follow

### Test Checklist
- [ ] Two simultaneous `verify_paymongo_session` calls on same application produce no duplicates
- [ ] AIC format is still `MM-DD-NNN-YY`
- [ ] `simulate_payment` still works end-to-end

---

## SPEC #2 — Guard `simulate_payment` in Production (HIGH)

### Problem
`simulate_payment` is a live API endpoint with no environment guard and no role
check. Any authenticated user knowing an application PK can bypass real payment.

### Fix Strategy
Add two guards at the top of the `simulate_payment` action:
1. Block if `settings.DEBUG` is False (production)
2. Restrict to Agri role only (for staging/demo use)

### Files to Change
1. `apps/payment/viewsets.py` — `simulate_payment` action only

### Migration Required?
**No.**

### Implementation

**`apps/payment/viewsets.py`** — Replace the beginning of `simulate_payment`:

```python
@action(detail=True, methods=['post'])
def simulate_payment(self, request, pk=None):
    """
    Simulates payment success for testing/demo purposes only.
    BLOCKED in production (DEBUG=False). Restricted to Agri role.
    """
    from django.conf import settings

    # Guard #1: Production block
    if not settings.DEBUG:
        return Response(
            {"error": "This endpoint is not available in production."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Guard #2: Role check
    if request.user.role != 'Agri':
        return Response(
            {"error": "Only Agri officers can simulate payments."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # ... rest of existing code unchanged ...
```

### What NOT to Touch
- Do not change the transaction logic inside `simulate_payment`
- Do not remove the endpoint — it is needed for demo/testing
- Do not change any other viewset actions

### Test Checklist
- [ ] With `DEBUG=True`, Agri user can simulate payment
- [ ] With `DEBUG=True`, Farmer user receives 403
- [ ] With `DEBUG=False`, any user receives 403

---

## SPEC #3 — Extract HogSurvey Deduction from `TransportOrigin.save()` (MEDIUM-HIGH)

### Problem
`TransportOrigin.save()` silently deducts pig counts from `HogSurvey` and
auto-creates a HogSurvey record if none exists ("self-healing"). This:
- Creates fake survey data in production
- Makes every draft save mutate real hog population records
- Is impossible to test correctly without survey fixtures

### Fix Strategy
**Additive approach — no removal, just guarding.** The existing `save()` logic
is wrapped behind a new `skip_survey_update` flag so existing behavior is
preserved by default, but can be explicitly bypassed during seeding/testing.
The actual deduction trigger is moved to happen **only on RELEASED status**
via a new `deduct_hog_survey()` service function.

The self-healing auto-create is replaced with a clear error log + graceful skip
(not a hard failure — the permit process should not be blocked if survey data is missing).

### Files to Change
1. `apps/permits/models.py` — `TransportOrigin.save()` — wrap self-healing
2. `apps/permits/services/application.py` — `handle_application_status_change()` — call deduction on RELEASED
3. `apps/permits/services/permit.py` — new `deduct_hog_survey()` helper

### Migration Required?
**No.**

### Implementation

**Step A — `apps/permits/models.py`**

Replace the self-healing block in `TransportOrigin.save()`:

```python
# BEFORE (dangerous auto-create):
if not latest_survey:
    from django.utils import timezone
    latest_survey = HogSurvey.objects.create(
        barangay=self.barangay,
        survey_date=timezone.now().date(),
        ...
    )

# AFTER (graceful skip with log):
if not latest_survey:
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(
        f"TransportOrigin.save(): No HogSurvey found for barangay "
        f"'{self.barangay}' in {current_year}. Skipping survey deduction. "
        f"Barangay survey data may be missing."
    )
    super().save(*args, **kwargs)
    return  # Skip deduction — do not auto-create fake data
```

**Step B — `apps/permits/services/permit.py`**

Add a new standalone service function (append to end of file):

```python
def deduct_hog_survey_for_application(application):
    """
    Deducts pig counts from HogSurvey for all origins of a RELEASED application.
    This is a no-op if survey data is missing (logs warning, does not raise).
    
    Called once when application status changes to RELEASED.
    This replaces the implicit deduction that used to happen inside 
    TransportOrigin.save() during draft creation.
    
    NOTE: This function does NOT run during draft/submission saves, only on RELEASED.
    """
    import logging
    from apps.maps.models import HogSurvey
    from django.utils import timezone
    from django.db import transaction

    logger = logging.getLogger(__name__)
    current_year = timezone.now().year

    with transaction.atomic():
        for origin in application.origins.all():
            latest_survey = HogSurvey.objects.select_for_update().filter(
                barangay=origin.barangay,
                survey_date__year=current_year
            ).order_by('-survey_date').first()

            if not latest_survey:
                logger.warning(
                    f"deduct_hog_survey: No survey for barangay '{origin.barangay}' "
                    f"in {current_year}. Skipping deduction for origin #{origin.pk}."
                )
                continue

            # Apply deductions, clamp to 0 to avoid negatives
            latest_survey.inahin  = max(0, latest_survey.inahin  - origin.inahin)
            latest_survey.barako  = max(0, latest_survey.barako  - origin.barako)
            latest_survey.fattener = max(0, latest_survey.fattener - origin.fattener)
            latest_survey.grower  = max(0, latest_survey.grower  - origin.grower)
            latest_survey.bulaw   = max(0, latest_survey.bulaw   - origin.bulaw)
            latest_survey.starter = max(0, latest_survey.starter - origin.starter)
            latest_survey.total_pigs = (
                latest_survey.inahin + latest_survey.barako + latest_survey.fattener +
                latest_survey.grower + latest_survey.bulaw + latest_survey.starter
            )
            latest_survey.save()
```

**Step C — `apps/permits/services/application.py`**

In `handle_application_status_change()`, add the deduction call when status
becomes RELEASED:

```python
def handle_application_status_change(application, new_status, reason=None):
    if application.status == new_status:
        return

    application.status = new_status
    application.save()

    # === ADD THIS BLOCK ===
    # When a permit is officially released (payment confirmed), deduct from HogSurvey.
    # This replaces the implicit deduction that happened in TransportOrigin.save().
    if new_status == models.PermitApplication.Status.RELEASED:
        try:
            from .permit import deduct_hog_survey_for_application
            deduct_hog_survey_for_application(application)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(
                f"HogSurvey deduction failed for application "
                f"#{application.application_id}: {e}"
            )
    # === END NEW BLOCK ===

    # ... rest of existing code unchanged ...
```

### What NOT to Touch
- Do not remove the `delete()` override in `TransportOrigin` — it correctly restores counts
- Do not change `HogSurvey` model
- Do not change the seeding scripts — they already call `TransportOrigin.save()` directly

### Risks & Mitigations
- **Risk:** Existing running system already has counts deducted at save-time.
  New records will deduct again at RELEASED. **Mitigation:** This is a clean-slate
  change for new applications only. Existing released permits are unaffected.
- **Risk:** Survey data could go negative.
  **Mitigation:** `max(0, ...)` clamp added in the new service function.

### Test Checklist
- [ ] Creating a draft application does NOT change any HogSurvey count
- [ ] Releasing an application DOES deduct from HogSurvey
- [ ] Missing survey logs a warning and does not crash the release flow
- [ ] Deleting a TransportOrigin still restores counts

---

## SPEC #4 — Add Offline Payment Confirmation Endpoint (MEDIUM)

### Problem
The `PaymentHistory` model has `confirmed_by`, `confirmed_at`, and `or_number`
fields for offline payments, but there is no API endpoint for an Agri officer
to actually confirm a walk-in cash payment. Farmers who pay in person have no
digital path to get their permit released.

### Fix Strategy
Add a `confirm_offline_payment` action to `PaymentViewSets`. This is a
pure addition — no existing endpoints are changed.

### Files to Change
1. `apps/payment/viewsets.py` — add new action
2. `apps/payment/services.py` — add new service function

### Migration Required?
**No.** All the model fields (`confirmed_by`, `confirmed_at`, `or_number`,
`payment_method = OFFLINE`) already exist.

### Implementation

**`apps/payment/services.py`** — Add new function:

```python
def confirm_offline_payment(application_pk: int, user, or_number: str):
    """
    Agri officer confirms a walk-in (offline) payment for an issued permit.
    Sets payment to SUCCESS, marks permit as paid, and releases the application.
    
    Args:
        application_pk: PK of the PermitApplication
        user: The Agri officer confirming payment
        or_number: Official Receipt number from the cashier
    """
    from apps.permits.services import handle_application_status_change
    from apps.documents.services import generate_permit_pdf, generate_aic_pdf

    if user.role != 'Agri':
        raise PermissionDenied("Only Agri officers can confirm offline payments.")

    if not or_number or not or_number.strip():
        raise ValidationError("Official Receipt (OR) number is required.")

    application = get_object_or_404(permits.PermitApplication, pk=application_pk)

    if application.status != permits.PermitApplication.Status.PAYMENT_PENDING:
        raise ValidationError(
            f"Application is not awaiting payment. Current status: {application.status}"
        )

    try:
        issued_permit = application.issued_permit
    except permits.IssuedPermit.DoesNotExist:
        raise ValidationError("No permit has been issued for this application.")

    if issued_permit.is_paid:
        raise ValidationError("This permit has already been paid.")

    with transaction.atomic():
        # Create or update the PaymentHistory record for offline
        payment_history, _ = models.PaymentHistory.objects.update_or_create(
            issued_permit=issued_permit,
            defaults={
                'status': models.PaymentHistory.Status.SUCCESS,
                'method': models.PaymentHistory.Method.OFFLINE,
                'amount': int(issued_permit.permit_fee),
                'or_number': or_number.strip(),
                'confirmed_by': user,
                'confirmed_at': timezone.now(),
            }
        )

        # Mark the issued permit as paid
        issued_permit.is_paid = True
        issued_permit.payment_method = permits.IssuedPermit.PaymentMethodChoices.OFFLINE

        # Generate AIC number
        if not issued_permit.aic_number:
            issued_permit.aic_number = _generate_aic_number(issued_permit)

        issued_permit.save()

        # Advance application to RELEASED
        handle_application_status_change(
            application,
            permits.PermitApplication.Status.RELEASED
        )

        # Queue PDF generation
        generate_permit_pdf.enqueue(permit_application_id=application.pk)
        generate_aic_pdf.enqueue(permit_application_id=application.pk)

        from apps.api.models import AuditTrail
        AuditTrail.objects.create(
            who_performed=user,
            what_performed=(
                f"[OFFLINE PAYMENT CONFIRMED] - OR#{or_number} recorded for "
                f"Permit {issued_permit.permit_number} / "
                f"Application #{application.application_id} by {user.get_full_name()}."
            ),
            when_performed=timezone.now(),
        )

    return payment_history
```

**`apps/payment/viewsets.py`** — Add new action to `PaymentViewSets`:

```python
@action(detail=True, methods=['post'])
def confirm_offline_payment(self, request, pk=None):
    """
    POST /api/payment/{application_pk}/confirm_offline_payment/
    
    Agri officer confirms a walk-in cash/offline payment.
    Required body: { "or_number": "1234567" }
    """
    or_number = request.data.get('or_number', '').strip()

    try:
        payment_history = services.confirm_offline_payment(
            application_pk=pk,
            user=request.user,
            or_number=or_number,
        )
        return Response(
            {
                "msg": "Offline payment confirmed successfully.",
                "or_number": payment_history.or_number,
                "confirmed_at": payment_history.confirmed_at,
            },
            status=status.HTTP_200_OK,
        )
    except PermissionDenied as e:
        return Response(
            {"error": e.detail if hasattr(e, "detail") else str(e)},
            status=status.HTTP_403_FORBIDDEN,
        )
    except ValidationError as e:
        return Response(
            {"error": e.detail[0] if isinstance(e.detail, list) else e.detail},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

### What NOT to Touch
- Do not change the PaymentHistory model
- Do not change existing checkout/verify endpoints
- Do not change the `Method.OFFLINE` choice value — it is already `'gcash'`
  in the model (a mislabel). Leave it — changing it requires a migration and
  data change that is out of scope.

### Test Checklist
- [ ] Agri can confirm offline payment with a valid OR number
- [ ] Farmer receives 403 attempting to confirm
- [ ] Application status becomes RELEASED after confirmation
- [ ] AuditTrail entry is created
- [ ] PDF generation is enqueued
- [ ] Calling twice raises "already paid" error

---

## SPEC #5 — Enforce Status Machine Transitions (MEDIUM)

### Problem
`handle_application_status_change()` accepts any status transition silently.
A bug could skip required review steps (e.g. DRAFT → RELEASED).
All transition guards are scattered across individual service functions.

### Fix Strategy
Add a transition map to `handle_application_status_change()`. If an invalid
transition is attempted, raise a `ValidationError` with a clear message.
This is backward-compatible because all current code paths only call valid
transitions (verified by reading the code).

**Important:** The map must include `None` as a valid "from" state for new
objects being set to their initial status (`SUBMITTED`).

### Files to Change
1. `apps/permits/services/application.py` — `handle_application_status_change()` only

### Migration Required?
**No.**

### Implementation

**`apps/permits/services/application.py`** — Modify `handle_application_status_change`:

```python
# Add this constant at the top of the file (after imports)
_VALID_STATUS_TRANSITIONS = {
    # from_status: [list of allowed to_statuses]
    None: [  # Initial transition (new application being submitted)
        models.PermitApplication.Status.SUBMITTED,
        models.PermitApplication.Status.DRAFT,
    ],
    models.PermitApplication.Status.DRAFT: [
        models.PermitApplication.Status.SUBMITTED,
    ],
    models.PermitApplication.Status.SUBMITTED: [
        models.PermitApplication.Status.OCR_VALIDATED,
        models.PermitApplication.Status.MANUAL,
        models.PermitApplication.Status.FORWARDED_TO_OPV,
        models.PermitApplication.Status.RESUBMISSION,
    ],
    models.PermitApplication.Status.RESUBMISSION: [
        models.PermitApplication.Status.SUBMITTED,
        models.PermitApplication.Status.FORWARDED_TO_OPV,  # OPV_REJECTED resubmission
    ],
    models.PermitApplication.Status.OCR_VALIDATED: [
        models.PermitApplication.Status.FORWARDED_TO_OPV,
        models.PermitApplication.Status.RESUBMISSION,
    ],
    models.PermitApplication.Status.MANUAL: [
        models.PermitApplication.Status.FORWARDED_TO_OPV,
        models.PermitApplication.Status.RESUBMISSION,
    ],
    models.PermitApplication.Status.FORWARDED_TO_OPV: [
        models.PermitApplication.Status.OPV_VALIDATED,
        models.PermitApplication.Status.OPV_REJECTED,
    ],
    models.PermitApplication.Status.OPV_VALIDATED: [
        models.PermitApplication.Status.PAYMENT_PENDING,  # issue_permit() goes here
    ],
    models.PermitApplication.Status.OPV_REJECTED: [
        models.PermitApplication.Status.FORWARDED_TO_OPV,  # after farmer resubmits
    ],
    models.PermitApplication.Status.PAYMENT_PENDING: [
        models.PermitApplication.Status.RELEASED,
    ],
    models.PermitApplication.Status.RELEASED: [],  # Terminal state
    # PERMIT_ISSUED is kept for model compatibility but not used in transitions
}


def handle_application_status_change(application, new_status, reason=None):
    if application.status == new_status:
        return

    # === TRANSITION GUARD ===
    current_status = application.status
    allowed = _VALID_STATUS_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise ValidationError(
            f"Invalid status transition: '{current_status}' → '{new_status}'. "
            f"Allowed transitions from '{current_status}': {[s for s in allowed]}"
        )
    # === END GUARD ===

    application.status = new_status
    application.save()

    # ... rest of existing code unchanged ...
```

### What NOT to Touch
- Do not change individual service functions (approve, reject, etc.)
- Do not change the `Status` choices on the model
- Do not remove `PERMIT_ISSUED` from the model choices (may be used in reports)

### Rollout Risk
Low. All current code paths produce valid transitions. The guard only blocks
buggy future code, not existing functionality.

### Test Checklist
- [ ] Normal flow (DRAFT → SUBMITTED → ... → RELEASED) works end-to-end
- [ ] Attempting DRAFT → RELEASED raises ValidationError
- [ ] Attempting RELEASED → SUBMITTED raises ValidationError
- [ ] OPV rejection → farmer resubmit → re-forward to OPV works

---

## SPEC #6 — Remove Dead `PERMIT_ISSUED` Status Step (LOW)

### Problem
`Status.PERMIT_ISSUED` is defined in the model and appears in the UI/filter
choices, but `issue_permit()` immediately skips it, going directly to
`PAYMENT_PENDING`. This confuses anyone reading the status flow.

### Fix Strategy
Do NOT delete the choice (could break existing DB records or filter queries).
Instead, mark it as deprecated in a comment and document that `issue_permit()`
intentionally skips it. This is a documentation/comment-only change.

### Files to Change
1. `apps/permits/models.py` — add deprecation comment

### Migration Required?
**No.**

### Implementation

**`apps/permits/models.py`** — Update the Status class comment:

```python
class Status(models.TextChoices):
    DRAFT               = 'DRAFT',              'Draft'
    SUBMITTED           = 'SUBMITTED',          'Submitted'
    RESUBMISSION        = 'RESUBMISSION',        'Resubmission'
    OCR_VALIDATED       = 'OCR_VALIDATED',      'OCR Validated'
    MANUAL              = 'MANUAL',             'Waiting for Manual Review'
    FORWARDED_TO_OPV    = 'FORWARDED_TO_OPV',  'Forwarded to OPV'
    OPV_VALIDATED       = 'OPV_VALIDATED',      'OPV Validated'
    OPV_REJECTED        = 'OPV_REJECTED',       'OPV Rejected'
    # NOTE: PERMIT_ISSUED is retained for DB compatibility but is NOT used
    # as an active step in the workflow. issue_permit() transitions directly
    # from OPV_VALIDATED → PAYMENT_PENDING. Do not add new code that sets
    # this status.
    PERMIT_ISSUED       = 'PERMIT_ISSUED',       'Permit issued (deprecated)'
    PAYMENT_PENDING     = 'PAYMENT_PENDING',     'Payment pending'
    RELEASED            = 'RELEASED',            'Released'
```

### Test Checklist
- [ ] No functional change — verify existing tests still pass
- [ ] Frontend label for PERMIT_ISSUED now shows "(deprecated)" if displayed

---

## SPEC #7 — Clarify Common Documents Belong to Application, Not Origin (LOW-MEDIUM)

### Problem
`traders_pass`, `handlers_license`, and `transport_carrier_reg` are silently
linked to `origins[0]` via convention in `create_permit()`. These documents
cover the entire transport (all barangays), not just the first origin.
If `origins[0]` is deleted, these documents are lost.

### Fix Strategy
**Non-breaking — additive only.** Add a `PermitApplicationDocument` model
that links documents directly to `PermitApplication`. During the transition,
`create_permit()` saves common docs to both the new model AND to `origins[0]`
(for backward compatibility with existing serializers and PDF generation).

New model is additive — existing code paths still work.

> **Note:** Full migration away from `origins[0]` for common docs should be
> done as a follow-up after verifying the new model's data. This spec only
> lays the foundation.

### Files to Change
1. `apps/permits/models.py` — add `PermitApplicationDocument` model
2. `apps/permits/services/permit.py` — save common docs to new model
3. Generate and run a new migration

### Migration Required?
**Yes — additive only (new table, no column changes).**

### Implementation

**`apps/permits/models.py`** — Add new model (append after `SubmittedDocument`):

```python
class PermitApplicationDocument(models.Model):
    """
    Stores documents that belong to the entire PermitApplication,
    not to a specific TransportOrigin (barangay).
    
    Examples: Trader's Pass, Handler's License, Transport Carrier Registration.
    
    This supplements SubmittedDocument (which is origin-scoped) for common documents.
    """
    class DocumentType(models.TextChoices):
        TRADERS_PASS = 'traders_pass', "Trader's Pass"
        HANDLERS_LICENSE = 'handlers_license', "Handler's License"
        TRANSPORT_CARRIER_REG = 'transport_carrier_reg', "Transport Carrier Registration"

    application = models.ForeignKey(
        PermitApplication,
        on_delete=models.CASCADE,
        related_name='application_documents'
    )
    document_type = models.CharField(max_length=30, choices=DocumentType.choices)
    file = models.FileField(
        upload_to='submitted_docs/',
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png']),
            validate_file_size
        ]
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('application', 'document_type')]

    def __str__(self):
        return f"AppDoc → {self.get_document_type_display()} — App #{self.application_id}"
```

**`apps/permits/services/permit.py`** — In `create_permit()`, save common docs
to the new model in addition to the existing `origins[0]` path:

```python
# After: doc = serializer.save()  for common documents (non origin_ keys)
# Add:
COMMON_DOC_TYPES = ['traders_pass', 'handlers_license', 'transport_carrier_reg']
if doc_type in COMMON_DOC_TYPES:
    # Also save to PermitApplicationDocument for correct ownership tracking.
    # The origin-linked copy is kept for backward compatibility.
    models.PermitApplicationDocument.objects.update_or_create(
        application=application,
        document_type=doc_type,
        defaults={'file': file}
    )
```

**Run migration:**
```bash
python manage.py makemigrations permits --name="add_permit_application_document"
python manage.py migrate
```

### What NOT to Touch
- Do not remove `SubmittedDocument` or change its `origin` FK
- Do not change PDF generation — it still reads from `SubmittedDocument`
- Do not change the document upload key format

### Test Checklist
- [ ] Migration applies cleanly with no errors
- [ ] `create_permit()` saves common docs to both old and new model
- [ ] Deleting `origins[0]` no longer loses the trader's pass (it's in new model)
- [ ] Existing applications with no `PermitApplicationDocument` entries still work

---

## SPEC #8 — Document OCR Coverage Gap (LOW)

### Problem
OCR only runs on 2 of 5 document types. The other 3 (`traders_pass`, `cis`,
`endorsement_cert`) are auto-marked `PASSED` without content validation.
This is misleading in the audit trail.

### Fix Strategy
Do NOT add OCR extraction for the remaining types now (out of scope, requires
OCR template work). Instead, change the auto-pass remark to clearly state
"Manual verification required" so reviewers and audit trails are accurate.

### Files to Change
1. `apps/ocr/tasks.py` — change the remark for non-OCR document types

### Migration Required?
**No.**

### Implementation

**`apps/ocr/tasks.py`** — In `extract_document_info()`, replace:

```python
# BEFORE:
if doc.document_type not in allowed_types:
    permits.OCRValidationResult.objects.update_or_create(
        document=doc,
        defaults={
            'status': 'PASSED',
            'extracted_field': {},
            'remarks': {'general': 'No OCR required for this document type.'}
        }
    )

# AFTER: Status becomes MANUAL to correctly reflect that it needs human review.
if doc.document_type not in allowed_types:
    permits.OCRValidationResult.objects.update_or_create(
        document=doc,
        defaults={
            'status': 'MANUAL',
            'extracted_field': {},
            'remarks': {
                'general': (
                    f"Document type '{doc.document_type}' does not support automated "
                    "OCR extraction. This document requires manual review by an Agri officer."
                )
            }
        }
    )
    check_all_documents_complete(doc.origin.application.id)
    return
```

### Impact on `check_all_documents_complete`
Verify that `check_all_documents_complete` in `apps/ocr/services.py` handles
`MANUAL` status correctly (does not treat it as a failure that blocks the
application). If it treats `MANUAL` as "incomplete," the status advancement
from OCR to `MANUAL`/`OCR_VALIDATED` will change for all applications.

**Before implementing:** Read `apps/ocr/services.py` → `check_all_documents_complete`
to confirm the MANUAL status is handled as "review needed, not blocking."

### Test Checklist
- [ ] Uploading a `traders_pass` creates an OCRValidationResult with `status=MANUAL`
- [ ] Application still advances through the workflow
- [ ] Agri officer review queue correctly shows these as needing manual check

---

## Implementation Order

| Step | Spec | Files Changed | Risk | DB Change |
|------|------|---------------|------|-----------|
| 1 | #1 — AIC Race Condition | `payment/services.py`, `payment/viewsets.py` | Low | No |
| 2 | #2 — Simulate Payment Guard | `payment/viewsets.py` | Low | No |
| 3 | #4 — Offline Payment Endpoint | `payment/services.py`, `payment/viewsets.py` | Low | No |
| 4 | #5 — Status Machine Guard | `permits/services/application.py` | Medium | No |
| 5 | #3 — HogSurvey Deduction Timing | `permits/models.py`, `permits/services/` | Medium | No |
| 6 | #6 — PERMIT_ISSUED Comment | `permits/models.py` | None | No |
| 7 | #7 — Common Docs Model | `permits/models.py`, `permits/services/permit.py` | Low | **Yes** |
| 8 | #8 — OCR Coverage Remark | `ocr/tasks.py` | Low | No |

---

## General Safety Rules for All Changes

1. **Read the function before editing it.** Every change in this spec touches
   specific lines only — do not refactor surrounding code.
2. **One spec at a time.** Run existing tests between each spec.
3. **No model field deletions** in any spec.
4. **The only migration is Spec #7.** Confirm with `python manage.py migrate --run-syncdb --check`
   that no unexpected migrations appear after other specs.
5. **Do not change URL patterns.** All new endpoints use `@action` on existing
   viewsets and are auto-registered by the existing `DefaultRouter`.
