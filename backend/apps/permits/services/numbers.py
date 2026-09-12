from django.db import transaction
from django.utils import timezone

from ..models import AicNumberCounter, IssuedPermit, PermitApplication


def get_aic_number(instance=None) -> str:
    """
    Atomically returns the next unique AIC number (MM-DD-NNN-YY).

    One AicNumberCounter row per day is locked with select_for_update, so
    concurrent callers block until the previous one commits — numbers never
    duplicate across the PermitApplication / IssuedPermit pair.
    """
    today = timezone.now().date()
    mm_dd = today.strftime("%m-%d")
    yy = today.strftime("%y")
    prefix = f"{mm_dd}-"

    with transaction.atomic():
        counter, created = AicNumberCounter.objects.select_for_update().get_or_create(
            date=today,
            defaults={"last_number": 0},
        )
        if created:
            counter.last_number = max(
                PermitApplication.objects.filter(aic_number__startswith=prefix).count(),  # noqa: E501
                IssuedPermit.objects.filter(aic_number__startswith=prefix).count(),
            )
            counter.save(update_fields=["last_number"])

        counter.last_number += 1
        counter.save(update_fields=["last_number"])

    return f"{mm_dd}-{counter.last_number:03d}-{yy}"