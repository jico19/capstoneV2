from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import HogSurvey
from .survey_import import invalidate_surveys


@receiver(post_save, sender=HogSurvey)
@receiver(post_delete, sender=HogSurvey)
def survey_changed(sender, **kwargs):
    invalidate_surveys()
