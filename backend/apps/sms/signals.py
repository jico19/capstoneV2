from django.dispatch import receiver
from django.db.models.signals import post_save
from apps.permits import models as permits
from .task import send_via_status


# TODO: Create the SMS
@receiver(post_save, sender=permits.PermitApplication)
def send_sms_update_approve(sender, instance, created, **kwargs):
    # TODO: Make this a Background task
    """
    Trigger SMS notification when application status changes to specific milestones.
    """
    monitored_statuses = [
        'RESUBMISSION',
        'OPV_VALIDATED', 
        'OPV_REJECTED', 
        'PERMIT_ISSUED', 
        'PAYMENT_PENDING', 
        'RELEASED'
    ]
    if instance.status in monitored_statuses:
        # di siya nag ga accept ng instance
        send_via_status.enqueue(instance.id)



