import random
import uuid
import datetime
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from faker import Faker

from apps.api.models import User, Notification, AuditTrail
from apps.maps.models import Barangay, HogSurvey
from apps.permits.models import (
    PermitApplication, TransportOrigin, SubmittedDocument,
    OPVValidation, OCRValidationResult, IssuedPermit
)
from apps.payment.models import PaymentHistory
from apps.inspector.models import InspectorLogs
from apps.sms.models import SMSLog

fake = Faker()

def run():
    print("Starting operational mock data generation...")

    # Disconnect signals to prevent side effects and background tasks during mock data generation
    from django.db.models.signals import post_save, pre_save
    from apps.sms.signals import send_sms_update_approve, capture_old_status
    from apps.permits.signals import trigger_ocr_flow, trigger_opv_flow, trigger_payment_flow
    from apps.permits.models import PermitApplication, SubmittedDocument, OPVValidation, IssuedPermit

    post_save.disconnect(send_sms_update_approve, sender=PermitApplication)
    pre_save.disconnect(capture_old_status, sender=PermitApplication)
    post_save.disconnect(trigger_ocr_flow, sender=SubmittedDocument)
    post_save.disconnect(trigger_opv_flow, sender=OPVValidation)
    post_save.disconnect(trigger_payment_flow, sender=IssuedPermit)

    # 1. Clean up existing operational data
    # (Leaving Barangays and existing HogSurveys alone, but we will add more recent surveys)
    print("Cleaning up old operational records...")
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
    
    # Clean up non-default users (except standard admin/test users if we want to keep them)
    # We will keep jerwin_nico, admin, agri_user123, opv_user123, but delete other custom ones to start fresh
    default_usernames = ['jerwin_nico', 'admin', 'agri_user123', 'opv_user123']
    User.objects.exclude(username__in=default_usernames).delete()

    # Get or create default users if they are missing
    barangays = list(Barangay.objects.all())
    if not barangays:
        print("ERROR: No Barangays found in the database. Please run 'python manage.py runscript barangay' first.")
        return

    print(f"Loaded {len(barangays)} Barangays.")

    # Helper to get or create users
    def create_mock_user(username, role, first_name, last_name, barangay=None):
        email = f"{username}@farmpass.gov.ph" if role in ['Agri', 'Opv', 'Admin'] else f"{username}@gmail.com"
        phone = f"09{random.randint(10000000, 99999999)}"
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'role': role,
                'email': email,
                'phone_no': phone,
                'first_name': first_name,
                'last_name': last_name,
                'address': f"Sariaya, Quezon",
                'barangay': barangay,
                'receive_sms': True,
            }
        )
        if created:
            user.set_password("password123")
            user.save()
            print(f"Created user: {username} ({role})")
        else:
            print(f"Using existing user: {username} ({role})")
        return user

    def get_logical_checkpoint(destination):
        dest_lower = destination.lower()
        if any(keyword in dest_lower for keyword in ["manila", "batangas", "laguna", "cavite", "pasay", "lipa", "pampanga"]):
            return {"name": "Lutucan Checkpoint", "lat": 13.9654, "long": 121.5103}
        elif "tayabas" in dest_lower:
            return {"name": "Bucal Checkpoint", "lat": 13.9893, "long": 121.5231}
        else:
            return {"name": "Castañas Checkpoint", "lat": 13.9328, "long": 121.5287}

    # Create administrative, opv, inspector and farmer users
    agri_officers = [
        create_mock_user("agri_user123", "Agri", "Armando", "Agripino"),
        create_mock_user("agri_officer_luis", "Agri", "Luis", "Santos"),
        create_mock_user("agri_officer_sandra", "Agri", "Sandra", "Reyes"),
    ]
    
    opv_staffs = [
        create_mock_user("opv_user123", "Opv", "Olivia", "Provincial"),
        create_mock_user("opv_staff_rose", "Opv", "Rosemary", "Cruz"),
        create_mock_user("opv_staff_mark", "Opv", "Mark", "Alcantara"),
    ]

    inspectors = [
        create_mock_user("inspector_mario", "Inspector", "Mario", "Dalisay"),
        create_mock_user("inspector_clara", "Inspector", "Clara", "De Guzman"),
        create_mock_user("inspector_juan", "Inspector", "Juan", "Luna"),
    ]

    farmers = [
        create_mock_user("jerwin_nico", "Farmer", "Jerwin", "Nico", random.choice(barangays)),
        create_mock_user("farmer_lucio", "Farmer", "Lucio", "Valdez", random.choice(barangays)),
        create_mock_user("farmer_kristel", "Farmer", "Kristel", "Santos", random.choice(barangays)),
        create_mock_user("farmer_dondon", "Farmer", "Dondon", "Ramos", random.choice(barangays)),
        create_mock_user("farmer_analyn", "Farmer", "Analyn", "Perez", random.choice(barangays)),
        create_mock_user("farmer_bryan", "Farmer", "Bryan", "Gomez", random.choice(barangays)),
        create_mock_user("farmer_elena", "Farmer", "Elena", "Torres", random.choice(barangays)),
        create_mock_user("farmer_nestor", "Farmer", "Nestor", "Aquino", random.choice(barangays)),
    ]

    # 2. Add Recent Hog Surveys (2025 and 2026) to continue trends
    print("Generating Hog Surveys for 2025 and 2026...")
    survey_dates = [
        datetime.date(2025, 3, 31),
        datetime.date(2025, 9, 30),
        datetime.date(2026, 3, 31),
    ]

    new_surveys = []
    for b in barangays:
        # Find latest survey for this barangay
        latest_survey = HogSurvey.objects.filter(barangay=b).order_by('-survey_date').first()
        if latest_survey:
            base_inahin = latest_survey.inahin
            base_barako = latest_survey.barako
            base_fattener = latest_survey.fattener
            base_grower = latest_survey.grower
            base_starter = latest_survey.starter
            base_bulaw = latest_survey.bulaw
        else:
            base_inahin = random.randint(1, 5)
            base_barako = random.randint(0, 1)
            base_fattener = random.randint(5, 20)
            base_grower = random.randint(5, 15)
            base_starter = random.randint(5, 20)
            base_bulaw = random.randint(2, 10)

        for s_date in survey_dates:
            quarter = (s_date.month - 1) // 3 + 1
            # Add dynamic seasonal and growth changes (+/- 10%)
            multiplier = random.uniform(0.90, 1.10)
            
            inahin_mult = 1.0
            barako_mult = 1.0
            fattener_mult = 1.0
            grower_mult = 1.0
            starter_mult = 1.0
            
            if quarter == 1:  # March 31
                starter_mult = 1.0
                grower_mult = 0.95
                fattener_mult = 1.0
            elif quarter == 2:  # June 30
                starter_mult = 1.30
                grower_mult = 1.10
                inahin_mult = 0.90
            elif quarter == 3:  # September 30
                starter_mult = 0.85
                grower_mult = 1.25
                fattener_mult = 1.20
            elif quarter == 4:  # December 31
                starter_mult = 0.80
                grower_mult = 0.90
                inahin_mult = 1.15
                barako_mult = 1.10

            inahin = max(0, int(base_inahin * multiplier * inahin_mult))
            barako = max(0, int(base_barako * multiplier * barako_mult))
            fattener = max(0, int(base_fattener * multiplier * fattener_mult))
            grower = max(0, int(base_grower * multiplier * grower_mult))
            starter = max(0, int(base_starter * multiplier * starter_mult))
            bulaw = max(0, int(base_bulaw * multiplier))
            
            # Enforce biological consistency
            if inahin > 0:
                barako = max(barako, max(1, int(inahin * 0.08)))
                
            total = inahin + barako + fattener + grower + starter + bulaw

            new_surveys.append(HogSurvey(
                barangay=b,
                survey_date=s_date,
                inahin=inahin,
                barako=barako,
                fattener=fattener,
                grower=grower,
                starter=starter,
                bulaw=bulaw,
                total_pigs=total
            ))
            # Update base for next step sequence
            base_inahin, base_barako, base_fattener, base_grower, base_starter, base_bulaw = inahin, barako, fattener, grower, starter, bulaw

    HogSurvey.objects.bulk_create(new_surveys)
    print(f"Successfully generated {len(new_surveys)} Hog Survey records for 2025/2026.")

    # 3. Generate Permit Applications (worth 2 years: July 2024 to June 2026)
    print("Generating Permit Applications...")
    start_dt = datetime.datetime(2024, 7, 1, 8, 0, tzinfo=datetime.timezone.utc)
    end_dt = datetime.datetime(2026, 6, 24, 17, 0, tzinfo=datetime.timezone.utc)
    
    total_applications = 180
    
    # Generate sorted random timestamps for realistic timeline progression
    timestamps = []
    delta_seconds = int((end_dt - start_dt).total_seconds())
    for _ in range(total_applications):
        random_offset = random.randint(0, delta_seconds)
        timestamps.append(start_dt + timedelta(seconds=random_offset))
    timestamps.sort()

    destinations = [
        "Manila Slaughterhouse, Tondo, Manila",
        "Batangas Port (For Shipping), Batangas City",
        "Laguna Meat Processing Plant, Calamba, Laguna",
        "Cavite Livestock Center, Dasmariñas, Cavite",
        "Pasay Public Market, Pasay City",
        "Lucena City Slaughterhouse, Lucena",
        "Tayabas City Meat Dealer, Tayabas, Quezon",
        "Lipa Livestock Auction Market, Lipa City, Batangas",
        "San Fernando Public Market, Pampanga",
    ]

    purposes = [
        "For immediate slaughter and meat processing.",
        "For breeding and stocking expansion.",
        "For fattening and raising in destination farm.",
        "Livestock trade, direct sale to wholesale buyers.",
        "Relocation of livestock to another facility.",
    ]

    status_choices_recent = [
        ('DRAFT', 0.05),
        ('SUBMITTED', 0.05),
        ('RESUBMISSION', 0.05),
        ('OCR_VALIDATED', 0.05),
        ('MANUAL', 0.05),
        ('FORWARDED_TO_OPV', 0.05),
        ('OPV_VALIDATED', 0.05),
        ('OPV_REJECTED', 0.10),
        ('PAYMENT_PENDING', 0.15),
        ('RELEASED', 0.40)
    ]
    
    # Re-normalize weights for recent choices
    statuses_recent, weights_recent = zip(*status_choices_recent)

    checkpoint_locations = [
        {"name": "Lutucan Checkpoint", "lat": 13.9654, "long": 121.5103},
        {"name": "Castañas Checkpoint", "lat": 13.9328, "long": 121.5287},
        {"name": "Bucal Checkpoint", "lat": 13.9893, "long": 121.5231},
    ]

    created_count = 0

    with transaction.atomic():
        for idx, created_at in enumerate(timestamps):
            farmer = random.choice(farmers)
            
            is_recent = (created_at >= datetime.datetime(2026, 6, 1, 0, 0, tzinfo=datetime.timezone.utc))
            
            # Force the last 10 applications (the newest ones) to cover all possible lifecycle states
            last_idx_start = total_applications - 10
            if idx >= last_idx_start:
                forced_statuses = [
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
                status = forced_statuses[idx - last_idx_start]
            elif not is_recent:
                status = 'RELEASED' if random.random() < 0.92 else 'OPV_REJECTED'
            else:
                status = random.choices(statuses_recent, weights=weights_recent, k=1)[0]
                
            dest = random.choice(destinations)
            purpose = random.choice(purposes)
            
            # Transport date is generally 1-5 days after submission
            transport_date = (created_at + timedelta(days=random.randint(1, 5))).date()

            # Create PermitApplication object
            app = PermitApplication.objects.create(
                farmer=farmer,
                status=status,
                destination=dest,
                transport_date=transport_date,
                purpose=purpose,
                is_issued=False,
                is_checked=False
            )
            
            # Determine temporal progression
            submitted_at = created_at + timedelta(minutes=random.randint(10, 120)) if status != 'DRAFT' else None
            
            # 1. Transport Origin
            if status != 'DRAFT':
                # Generate 1 or 2 origins
                num_origins = 1 if random.random() < 0.85 else 2
                chosen_barangays = random.sample(barangays, num_origins)
                
                origins = []
                total_pigs = 0
                for bg in chosen_barangays:
                    num_pigs = random.randint(5, 30)
                    total_pigs += num_pigs
                    origin = TransportOrigin.objects.create(
                        application=app,
                        barangay=bg,
                        number_of_pigs=num_pigs
                    )
                    origins.append(origin)
                
                # 2. Submitted Documents
                doc_types = [
                    SubmittedDocument.DocumentType.TRADERS_PASS,
                    SubmittedDocument.DocumentType.HANDLERS_LICENSE,
                    SubmittedDocument.DocumentType.TRANSPORT_CARRIER_REG,
                    SubmittedDocument.DocumentType.CIS
                ]
                
                # Include Endorsement Certificate sometimes (e.g., 70% of time)
                if random.random() < 0.70:
                    doc_types.append(SubmittedDocument.DocumentType.ENDORSEMENT_CERTIFICATE)

                documents = []
                for origin in origins:
                    # Upload 3 to 5 documents per origin
                    num_docs = random.randint(3, len(doc_types))
                    chosen_docs = random.sample(doc_types, num_docs)
                    
                    for dtype in chosen_docs:
                        doc = SubmittedDocument.objects.create(
                            origin=origin,
                            document_type=dtype,
                            file=f"submitted_docs/mock_{dtype}_{origin.id}.pdf"
                        )
                        documents.append(doc)
                        
                        # 3. OCR Validation Result (for submitted/valid permits)
                        # OCR runs almost immediately
                        ocr_time = submitted_at + timedelta(minutes=random.randint(1, 10))
                        
                        # Determine OCR status
                        if status in ['DRAFT', 'SUBMITTED']:
                            ocr_status = OCRValidationResult.ValidationStatus.PASSED if random.random() < 0.8 else OCRValidationResult.ValidationStatus.MANUAL
                        else:
                            # If resolved further, any manual error was resolved/overridden
                            ocr_status = OCRValidationResult.ValidationStatus.PASSED if random.random() < 0.85 else OCRValidationResult.ValidationStatus.OVERRIDDEN
                            
                        ocr_record = OCRValidationResult.objects.create(
                            document=doc,
                            status=ocr_status,
                            extracted_field={
                                "document_number": f"DOC-{random.randint(100000, 999999)}",
                                "expiration_date": str(transport_date + timedelta(days=random.randint(30, 365))),
                                "owner_name": f"{farmer.first_name} {farmer.last_name}"
                            },
                            remarks={"message": "Document matching standard template schema."},
                            validated_at=ocr_time
                        )
                        
                        if ocr_status == OCRValidationResult.ValidationStatus.OVERRIDDEN:
                            override_time = ocr_time + timedelta(hours=random.randint(1, 3))
                            ocr_record.manually_overridden = True
                            ocr_record.overridden_by = random.choice(agri_officers)
                            ocr_record.overridden_at = override_time
                            ocr_record.overridden_fields = {"remarks": "Visual verification matches, stamp is legible."}
                            ocr_record.save()
                            
                            # Log audit trail for override
                            AuditTrail.objects.create(
                                who_performed=ocr_record.overridden_by,
                                what_performed=f"[OCR_OVERRIDE] - Document #{doc.id} ({doc.get_document_type_display()}) manually approved for App #{app.pk}.",
                                when_performed=override_time
                            )
                
                # SMS: Login OTP and submission notification
                SMSLog.objects.create(
                    phone_number=farmer.phone_no,
                    message_type=SMSLog.Type.OTP,
                    status_captured="success",
                    send_at=created_at
                )
                SMSLog.objects.create(
                    phone_number=farmer.phone_no,
                    message_type=SMSLog.Type.NOTIFICATION,
                    status_captured="success",
                    send_at=submitted_at
                )

                # 4. OPV Validation
                has_opv = status in ['OPV_VALIDATED', 'OPV_REJECTED', 'PAYMENT_PENDING', 'RELEASED']
                if has_opv:
                    opv_time = submitted_at + timedelta(hours=random.randint(2, 24))
                    opv_staff = random.choice(opv_staffs)
                    opv_status = OPVValidation.Status.REJECTED if status == 'OPV_REJECTED' else OPVValidation.Status.VALIDATED
                    
                    remarks = (
                        "VHC and Barangay certifications check out. Approved for transport."
                        if opv_status == OPVValidation.Status.VALIDATED else
                        "Incomplete document signatures. Please upload a clear copy of Barangay CIS."
                    )
                    
                    opv_val = OPVValidation.objects.create(
                        application=app,
                        opv_staff=opv_staff,
                        status=opv_status,
                        remarks=remarks,
                        validated_at=opv_time,
                        veterinary_health_certificate=f"opv_docs/vhc/VHC-{app.pk}.pdf" if opv_status == OPVValidation.Status.VALIDATED else None,
                        transportation_pass=f"opv_docs/pass/PASS-{app.pk}.pdf" if opv_status == OPVValidation.Status.VALIDATED else None
                    )
                    
                    # Audit Trail for OPV
                    AuditTrail.objects.create(
                        who_performed=opv_staff,
                        what_performed=f"[OPV_VALIDATION] - Application #{app.pk} set to {opv_status} by staff {opv_staff.username}.",
                        when_performed=opv_time
                    )
                    
                    # Notify Farmer of OPV action
                    Notification.objects.create(
                        recipient=farmer,
                        type=Notification.Type.SUCCESS if opv_status == OPVValidation.Status.VALIDATED else Notification.Type.WARNING,
                        title="Permit Review Updated",
                        message=f"Your permit application has been {opv_val.get_status_display().lower()} by the OPV Office.",
                        sent_at=opv_time
                    )

                    # 5. Issued Permit & Payment (for paid or payment pending apps)
                    has_permit = status in ['PAYMENT_PENDING', 'RELEASED']
                    if has_permit:
                        # Permit issued right after OPV validation
                        issued_time = opv_time + timedelta(minutes=random.randint(5, 30))
                        permit_no = uuid.uuid4().hex[:13].upper()
                        
                        is_paid = (status == 'RELEASED')
                        pay_method = random.choice([IssuedPermit.PaymentMethodChoices.ONLINE, IssuedPermit.PaymentMethodChoices.OFFLINE]) if is_paid else ""
                        
                        issued_permit = IssuedPermit.objects.create(
                            permit_number=permit_no,
                            application=app,
                            issued_by=opv_staff,
                            qr_token=str(uuid.uuid4()),
                            is_paid=is_paid,
                            payment_method=pay_method,
                            permit_pdf=f"issued_docs/permits/PERMIT_{permit_no}.pdf" if is_paid else None,
                            date_issued=issued_time.date()
                        )
                        
                        # Update the application issuance status
                        app.is_issued = True
                        app.issued_at = issued_time
                        app.save()

                        # Audit Trail for Issuance
                        AuditTrail.objects.create(
                            who_performed=opv_staff,
                            what_performed=f"[PERMIT ISSUANCE] - Final Transport Permit {permit_no} issued for Application #{app.pk} by {opv_staff.username}.",
                            when_performed=issued_time
                        )

                        # Payment Record
                        payment_time = issued_time + timedelta(minutes=random.randint(15, 300))
                        pay_status = PaymentHistory.Status.SUCCESS if is_paid else PaymentHistory.Status.PENDING
                        pay_method_val = random.choice(['gcash', 'paymaya', 'card']) if pay_method == IssuedPermit.PaymentMethodChoices.ONLINE else 'gcash'
                        
                        # Amount: Flat 150 PHP
                        amount = 150
                        
                        pay_officer = random.choice(agri_officers) if pay_method == IssuedPermit.PaymentMethodChoices.OFFLINE else None

                        payment = PaymentHistory.objects.create(
                            issued_permit=issued_permit,
                            method=pay_method_val,
                            status=pay_status,
                            amount=amount,
                            paymongo_payment_id=f"pay_{random.randint(10000000,99999999)}" if is_paid else "",
                            paymongo_session_id=f"sess_{random.randint(10000000,99999999)}" if is_paid else "",
                            confirmed_by=pay_officer if is_paid else None,
                            confirmed_at=payment_time if is_paid else None
                        )
                        
                        if is_paid:
                            # Update payment audit logs
                            AuditTrail.objects.create(
                                who_performed=pay_officer or User.objects.filter(role='Admin').first(),
                                what_performed=f"[PAYMENT_CONFIRMATION] - Confirmed payment of {amount} PHP for Permit {permit_no}.",
                                when_performed=payment_time
                            )
                            Notification.objects.create(
                                recipient=farmer,
                                type=Notification.Type.SUCCESS,
                                title="Payment Received",
                                message=f"Your payment of {amount} PHP has been verified. Your Permit {permit_no} is now active and ready for travel.",
                                sent_at=payment_time
                            )
                            SMSLog.objects.create(
                                phone_number=farmer.phone_no,
                                message_type=SMSLog.Type.NOTIFICATION,
                                status_captured="success",
                                send_at=payment_time
                            )                            # 6. Checkpoint Verification (Inspector Logs)
                            # Only if status is RELEASED and transport date is in the past
                            is_past_transport = (transport_date < datetime.date(2026, 6, 24))
                            
                            scan_time = None
                            # Let's say 85% of past transport permits got inspected at checkpoints
                            if is_past_transport and random.random() < 0.85:
                                scan_time = datetime.datetime.combine(
                                    transport_date,
                                    datetime.time(random.randint(8, 17), random.randint(0, 59))
                                )
                                scan_time = timezone.make_aware(scan_time)
                                inspector = random.choice(inspectors)
                                checkpoint = get_logical_checkpoint(dest)
                                
                                # Add minor location jitter (normal distribution around base coords)
                                jitter_lat = random.normalvariate(0, 0.0002)
                                jitter_lng = random.normalvariate(0, 0.0002)
                                
                                log_instance = InspectorLogs.objects.create(
                                    inspector=inspector,
                                    application=app,
                                    notes=f"Inspected at {checkpoint['name']}. Checked {total_pigs} hogs. All documents validated.",
                                    lat=checkpoint['lat'] + jitter_lat,
                                    longi=checkpoint['long'] + jitter_lng
                                )
                                
                                # scanned_at is auto_now_add=True, so we update it via raw SQL update to bypass it
                                InspectorLogs.objects.filter(pk=log_instance.pk).update(scanned_at=scan_time)
                                
                                # Set checked status
                                app.is_checked = True
                                app.save()
                                
                                # Logs & Notification for checkpoints
                                AuditTrail.objects.create(
                                    who_performed=inspector,
                                    what_performed=f"[FIELD_INSPECTION] - Permit {permit_no} scanned & verified at {checkpoint['name']} by Inspector {inspector.username}.",
                                    when_performed=scan_time
                                )
                                
                                Notification.objects.create(
                                    recipient=farmer,
                                    type=Notification.Type.INFO,
                                    title="Checkpoint Verified",
                                    message=f"Your transport permit (ID: {app.application_id}) has been successfully verified by an inspector at a checkpoint.",
                                    sent_at=scan_time
                                )
                                
                                # Notify Staff of check
                                for staff in (agri_officers + opv_staffs):
                                    Notification.objects.create(
                                        recipient=staff,
                                        type=Notification.Type.INFO,
                                        title="Field Inspection Activity",
                                        message=f"Inspector {inspector.username} has just recorded a field verification for Application #{app.pk}.",
                                        sent_at=scan_time
                                    )
 
            # Finally: Update status and timestamps to past date bypass auto_now_add using raw SQL update
            final_updated_at = created_at
            if status != 'DRAFT':
                final_updated_at = submitted_at
                if has_opv:
                    final_updated_at = opv_time
                    if has_permit:
                        final_updated_at = payment_time if is_paid else issued_time
                        if status == 'RELEASED' and is_past_transport and app.is_checked and scan_time:
                            final_updated_at = scan_time

            PermitApplication.objects.filter(pk=app.pk).update(
                status=status,
                created_at=created_at,
                updated_at=final_updated_at,
                submitted_at=submitted_at
            )
            created_count += 1
            if created_count % 20 == 0:
                print(f"Generated {created_count}/{total_applications} applications...")

    print(f"\nDone! Successfully seeded database with realistic operations data.")
    print(f"Total Applications Created: {PermitApplication.objects.count()}")
    print(f"Total Issued Permits: {IssuedPermit.objects.count()}")
    print(f"Total Payments Logged: {PaymentHistory.objects.count()}")
    print(f"Total Inspector Logs: {InspectorLogs.objects.count()}")
    print(f"Total SMS Logs: {SMSLog.objects.count()}")
    print(f"Total Notifications: {Notification.objects.count()}")
    print(f"Total Audit Trails: {AuditTrail.objects.count()}")
    print(f"Total Hog Surveys: {HogSurvey.objects.count()} (added 2025/2026 data)")
