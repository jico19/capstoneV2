from django.db import transaction, IntegrityError
from django.utils import timezone

from ..models import AicNumberCounter, MaoCertNumberCounter, IssuedPermit, PermitApplication


def get_aic_number(instance=None) -> str:
    """
    Atomically returns the next unique AIC number (MM-DD-NNN-YY).

    One AicNumberCounter row per day is locked with select_for_update, so
    concurrent callers block until the previous one commits — numbers never
    duplicate across the PermitApplication / IssuedPermit pair.
    """
    today = timezone.localdate()
    mm_dd = today.strftime("%m-%d")
    yy = today.strftime("%y")
    prefix = f"{mm_dd}-"

    for attempt in range(3):
        try:
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
        except IntegrityError:
            if attempt == 2:
                raise


def get_mao_cert_number(instance=None) -> str:
    """
    Atomically returns the next unique MAO Certification number (OMA-ANN-ASFCert-YYYYMMDD-XX).

    One MaoCertNumberCounter row per day is locked with select_for_update, so
    concurrent callers block until the previous one commits.
    """
    today = timezone.localdate()
    date_str = today.strftime("%Y%m%d")
    prefix = f"OMA-ANN-ASFCert-{date_str}-"

    for attempt in range(3):
        try:
            with transaction.atomic():
                counter, created = MaoCertNumberCounter.objects.select_for_update().get_or_create(
                    date=today,
                    defaults={"last_number": 0},
                )
                if created:
                    counter.last_number = max(
                        PermitApplication.objects.filter(mao_certificate_number__startswith=prefix).count(),
                        IssuedPermit.objects.filter(mao_certificate_number__startswith=prefix).count(),
                    )
                    counter.save(update_fields=["last_number"])

                counter.last_number += 1
                counter.save(update_fields=["last_number"])

            return f"{prefix}{counter.last_number:02d}"
        except IntegrityError:
            if attempt == 2:
                raise