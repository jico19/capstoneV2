"""
Seed Realistic Operations Script for Sariaya Hog Transport & Permit Management System
=======================================================================================
Generates rich, highly realistic end-to-end operational data for demonstration, presentation,
and testing purposes across all system user roles and workflow stages.

Usage:
    python manage.py runscript seed_realistic_operations
    # Or import and run with custom options:
    # from scripts.seed_realistic_operations import run
    # run(total_applications=160, months=12, clean=True)
"""

import os
import random
import uuid
import datetime
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.conf import settings

from apps.api.models import User, Notification, AuditTrail
from apps.maps.models import Barangay, HogSurvey
from apps.permits.models import (
    PermitApplication, TransportOrigin, SubmittedDocument,
    OPVValidation, OCRValidationResult, IssuedPermit
)
from apps.payment.models import PaymentHistory
from apps.inspector.models import InspectorLogs
from apps.sms.models import SMSLog


# ---------------------------------------------------------------------------
# Realistic Sariaya & Regional Metadata
# ---------------------------------------------------------------------------

SAMPLE_VEHICLES = [
    {"type": "Isuzu Elf Dropside Livestock Carrier", "plate": "DAE-4819"},
    {"type": "Mitsubishi Fuso Canter Closed Van", "plate": "NAY-3912"},
    {"type": "Hino 300 Series Livestock Transport", "plate": "WOT-8123"},
    {"type": "Isuzu Forward 6-Wheeler Hauler", "plate": "CAL-9041"},
    {"type": "Foton Tornado Swine Carrier", "plate": "NCA-2754"},
    {"type": "Hyundai Mighty Double Cab Dropside", "plate": "DBD-6628"},
    {"type": "Isuzu Giga Heavy Swine Hauler", "plate": "TAZ-1934"},
    {"type": "Mitsubishi Canter Custom Aluminum Cage", "plate": "EAA-5281"},
]

DESTINATION_CATALOG = [
    {
        "name": "Lucena City Public Slaughterhouse, Lucena City, Quezon",
        "route_direction": "east",
        "purpose": "For immediate commercial slaughter and distribution to Lucena Central Market.",
        "checkpoint": "Castañas Checkpoint",
        "checkpoint_coords": {"lat": 13.9328, "long": 121.5287}
    },
    {
        "name": "Batangas International Port (Inter-Island Shipping to Visayas), Batangas City",
        "route_direction": "southwest",
        "purpose": "For maritime transport and livestock trade delivery to Panay & Negros meat dealers.",
        "checkpoint": "Lutucan Checkpoint",
        "checkpoint_coords": {"lat": 13.9654, "long": 121.5103}
    },
    {
        "name": "San Jose Livestock & Meat Processing Center, Lipa City, Batangas",
        "route_direction": "west",
        "purpose": "For commercial slaughter, meat cutting, and dressed pork supply to CALABARZON supermarkets.",
        "checkpoint": "Lutucan Checkpoint",
        "checkpoint_coords": {"lat": 13.9654, "long": 121.5103}
    },
    {
        "name": "Tondo Central Slaughterhouse & Meat Depot, Vitas, Tondo, Manila",
        "route_direction": "northwest",
        "purpose": "Wholesale delivery for direct auction and supply to Divisoria & Pritil wet markets.",
        "checkpoint": "Lutucan Checkpoint",
        "checkpoint_coords": {"lat": 13.9654, "long": 121.5103}
    },
    {
        "name": "Calamba Livestock Distribution Hub & Growing Facility, Calamba, Laguna",
        "route_direction": "northwest",
        "purpose": "For grower swine restocking and contracted fattening facility transfer.",
        "checkpoint": "Lutucan Checkpoint",
        "checkpoint_coords": {"lat": 13.9654, "long": 121.5103}
    },
    {
        "name": "Dasmariñas Commercial Livestock Market, Dasmariñas, Cavite",
        "route_direction": "northwest",
        "purpose": "Live swine delivery for retail butchers and local institutional buyers.",
        "checkpoint": "Lutucan Checkpoint",
        "checkpoint_coords": {"lat": 13.9654, "long": 121.5103}
    },
    {
        "name": "Tayabas City Public Abattoir, Tayabas, Quezon",
        "route_direction": "northeast",
        "purpose": "Local meat distribution to Tayabas Public Market and institutional meat shops.",
        "checkpoint": "Bucal Checkpoint",
        "checkpoint_coords": {"lat": 13.9893, "long": 121.5231}
    },
    {
        "name": "San Fernando Wholesale Food Terminal, City of San Fernando, Pampanga",
        "route_direction": "north",
        "purpose": "Inter-regional live hog transfer for North Luzon meat processing contracts.",
        "checkpoint": "Lutucan Checkpoint",
        "checkpoint_coords": {"lat": 13.9654, "long": 121.5103}
    },
    {
        "name": "Pasay City Public Abattoir & Cold Storage, Pasay City, Metro Manila",
        "route_direction": "northwest",
        "purpose": "For slaughter and daily carcass deliveries to Pasay and Parañaque commercial outlets.",
        "checkpoint": "Lutucan Checkpoint",
        "checkpoint_coords": {"lat": 13.9654, "long": 121.5103}
    },
    {
        "name": "Candelaria Livestock Trading Post, Candelaria, Quezon",
        "route_direction": "west",
        "purpose": "Live hog trade and consignment to registered regional swine traders.",
        "checkpoint": "Lutucan Checkpoint",
        "checkpoint_coords": {"lat": 13.9654, "long": 121.5103}
    }
]


