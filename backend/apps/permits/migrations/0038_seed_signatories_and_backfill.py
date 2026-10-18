"""Seed the signatory roster and backfill existing applications.

Every document issued before this migration carried the single global
``MunicipalConfig.oic_name`` / ``oic_title`` pair, so the backfill pins that
same pair to all three documents of each existing application. That keeps the
record historically accurate and removes any reliance on the resolution
fallback chain for records that already exist.

A default is seeded for every position. Without that, approval — which is now
hard-required to have a resolvable signatory — would be blocked outright.
"""

from django.db import migrations

DOCUMENT_TYPES = ["AIC", "MAO_CERTIFICATE", "PERMIT"]

GLOBAL_FALLBACK_NAME = "AMALITA C. AMORES"
GLOBAL_FALLBACK_TITLE = "OIC - Municipal Agriculturist"

# (position, name, title) — one default per position.
ROSTER_SEED = [
    ("MUNICIPAL_AGRICULTURIST", "ENGR. LEONARDO R. ABUSTAN", "Municipal Agriculturist"),
    ("MUNICIPAL_VETERINARIAN", "DR. RENATO C. ALPAY", "Municipal Veterinarian"),
]


def seed(apps, schema_editor):
    Signatory = apps.get_model("permits", "Signatory")
    ApplicationSignatory = apps.get_model("permits", "ApplicationSignatory")
    PermitApplication = apps.get_model("permits", "PermitApplication")
    MunicipalConfig = apps.get_model("permits", "MunicipalConfig")

    config = MunicipalConfig.objects.first()
    historical_name = (config.oic_name if config else "") or GLOBAL_FALLBACK_NAME
    historical_title = (config.oic_title if config else "") or GLOBAL_FALLBACK_TITLE

    # The name every pre-existing document was actually printed with.
    historical, _ = Signatory.objects.get_or_create(
        position="OIC",
        name=historical_name,
        defaults={
            "title": historical_title,
            "is_active": True,
            "is_default": True,
        },
    )
    if not historical.is_default or not historical.is_active:
        historical.is_default = True
        historical.is_active = True
        historical.save()

    for position, name, title in ROSTER_SEED:
        Signatory.objects.get_or_create(
            position=position,
            name=name,
            defaults={"title": title, "is_active": True, "is_default": True},
        )

    already_assigned = set(
        ApplicationSignatory.objects.values_list("application_id", "document_type")
    )
    rows = [
        ApplicationSignatory(
            application_id=application_id,
            document_type=document_type,
            signatory=historical,
        )
        for application_id in PermitApplication.objects.values_list("id", flat=True)
        for document_type in DOCUMENT_TYPES
        if (application_id, document_type) not in already_assigned
    ]
    ApplicationSignatory.objects.bulk_create(rows)


def unseed(apps, schema_editor):
    # Both tables are introduced by 0037, so clearing them is a complete reversal.
    apps.get_model("permits", "ApplicationSignatory").objects.all().delete()
    apps.get_model("permits", "Signatory").objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("permits", "0037_signatory_roster"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
