from django.db.models.signals import post_save
from django.dispatch import receiver
from . import models
from .services import handle_application_status_change
from apps.api.models import AuditTrail
from django.utils import timezone


@receiver(post_save, sender=models.SubmittedDocument)
def trigger_ocr_flow(sender, instance, created, **kwargs):
    if created and instance.origin.application.status == models.PermitApplication.Status.DRAFT:
        handle_application_status_change(instance.origin.application, models.PermitApplication.Status.SUBMITTED)


@receiver(post_save, sender=models.OPVValidation)
def trigger_opv_flow(sender, instance, **kwargs):
    Status = models.PermitApplication.Status
    new_status = Status.OPV_VALIDATED if instance.status == 'VALIDATED' else Status.OPV_REJECTED
    handle_application_status_change(instance.application, new_status, reason=instance.remarks)


@receiver(post_save, sender=models.IssuedPermit)
def trigger_payment_flow(sender, instance, created, **kwargs):
    application = instance.application
    Status = models.PermitApplication.Status

    if created:
        handle_application_status_change(application, Status.PAYMENT_PENDING)
    elif instance.is_paid and application.status == Status.PAYMENT_PENDING:
        handle_application_status_change(application, Status.RELEASED)
