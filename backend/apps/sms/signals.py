from django.dispatch import receiver
from django.db.models.signals import post_save, pre_save
from apps.permits import models as permits
from .task import send_via_status


@receiver(pre_save, sender=permits.PermitApplication)
def capture_old_status(sender, instance, **kwargs):
    """
    Captures the status of the application before it is saved to detect changes.
    """
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except sender.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=permits.PermitApplication)
def send_sms_update_approve(sender, instance, created, **kwargs):
    """
    Trigger SMS notification when application status changes to specific milestones.
    Only triggers if the status has actually changed to prevent redundant messages.
    """
    monitored_statuses = [
        'RESUBMISSION',
        'OPV_VALIDATED', 
        'OPV_REJECTED', 
        'PERMIT_ISSUED', 
        'PAYMENT_PENDING', 
        'RELEASED'
    ]

    old_status = getattr(instance, '_old_status', None)
    
    # Trigger if it's a new instance in a monitored status, 
    # OR if an existing instance changed its status to a monitored one.
    if created or (old_status != instance.status):
        if instance.status in monitored_statuses:
            send_via_status.enqueue(instance.id)