# ---------------------------------------------------------------------------
# Dummy Physical File Helper
# ---------------------------------------------------------------------------

def ensure_sample_media_file(relative_path: str, file_type: str = "pdf") -> str:
    """
    Creates a valid minimal placeholder file in the media directory if it does
    not already exist, preventing FileNotFoundError and 404 errors when testing.
    """
    full_path = os.path.join(settings.MEDIA_ROOT, relative_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    if not os.path.exists(full_path):
        if file_type == "pdf":
            # Minimal 1-page valid PDF structure
            pdf_content = (
                b"%PDF-1.4\n"
                b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
                b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
                b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n"
                b"xref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\n"
                b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n"
            )
            with open(full_path, "wb") as f:
                f.write(pdf_content)
        else:
            # Minimal 1x1 transparent PNG structure
            png_content = (
                b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
                b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05"
                b"\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
            )
            with open(full_path, "wb") as f:
                f.write(png_content)

    return relative_path


# ---------------------------------------------------------------------------
# Main Seeding Routine
# ---------------------------------------------------------------------------

def run(total_applications: int = 160, months: int = 12, clean: bool = True):
    print("=" * 80)
    print(" STARTING REALISTIC OPERATIONS SEED SCRIPT FOR SARIAYA LIVESTOCK SYSTEM")
    print(f" Target: {total_applications} applications over past {months} months")
    print("=" * 80)

    # 1. Clean up operational data if requested
    if clean:
        print("\n[Step 1/6] Cleaning up old operational records...")
        AuditTrail.objects.all().delete()
        Notification.objects.all().delete()
        SMSLog.objects.all().delete()
        InspectorLogs.objects.all().delete()
        PaymentHistory.objects.all().delete()
        IssuedPermit.objects.all().delete()
        OPVValidation.objects.all().delete()
        OCRValidationResult.objects.all().delete()
        SubmittedDocument.objects.all().delete()
        TransportOrigin.objects.all().delete()
        PermitApplication.objects.all().delete()
        HogSurvey.objects.all().delete()
        print("  -> Existing operational and survey data successfully cleared.")

    # 2. Check Barangays
    barangays = list(Barangay.objects.all())
    if not barangays:
        print("\n[!] ERROR: No Barangays found in the database.")
        print("    Please run 'python manage.py runscript barangay' first to seed Sariaya barangays.")
        return

    print(f"\n[Step 2/6] Found {len(barangays)} Sariaya Barangays.")

    # 3. Create / Standardize Key Users Across All Roles
    print("\n[Step 3/6] Setting up realistic user accounts with 'password123'...")

    def get_or_create_user(username, role, first_name, last_name, barangay=None, phone_suffix="0001", is_staff_user=False):
        email = f"{username}@sariaya.gov.ph" if role in ['Agri', 'Opv', 'Admin', 'Barangay'] else f"{username}@gmail.com"
        phone = f"0917{phone_suffix}"

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'role': role,
                'email': email,
                'phone_no': phone,
                'first_name': first_name,
                'last_name': last_name,
                'address': f"{barangay.name if barangay else 'Poblacion'}, Sariaya, Quezon",
                'barangay': barangay,
                'receive_sms': True,
                'is_staff': is_staff_user or (role in ['Admin', 'Agri']),
                'is_superuser': (role == 'Admin' and username == 'admin')
            }
        )
        if created or not user.check_password("password123"):
            user.set_password("password123")
            user.save()
            print(f"  + Created User: {username:<22} [{role:<10}] - {first_name} {last_name}")
        else:
            print(f"  = Ready User:   {username:<22} [{role:<10}] - {first_name} {last_name}")
        return user

    # Admin User
    admin_user = get_or_create_user("admin", "Admin", "Municipal", "Administrator", None, "0000", True)

    # Municipal Agriculture Officers (Office of the Municipal Agriculturist - OMA Sariaya)
    agri_officers = [
        get_or_create_user("agri_user123", "Agri", "Armando", "Agripino", None, "1001", True),
        get_or_create_user("agri_officer_luis", "Agri", "Luis", "Santos", None, "1002", True),
        get_or_create_user("agri_officer_sandra", "Agri", "Sandra", "Reyes", None, "1003", True),
    ]

    # Office of the Provincial Veterinarian (OPV Quezon) Staff
    opv_staffs = [
        get_or_create_user("opv_user123", "Opv", "Olivia", "Providencia", None, "2001", False),
        get_or_create_user("opv_staff_rose", "Opv", "Rosemary", "Cruz", None, "2002", False),
        get_or_create_user("opv_staff_mark", "Opv", "Mark", "Alcantara", None, "2003", False),
    ]

    # Field Checkpoint Livestock Inspectors
    inspectors = [
        get_or_create_user("inspector_mario", "Inspector", "Mario", "Dalisay", None, "3001", False),
        get_or_create_user("inspector_clara", "Inspector", "Clara", "De Guzman", None, "3002", False),
        get_or_create_user("inspector_juan", "Inspector", "Juan", "Luna", None, "3003", False),
    ]

    # Barangay Officials
    lutucan_bg = next((b for b in barangays if "Lutucan" in b.name), barangays[0])
    castanas_bg = next((b for b in barangays if "Casta" in b.name or "Canda" in b.name), barangays[1])
    bucal_bg = next((b for b in barangays if "Bucal" in b.name), barangays[2])

    barangay_officials = [
        get_or_create_user("brgy_lutucan", "Barangay", "Ernesto", "Vega", lutucan_bg, "4001", False),
        get_or_create_user("brgy_castanas", "Barangay", "Rodrigo", "Castillo", castanas_bg, "4002", False),
        get_or_create_user("brgy_bucal", "Barangay", "Maria", "Hernandez", bucal_bg, "4003", False),
    ]

    # Registered Hog Raisers / Farmers across Sariaya Barangays
    farmer_seed_data = [
        ("jerwin_nico", "Jerwin", "Nico", lutucan_bg, "5001"),
        ("farmer_lucio", "Lucio", "Valdez", castanas_bg, "5002"),
        ("farmer_kristel", "Kristel", "Santos", bucal_bg, "5003"),
        ("farmer_dondon", "Dondon", "Ramos", random.choice(barangays), "5004"),
        ("farmer_analyn", "Analyn", "Perez", random.choice(barangays), "5005"),
        ("farmer_bryan", "Bryan", "Gomez", random.choice(barangays), "5006"),
        ("farmer_elena", "Elena", "Torres", random.choice(barangays), "5007"),
        ("farmer_nestor", "Nestor", "Aquino", random.choice(barangays), "5008"),
        ("farmer_renato", "Renato", "Villanueva", random.choice(barangays), "5009"),
        ("farmer_marites", "Marites", "De Chavez", random.choice(barangays), "5010"),
        ("farmer_pedro", "Pedro", "Alcala", random.choice(barangays), "5011"),
        ("farmer_lourdes", "Lourdes", "Custodio", random.choice(barangays), "5012"),
    ]

    farmers = [
        get_or_create_user(uname, "Farmer", fname, lname, bg, pnum, False)
        for uname, fname, lname, bg, pnum in farmer_seed_data
    ]

    # 4. Hog Survey Full 2022-2026 Naturalized Seasonal Time Series Generation
    print("\n[Step 4/6] Generating naturalized 2022–2026 quarterly Hog Surveys across all density tiers...")

    # 5-Tier Authentic Sariaya Density Zoning
    VERY_HIGH_BARANGAYS = ["lutucan 1", "lutucan malabag"]
    HIGH_BARANGAYS = [
        "lutucan bata", "guisguis-san roque", "guisguis-talon", "manggalang 1",
        "manggalang-bantilan", "concepcion banahaw", "concepcion pinagbakuran",
        "bignay 1", "bignay 2", "janagdong 1"
    ]
    NONE_BARANGAYS = ["barangay 4", "barangay 5", "barangay 6"]
    LOW_BARANGAYS = ["barangay 1", "barangay 2", "barangay 3", "casta", "talaan", "tumbaga"]

    def get_barangay_tier(name):
        name_lower = name.lower()
        if any(k in name_lower for k in VERY_HIGH_BARANGAYS):
            return "VERY_HIGH"
        elif any(k in name_lower for k in HIGH_BARANGAYS):
            return "HIGH"
        elif any(k in name_lower for k in NONE_BARANGAYS):
            return "NONE"
        elif any(k in name_lower for k in LOW_BARANGAYS):
            return "LOW"
        return "MEDIUM"

    all_survey_dates = [
        # 2022
        datetime.date(2022, 3, 31),
        datetime.date(2022, 6, 30),
        datetime.date(2022, 9, 30),
        datetime.date(2022, 12, 31),
        # 2023
        datetime.date(2023, 3, 31),
        datetime.date(2023, 6, 30),
        datetime.date(2023, 9, 30),
        datetime.date(2023, 12, 31),
        # 2024
        datetime.date(2024, 3, 31),
        datetime.date(2024, 6, 30),
        datetime.date(2024, 9, 30),
        datetime.date(2024, 12, 31),
        # 2025
        datetime.date(2025, 3, 31),
        datetime.date(2025, 6, 30),
        datetime.date(2025, 9, 30),
        datetime.date(2025, 12, 31),
        # 2026
        datetime.date(2026, 3, 31),
        datetime.date(2026, 6, 30),
    ]

    all_surveys_to_create = []

    for bg in barangays:
        tier = get_barangay_tier(bg.name)

        # Baseline seed values per tier
        if tier == "VERY_HIGH":
            base_inahin = random.randint(45, 55)
            base_barako = random.randint(4, 5)
            base_fattener = random.randint(140, 180)
            base_grower = random.randint(120, 160)
            base_starter = random.randint(70, 100)
            base_bulaw = random.randint(15, 25)
        elif tier == "HIGH":
            base_inahin = random.randint(16, 26)
            base_barako = random.randint(2, 3)
            base_fattener = random.randint(55, 90)
            base_grower = random.randint(50, 85)
            base_starter = random.randint(30, 55)
            base_bulaw = random.randint(6, 16)
        elif tier == "MEDIUM":
            base_inahin = random.randint(5, 10)
            base_barako = 1
            base_fattener = random.randint(15, 32)
            base_grower = random.randint(14, 28)
            base_starter = random.randint(8, 20)
            base_bulaw = random.randint(3, 8)
        elif tier == "LOW":
            base_inahin = random.randint(1, 3)
            base_barako = 1 if base_inahin >= 2 else 0
            base_fattener = random.randint(4, 10)
            base_grower = random.randint(3, 8)
            base_starter = random.randint(2, 5)
            base_bulaw = random.randint(1, 3)
        else:  # NONE (Urban commercial center)
            base_inahin = 0
            base_barako = 0
            base_fattener = 0
            base_grower = 0
            base_starter = 0
            base_bulaw = 0

        for s_date in all_survey_dates:
            quarter = (s_date.month - 1) // 3 + 1
            year = s_date.year

            # 1. Multi-Year Macro Cycle Factors
            if year == 2022:
                year_mult = 0.95
            elif year == 2023:
                year_mult = 1.05
            elif year == 2024:
                year_mult = 0.90 if quarter in [2, 3] else 1.02  # Mid-year ASF preventive market dip
            elif year == 2025:
                year_mult = 1.15  # Post-recovery expansion
            else:  # 2026
                year_mult = 1.12  # Modern stable

            # 2. Natural Seasonal Biological Multipliers
            inahin_mult = 1.0
            barako_mult = 1.0
            fattener_mult = 1.0
            grower_mult = 1.0
            starter_mult = 1.0

            if quarter == 1:  # Post-holiday farrowing & restocking
                starter_mult = 1.20
                fattener_mult = 0.85
                inahin_mult = 1.05
            elif quarter == 2:  # Mid-year growth
                grower_mult = 1.20
                starter_mult = 0.95
            elif quarter == 3:  # Pre-holiday fattening surge
                fattener_mult = 1.25
                grower_mult = 1.10
            elif quarter == 4:  # Peak holiday readiness & transport sales
                fattener_mult = 1.30
                inahin_mult = 1.10
                barako_mult = 1.05

            # 3. Organic Local Noise (+/- 8% random walk)
            noise = random.uniform(0.92, 1.08)

            if tier == "NONE":
                # Urban center: 75% chance of 0, 25% chance of 1-3 backyard hogs
                if random.random() < 0.25:
                    fattener = random.randint(1, 2)
                    grower = random.randint(0, 1)
                    inahin = barako = starter = bulaw = 0
                else:
                    fattener = grower = inahin = barako = starter = bulaw = 0
            else:
                inahin = max(0, int(base_inahin * year_mult * inahin_mult * noise))
                barako = max(0, int(base_barako * year_mult * barako_mult * noise))
                fattener = max(0, int(base_fattener * year_mult * fattener_mult * noise))
                grower = max(0, int(base_grower * year_mult * grower_mult * noise))
                starter = max(0, int(base_starter * year_mult * starter_mult * noise))
                bulaw = max(0, int(base_bulaw * year_mult * noise))

                # Enforce biological consistency
                if inahin > 0:
                    barako = max(barako, 1 if inahin >= 3 else 0)

            total = inahin + barako + fattener + grower + starter + bulaw

            all_surveys_to_create.append(HogSurvey(
                barangay=bg,
                survey_date=s_date,
                inahin=inahin,
                barako=barako,
                fattener=fattener,
                grower=grower,
                starter=starter,
                bulaw=bulaw,
                total_pigs=total
            ))

    if all_surveys_to_create:
        HogSurvey.objects.bulk_create(all_surveys_to_create)
        print(f"  + Added {len(all_surveys_to_create)} naturalized quarterly Hog Survey records spanning 2022–2026 (all density tiers covered).")

    # 5. Generate Realistic Operational Applications & Lifecycle Data
    print(f"\n[Step 5/6] Generating {total_applications} realistic Permit Applications & workflows...")

    now = timezone.now()
    start_time = now - timedelta(days=months * 30)

    timestamps = []
    total_seconds = int((now - start_time).total_seconds())

    for _ in range(total_applications):
        weight = random.random() ** 1.35
        offset_seconds = int(total_seconds * weight)
        app_dt = start_time + timedelta(seconds=offset_seconds)

        hour = random.randint(7, 16)
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        app_dt = app_dt.replace(hour=hour, minute=minute, second=second)

        if app_dt.weekday() == 6:
            app_dt += timedelta(days=1)

        timestamps.append(app_dt)

    timestamps.sort()

    recent_cutoff = now - timedelta(days=14)

    recent_status_weights = [
        ('DRAFT', 0.08),
        ('SUBMITTED', 0.10),
        ('RESUBMISSION', 0.06),
        ('OCR_VALIDATED', 0.08),
        ('MANUAL', 0.08),
        ('FORWARDED_TO_OPV', 0.10),
        ('OPV_VALIDATED', 0.08),
        ('OPV_REJECTED', 0.08),
        ('PAYMENT_PENDING', 0.12),
        ('RELEASED', 0.22)
    ]
    recent_statuses, recent_weights = zip(*recent_status_weights)

    guaranteed_demo_statuses = [
        'DRAFT',
        'SUBMITTED',
        'RESUBMISSION',
        'OCR_VALIDATED',
        'MANUAL',
        'FORWARDED_TO_OPV',
        'OPV_VALIDATED',
        'PAYMENT_PENDING',
        'RELEASED',
        'OPV_REJECTED'
    ]

    apps_created = 0

    with transaction.atomic():
        for idx, created_at in enumerate(timestamps):
            farmer = random.choice(farmers)
            dest_info = random.choice(DESTINATION_CATALOG)
            vehicle_info = random.choice(SAMPLE_VEHICLES)

            is_recent = created_at >= recent_cutoff
            last_records_start = total_applications - len(guaranteed_demo_statuses)

            if idx >= last_records_start:
                status = guaranteed_demo_statuses[idx - last_records_start]
            elif not is_recent:
                status = 'RELEASED' if random.random() < 0.94 else 'OPV_REJECTED'
            else:
                status = random.choices(recent_statuses, weights=recent_weights, k=1)[0]

            transport_date = (created_at + timedelta(days=random.randint(1, 4))).date()
            purpose_text = f"{dest_info['purpose']} Transport via {vehicle_info['type']} (Plate: {vehicle_info['plate']})."

            # 1. Create PermitApplication
            app = PermitApplication.objects.create(
                farmer=farmer,
                status=status,
                destination=dest_info['name'],
                transport_date=transport_date,
                purpose=purpose_text,
                is_issued=(status == 'RELEASED'),
                is_checked=False
            )

            AuditTrail.objects.create(
                who_performed=farmer,
                what_performed=f"[APPLICATION_CREATED] - Farmer {farmer.get_full_name()} initiated Transport Permit application ({app.application_id}).",
                when_performed=created_at
            )

            SMSLog.objects.create(
                phone_number=farmer.phone_no,
                message_type=SMSLog.Type.OTP,
                status_captured="success",
                send_at=created_at
            )

            submitted_at = None
            if status != 'DRAFT':
                submitted_at = created_at + timedelta(minutes=random.randint(15, 180))

                AuditTrail.objects.create(
                    who_performed=farmer,
                    what_performed=f"[APPLICATION_SUBMITTED] - Application #{app.pk} ({app.application_id}) submitted for municipal validation.",
                    when_performed=submitted_at
                )

                SMSLog.objects.create(
                    phone_number=farmer.phone_no,
                    message_type=SMSLog.Type.NOTIFICATION,
                    status_captured="success",
                    send_at=submitted_at
                )

                Notification.objects.create(
                    recipient=farmer,
                    type=Notification.Type.INFO,
                    title="Permit Application Submitted",
                    message=f"Your permit application {app.application_id} for transport to {dest_info['name'][:30]}... has been received.",
                    sent_at=submitted_at
                )

                # 2. Transport Origins & Breakdown
                origin_bg = farmer.barangay or random.choice(barangays)
                num_origins = 1 if random.random() < 0.85 else 2
                chosen_bgs = [origin_bg]
                if num_origins > 1:
                    other_bg = random.choice([b for b in barangays if b.id != origin_bg.id])
                    chosen_bgs.append(other_bg)

                origins = []
                total_swine_in_app = 0

                for bg in chosen_bgs:
                    batch_total = random.randint(4, 18)
                    fattener_count = int(batch_total * random.uniform(0.60, 0.90))
                    grower_count = batch_total - fattener_count
                    bulaw_count = random.randint(0, 2) if random.random() < 0.2 else 0
                    starter_count = 0
                    inahin_count = random.randint(1, 3) if "breeding" in dest_info['purpose'].lower() else 0
                    barako_count = 1 if (inahin_count > 0 and random.random() < 0.3) else 0

                    total_origin_pigs = fattener_count + grower_count + bulaw_count + starter_count + inahin_count + barako_count
                    if total_origin_pigs == 0:
                        fattener_count = batch_total
                        total_origin_pigs = batch_total

                    total_swine_in_app += total_origin_pigs

                    origin = TransportOrigin(
                        application=app,
                        barangay=bg,
                        number_of_pigs=total_origin_pigs,
                        fattener=fattener_count,
                        grower=grower_count,
                        bulaw=bulaw_count,
                        starter=starter_count,
                        inahin=inahin_count,
                        barako=barako_count
                    )
                    origin.save_base(raw=True)
                    origins.append(origin)

                # 3. Submitted Documents & OCR Validation Results
                standard_docs = [
                    SubmittedDocument.DocumentType.CIS,
                    SubmittedDocument.DocumentType.TRADERS_PASS,
                    SubmittedDocument.DocumentType.HANDLERS_LICENSE,
                    SubmittedDocument.DocumentType.TRANSPORT_CARRIER_REG,
                ]
                if random.random() < 0.75:
                    standard_docs.append(SubmittedDocument.DocumentType.ENDORSEMENT_CERTIFICATE)

                for origin in origins:
                    for dtype in standard_docs:
                        doc_filename = f"submitted_docs/mock_{dtype}_{app.pk}_{origin.pk}.pdf"
                        ensure_sample_media_file(doc_filename, "pdf")

                        sub_doc = SubmittedDocument.objects.create(
                            origin=origin,
                            document_type=dtype,
                            file=doc_filename
                        )

                        ocr_time = submitted_at + timedelta(minutes=random.randint(2, 12))

                        if status in ['DRAFT', 'SUBMITTED', 'MANUAL']:
                            ocr_status = OCRValidationResult.ValidationStatus.PASSED if random.random() < 0.7 else OCRValidationResult.ValidationStatus.MANUAL
                        elif status == 'RESUBMISSION':
                            ocr_status = OCRValidationResult.ValidationStatus.MANUAL
                        else:
                            ocr_status = OCRValidationResult.ValidationStatus.PASSED if random.random() < 0.85 else OCRValidationResult.ValidationStatus.OVERRIDDEN

                        extracted_metadata = {
                            "document_type": str(dtype),
                            "document_number": f"{dtype[:3].upper()}-SAR-{created_at.year}-{random.randint(10000, 99999)}",
                            "owner_name": f"{farmer.first_name} {farmer.last_name}",
                            "origin_barangay": origin.barangay.name,
                            "expiry_date": str(transport_date + timedelta(days=random.randint(45, 365))),
                            "vehicle_plate": vehicle_info['plate'],
                            "confidence_score": round(random.uniform(0.91, 0.99), 4),
                            "issuing_office": "Municipal Agriculture Office - Sariaya, Quezon"
                        }

                        ocr_record = OCRValidationResult.objects.create(
                            document=sub_doc,
                            status=ocr_status,
                            extracted_field=extracted_metadata,
                            remarks={
                                "verification": "Standard template verified, official municipal seal detected.",
                                "legibility": "Clear, all fields extracted with high confidence."
                            },
                            validated_at=ocr_time
                        )

                        if ocr_status == OCRValidationResult.ValidationStatus.OVERRIDDEN:
                            override_time = ocr_time + timedelta(minutes=random.randint(15, 60))
                            officer = random.choice(agri_officers)
                            ocr_record.manually_overridden = True
                            ocr_record.overridden_by = officer
                            ocr_record.overridden_at = override_time
                            ocr_record.overridden_fields = {
                                "remarks": "Visual verification confirmed. Wet signature verified against barangay records."
                            }
                            ocr_record.save()

                            AuditTrail.objects.create(
                                who_performed=officer,
                                what_performed=f"[OCR_MANUAL_OVERRIDE] - Document #{sub_doc.pk} ({sub_doc.get_document_type_display()}) manually approved by {officer.get_full_name()}.",
                                when_performed=override_time
                            )

                # 4. OPV Validation (Quezon Provincial Veterinary Review)
                opv_eligible = status in ['OPV_VALIDATED', 'OPV_REJECTED', 'PAYMENT_PENDING', 'RELEASED']
                if opv_eligible:
                    opv_time = submitted_at + timedelta(hours=random.randint(2, 18))
                    opv_staff = random.choice(opv_staffs)
                    opv_status = OPVValidation.Status.REJECTED if status == 'OPV_REJECTED' else OPVValidation.Status.VALIDATED

                    if opv_status == OPVValidation.Status.VALIDATED:
                        vhc_file = f"opv_docs/vhc/VHC_{app.pk}_{created_at.strftime('%Y%m%d')}.pdf"
                        pass_file = f"opv_docs/pass/PASS_{app.pk}_{created_at.strftime('%Y%m%d')}.pdf"
                        ensure_sample_media_file(vhc_file, "pdf")
                        ensure_sample_media_file(pass_file, "pdf")
                        remarks_msg = f"Veterinary Health Inspection cleared. All {total_swine_in_app} swine certified free from ASF and clinical signs of contagious diseases."
                    else:
                        vhc_file = None
                        pass_file = None
                        remarks_msg = "Disapproved: Missing updated ASF negative test certificate from source farm within the prescribed 14-day validity."

                    opv_val = OPVValidation.objects.create(
                        application=app,
                        opv_staff=opv_staff,
                        status=opv_status,
                        remarks=remarks_msg,
                        validated_at=opv_time,
                        veterinary_health_certificate=vhc_file,
                        transportation_pass=pass_file
                    )

                    AuditTrail.objects.create(
                        who_performed=opv_staff,
                        what_performed=f"[OPV_REVIEW_{opv_status}] - Provincial Veterinary Officer {opv_staff.get_full_name()} marked Application #{app.pk} as {opv_status}.",
                        when_performed=opv_time
                    )

                    Notification.objects.create(
                        recipient=farmer,
                        type=Notification.Type.SUCCESS if opv_status == OPVValidation.Status.VALIDATED else Notification.Type.WARNING,
                        title=f"OPV Review: {opv_val.get_status_display()}",
                        message=remarks_msg,
                        sent_at=opv_time
                    )

                    SMSLog.objects.create(
                        phone_number=farmer.phone_no,
                        message_type=SMSLog.Type.NOTIFICATION,
                        status_captured="success",
                        send_at=opv_time
                    )

                    # 5. Issued Permit & Payment Records
                    has_permit = status in ['PAYMENT_PENDING', 'RELEASED']
                    if has_permit:
                        issued_time = opv_time + timedelta(minutes=random.randint(10, 45))
                        permit_number = f"LP{created_at.strftime('%y')}-{idx+1000:04d}-{random.randint(10,99)}"
                        qr_token = str(uuid.uuid4())
                        is_paid = (status == 'RELEASED')

                        pay_method = (
                            IssuedPermit.PaymentMethodChoices.ONLINE
                            if random.random() < 0.60
                            else IssuedPermit.PaymentMethodChoices.OFFLINE
                        ) if is_paid else ""

                        permit_pdf_path = f"issued_docs/permits/PERMIT_{permit_number}.pdf"
                        aic_number = f"AIC-{issued_time.strftime('%m%d')}-{random.randint(100, 999):03d}-{issued_time.strftime('%y')}"
                        aic_pdf_path = f"issued_docs/aic/AIC_{permit_number}.pdf"

                        if is_paid:
                            ensure_sample_media_file(permit_pdf_path, "pdf")
                            ensure_sample_media_file(aic_pdf_path, "pdf")

                        issued_permit = IssuedPermit.objects.create(
                            permit_number=permit_number,
                            application=app,
                            issued_by=opv_staff,
                            qr_token=qr_token,
                            is_paid=is_paid,
                            payment_method=pay_method,
                            permit_fee=Decimal("150.00"),
                            permit_pdf=permit_pdf_path if is_paid else None,
                            aic_number=aic_number if is_paid else "",
                            aic_pdf=aic_pdf_path if is_paid else None,
                            date_issued=issued_time.date(),
                            valid_until=issued_time.date() + timedelta(days=3)
                        )

                        app.is_issued = is_paid
                        app.issued_at = issued_time if is_paid else None
                        app.save()

                        AuditTrail.objects.create(
                            who_performed=opv_staff,
                            what_performed=f"[PERMIT_ISSUED] - Local Transport Permit #{permit_number} prepared by OPV Staff {opv_staff.get_full_name()}.",
                            when_performed=issued_time
                        )

                        # Payment History
                        payment_time = issued_time + timedelta(minutes=random.randint(15, 120))
                        pay_status = PaymentHistory.Status.SUCCESS if is_paid else PaymentHistory.Status.PENDING

                        if pay_method == IssuedPermit.PaymentMethodChoices.ONLINE:
                            pay_channel = random.choice(['gcash', 'paymaya', 'card', 'qrph'])
                            confirming_officer = None
                        else:
                            pay_channel = 'gcash'
                            confirming_officer = random.choice(agri_officers) if is_paid else None

                        pay_history = PaymentHistory.objects.create(
                            issued_permit=issued_permit,
                            method=pay_channel,
                            status=pay_status,
                            amount=150,
                            paymongo_payment_id=f"pay_{uuid.uuid4().hex[:20]}" if is_paid else "",
                            paymongo_session_id=f"cs_{uuid.uuid4().hex[:20]}" if is_paid else "",
                            paymongo_payment_intent_id=f"pi_{uuid.uuid4().hex[:20]}" if is_paid else "",
                            confirmed_by=confirming_officer,
                            confirmed_at=payment_time if is_paid else None,
                            or_number=f"OR-{created_at.year}-{random.randint(1000000, 9999999)}" if is_paid else ""
                        )

                        if is_paid:
                            AuditTrail.objects.create(
                                who_performed=confirming_officer or admin_user,
                                what_performed=f"[PAYMENT_CONFIRMED] - Official Receipt #{pay_history.or_number} generated. Payment of ₱150.00 confirmed for Permit #{permit_number}.",
                                when_performed=payment_time
                            )

                            Notification.objects.create(
                                recipient=farmer,
                                type=Notification.Type.SUCCESS,
                                title="Transport Permit Released",
                                message=f"Payment verified (OR #{pay_history.or_number}). Permit #{permit_number} is active and valid until {issued_permit.valid_until}.",
                                sent_at=payment_time
                            )

                            SMSLog.objects.create(
                                phone_number=farmer.phone_no,
                                message_type=SMSLog.Type.NOTIFICATION,
                                status_captured="success",
                                send_at=payment_time
                            )

                            # 6. Checkpoint Verification (Field Inspector Logs)
                            is_past_transport = transport_date <= now.date()
                            if is_past_transport and random.random() < 0.90:
                                scan_hour = random.randint(6, 17)
                                scan_min = random.randint(0, 59)
                                scan_time = timezone.make_aware(
                                    datetime.datetime.combine(transport_date, datetime.time(scan_hour, scan_min))
                                )

                                if "Lutucan" in dest_info['checkpoint']:
                                    inspector = inspectors[0]
                                elif "Castañas" in dest_info['checkpoint']:
                                    inspector = inspectors[1]
                                else:
                                    inspector = inspectors[2]

                                jitter_lat = random.normalvariate(0, 0.00015)
                                jitter_lng = random.normalvariate(0, 0.00015)
                                cp_lat = dest_info['checkpoint_coords']['lat'] + jitter_lat
                                cp_lng = dest_info['checkpoint_coords']['long'] + jitter_lng

                                inspector_log = InspectorLogs.objects.create(
                                    inspector=inspector,
                                    application=app,
                                    notes=(
                                        f"Scanned at {dest_info['checkpoint']}. Verified {total_swine_in_app} swine onboard "
                                        f"{vehicle_info['type']} ({vehicle_info['plate']}). VHC and AIC seals intact."
                                    ),
                                    lat=cp_lat,
                                    longi=cp_lng
                                )
                                InspectorLogs.objects.filter(pk=inspector_log.pk).update(scanned_at=scan_time)

                                app.is_checked = True
                                app.save()

                                AuditTrail.objects.create(
                                    who_performed=inspector,
                                    what_performed=f"[CHECKPOINT_INSPECTED] - Permit #{permit_number} verified at {dest_info['checkpoint']} by Inspector {inspector.get_full_name()}.",
                                    when_performed=scan_time
                                )

                                Notification.objects.create(
                                    recipient=farmer,
                                    type=Notification.Type.INFO,
                                    title="Checkpoint Inspection Verified",
                                    message=f"Your livestock transport passed inspection at {dest_info['checkpoint']} on {transport_date}.",
                                    sent_at=scan_time
                                )

            # Update auto_now timestamps to match the realistic timeline
            final_updated = created_at
            if submitted_at:
                final_updated = submitted_at
                if status in ['OPV_VALIDATED', 'OPV_REJECTED', 'PAYMENT_PENDING', 'RELEASED']:
                    final_updated = opv_time if 'opv_time' in locals() else submitted_at
                    if status == 'RELEASED' and 'payment_time' in locals():
                        final_updated = payment_time

            PermitApplication.objects.filter(pk=app.pk).update(
                status=status,
                created_at=created_at,
                updated_at=final_updated,
                submitted_at=submitted_at
            )

            apps_created += 1
            if apps_created % 25 == 0 or apps_created == total_applications:
                print(f"  -> Generated {apps_created}/{total_applications} applications...")

    # 6. Summary Report
    print("\n" + "=" * 80)
    print(" SEEDING COMPLETED SUCCESSFULLY!")
    print("=" * 80)
    print(f"  • Total Users:            {User.objects.count()} (Admin, Agri, OPV, Inspectors, Barangay, Farmers)")
    print(f"  • Total Barangays:        {Barangay.objects.count()}")
    print(f"  • Total Hog Surveys:      {HogSurvey.objects.count()} quarterly records")
    print(f"  • Total Applications:     {PermitApplication.objects.count()}")
    print(f"  • Total Submitted Docs:   {SubmittedDocument.objects.count()}")
    print(f"  • Total OCR Results:      {OCRValidationResult.objects.count()}")
    print(f"  • Total OPV Validations:  {OPVValidation.objects.count()}")
    print(f"  • Total Issued Permits:   {IssuedPermit.objects.count()}")
    print(f"  • Total Payments Logged:  {PaymentHistory.objects.count()}")
    print(f"  • Total Inspector Logs:   {InspectorLogs.objects.count()}")
    print(f"  • Total Notifications:    {Notification.objects.count()}")
    print(f"  • Total SMS Logs:         {SMSLog.objects.count()}")
    print(f"  • Total Audit Trails:     {AuditTrail.objects.count()}")
    print("=" * 80)
    print(" Ready for demonstration and test runs.")
    print("=" * 80)


if __name__ == "__main__":
    import django
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    django.setup()
    run()
