from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from apps.api.models import AuditTrail
from .. import models

def override_ocr_result(ocr_instance, user, data):
    if user.role != "Agri":
        raise PermissionDenied("Only Agri officers can manually override OCR results.")

    new_fields = data
    merged = {**ocr_instance.extracted_field, **new_fields}

    ocr_instance.extracted_field = merged
    ocr_instance.status = models.OCRValidationResult.ValidationStatus.OVERRIDDEN
    ocr_instance.manually_overridden = True
    ocr_instance.overridden_by = user
    ocr_instance.overridden_fields = new_fields
    ocr_instance.remarks = f"Manually reviewed by {user.get_full_name()}"
    ocr_instance.save()

    # --- Formal Audit Entry ---
    AuditTrail.objects.create(
        who_performed=user,
        what_performed=f"[OCR DATA CORRECTION]- Agri Officer manually corrected data fields for Document #{ocr_instance.document.id} issued for Application #{ocr_instance.document.origin.application.id}.",
        when_performed=timezone.now(),
    )
    return ocr_instance
