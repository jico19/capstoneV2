"""Small, one-time FarmPass demo: 100 applications and 100 hog surveys.

From backend/: python manage.py runscript seed_realistic_operations
Render: append that command after migrations with --settings=config.settings.prod
and FARMPASS_DEMO_SEED_ENABLED=true. Otherwise DEBUG=False is a successful no-op.
Existing data is never deleted or updated. Use a fresh demo database to start over,
not deletion of the completion marker. Credentials print on success and skips.
Integration results are fixtures; only configured file storage uses the network.
"""

import datetime
import hashlib
import os
import random
import uuid
from decimal import Decimal
from io import BytesIO
from urllib.parse import urlsplit

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import connection, transaction
from django.utils import timezone
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.pdfgen import canvas

from apps.api.models import AuditTrail, FarmerDocument, Notification, PrivacyConsentLog, User
from apps.dashboard.models import CachedInsight
from apps.inspector.models import InspectorLogs
from apps.maps.models import Barangay, HogSurvey
from apps.payment.models import PaymentHistory
from apps.permits.models import (
    IssuedPermit, MunicipalConfig, OCRValidationResult, OPVValidation,
    PermitApplication, PermitApplicationDocument, SubmittedDocument, TransportOrigin,
)
from apps.sms.models import SMSLog


APPLICATION_COUNT = 100
SURVEY_COUNT = 100
PASSWORD = "password123"
# Stable across revisions: deploying new code is not permission to reseed.
COMPLETION_MARKER = "[FARMPASS_DEMO_SEED_COMPLETE]"
LOCK_ID = 741025601
ASSET_PREFIX = "farmpass_demo"
SEED_AGENT = "FarmPass Demo Seed"
V = User.VerificationStatus
S = PermitApplication.Status

# username, role, first name, last name, barangay key, verification state
ACCOUNTS = (
    ("admin", "Admin", "Municipal", "Administrator", None, V.VERIFIED),
    ("agri_user123", "Agri", "Armando", "Agripino", None, V.VERIFIED),
    ("opv_user123", "Opv", "Olivia", "Providencia", None, V.VERIFIED),
    ("inspector_mario", "Inspector", "Mario", "Dalisay", None, V.VERIFIED),
    ("brgy_lutucan", "Barangay", "Ernesto", "Vega", "lutucan", V.VERIFIED),
    ("brgy_castanas", "Barangay", "Rodrigo", "Castillo", "casta", V.VERIFIED),
    ("brgy_bucal", "Barangay", "Maria", "Hernandez", "bucal", V.VERIFIED),
    ("farmer_lucio", "Farmer", "Lucio", "Valdez", "lutucan", V.VERIFIED),
    ("farmer_kristel", "Farmer", "Kristel", "Santos", "bucal", V.VERIFIED),
    ("jerwin_nico", "Farmer", "Jerwin", "Nico", "casta", V.VERIFIED),
    ("farmer_pending", "Farmer", "Paolo", "Reyes", "lutucan", V.PENDING_REVIEW),
    ("farmer_rejected", "Farmer", "Rosa", "Cruz", "bucal", V.REJECTED),
)

OPERATIONAL_MODELS = (
    PermitApplication, HogSurvey, FarmerDocument, PrivacyConsentLog, Notification,
    AuditTrail, SMSLog, InspectorLogs, PaymentHistory, IssuedPermit, OPVValidation,
    OCRValidationResult, SubmittedDocument, PermitApplicationDocument, TransportOrigin,
    CachedInsight,
)


def _pdf_bytes(title, lines, qr_url=None):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(612, 792), invariant=1)
    pdf.setTitle(title)
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(48, 744, "FarmPass demonstration sample")
    pdf.setFont("Helvetica", 11)
    for index, line in enumerate((title, *lines)):
        pdf.drawString(48, 716 - index * 20, str(line))
    if qr_url:
        qr = QrCodeWidget(qr_url, barBorder=4)
        x1, y1, x2, y2 = qr.getBounds()
        size = 180
        drawing = Drawing(size, size, transform=[size / (x2-x1), 0, 0, size / (y2-y1), 0, 0])
        drawing.add(qr)
        renderPDF.draw(drawing, pdf, 48, 360)
        pdf.linkURL(qr_url, (48, 360, 228, 540), relative=0)
        pdf.drawString(48, 340, "Scan with the FarmPass inspector portal.")
    pdf.save()
    return buffer.getvalue()


class DemoFiles:
    """Configured storage, with stable Cloudinary IDs instead of random IDs."""

    def __init__(self):
        self.saved = {}

    def pdf(self, name, title, lines=(), qr_url=None):
        content_bytes = _pdf_bytes(title, lines, qr_url)
        digest = hashlib.sha256(content_bytes).hexdigest()[:12]
        path = f"{ASSET_PREFIX}/{name}-{digest}.pdf"
        is_cloudinary = _uses_cloudinary()
        # Image resources use a public ID without the format suffix. Raw
        # storage retains it. Use the prefix on both saved and reused IDs.
        resource_type = default_storage._get_resource_type(path) if is_cloudinary else None
        key = path.removesuffix(".pdf") if resource_type == "image" else path
        if is_cloudinary:
            key = default_storage._prepend_prefix(key)
        if key in self.saved:
            return self.saved[key]
        if default_storage.exists(key):
            self.saved[key] = key
            return key
        content = ContentFile(content_bytes)
        if is_cloudinary:
            import cloudinary.uploader

            # Preserve configured resource type, prefix and tag. Reuse assets
            # left by interrupted attempts without overwriting existing files.
            result = cloudinary.uploader.upload(
                content, public_id=key, resource_type=resource_type,
                tags=default_storage.TAG, overwrite=False, unique_filename=False,
            )
            stored = result["public_id"]
        else:
            stored = default_storage.save(key, content)
        self.saved[key] = stored
        return stored


def _uses_cloudinary():
    # Importing cloudinary_storage itself requires credentials, even when the
    # configured backend is local storage. Inspect the active backend instead.
    return any(base.__module__ == "cloudinary_storage.storage"
               for base in default_storage.__class__.__mro__)


def _audit(actor, message, at, target=None):
    AuditTrail.objects.create(
        who_performed=actor, target_user=target, action_type=AuditTrail.ActionType.CREATE,
        what_performed=message, when_performed=at, ip_address="127.0.0.1",
        user_agent=SEED_AGENT,
    )


def _preflight():
    barangays = list(Barangay.objects.order_by("name"))
    if not 5 <= len(barangays) <= SURVEY_COUNT:
        raise RuntimeError("Demo requires 5 to 100 reference barangays. Run 'runscript barangay' first.")
    selected = {}
    for key in ("lutucan", "casta", "bucal"):
        selected[key] = next((bg for bg in barangays if key in bg.name.lower()), None)
        if selected[key] is None:
            raise RuntimeError(f"Missing required reference barangay: {key}. Run 'runscript barangay' first.")
    occupied = [model.__name__ for model in OPERATIONAL_MODELS if model.objects.exists()]
    if occupied:
        raise RuntimeError(
            f"Refusing to seed existing operational data ({', '.join(occupied)}). "
            "Use a fresh demo database. Nothing was deleted."
        )
    usernames = [row[0] for row in ACCOUNTS]
    phones = [f"0999000{index:04d}" for index in range(len(ACCOUNTS))]
    if User.objects.filter(username__in=usernames).exists() or User.objects.filter(phone_no__in=phones).exists():
        raise RuntimeError("Demo username or phone conflict. Existing accounts were not changed.")
    frontend = (getattr(settings, "FRONTEND_URL", None) or ("http://localhost:5173" if settings.DEBUG else "")).rstrip("/")
    parsed = urlsplit(frontend)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise RuntimeError("Set FRONTEND_URL to the demo frontend origin for inspector QR links.")
    # Read-only availability check before creating records.
    suffix = "" if _uses_cloudinary() else ".pdf"
    default_storage.exists(f"{ASSET_PREFIX}/handlers_license{suffix}")
    return barangays, selected, frontend


def _create_accounts(selected, files, now):
    users = {}
    for index, (username, role, first, last, bg_key, verification) in enumerate(ACCOUNTS):
        verified = verification == V.VERIFIED
        remarks = ("Demo verified account." if verified else
                   "Demo KYC awaiting review." if verification == V.PENDING_REVIEW else
                   "Demo: license needs replacement.")
        user = User.objects.create_user(
            username=username, password=PASSWORD, role=role,
            first_name=first, last_name=last, email=f"{username}@example.com",
            phone_no=f"0999000{index:04d}", barangay=selected.get(bg_key),
            address=f"{selected[bg_key].name if bg_key else 'Poblacion'}, Sariaya, Quezon",
            is_staff=role in ("Admin", "Agri"), is_superuser=role == "Admin",
            receive_sms=False, verification_status=verification,
            verification_remarks=remarks, verified_at=now if verified else None,
            verified_by=users.get("agri_user123") if role == "Farmer" and verified else None,
        )
        users[username] = user
        PrivacyConsentLog.objects.create(user=user, user_agent=SEED_AGENT)
        if role == "Farmer":
            for doc_type in FarmerDocument.DocumentType.values:
                FarmerDocument.objects.create(
                    user=user, document_type=doc_type,
                    file=files.pdf(doc_type, doc_type.replace("_", " ").title(),
                                   ("Synthetic KYC document for demo review.",)),
                    license_number=f"DEMO-{index:02d}-{doc_type[:3]}",
                    expiration_date=now.date() + datetime.timedelta(days=365),
                    extracted_data={"full_name": user.get_full_name(), "demo": True},
                    ocr_status="PROCESSED", is_verified=verified,
                )
        _audit(user, f"[DEMO ACCOUNT] {username}: {verification}", now, user)
    return users


def _create_surveys(barangays, now, users):
    records = []
    totals = (0, 20, 120, 600, 1800)
    farmers = {users[name].barangay_id: users[name]
               for name in ("farmer_lucio", "farmer_kristel", "jerwin_nico")}
    quarter_start = datetime.date(now.year, ((now.month - 1) // 3) * 3 + 1, 1)
    for index in range(SURVEY_COUNT):
        bg_index = index % len(barangays)
        history = index // len(barangays)
        survey_date = now.date()
        if history:
            survey_date = quarter_start - datetime.timedelta(days=1)
            for _ in range(history - 1):
                survey_date = datetime.date(
                    survey_date.year, ((survey_date.month - 1) // 3) * 3 + 1, 1
                ) - datetime.timedelta(days=1)
        # Up to two populated historical quarters keep the default yearly
        # aggregation in the intended five density ranges, even on small sets.
        total = totals[bg_index % 5]
        if history:
            total = int(total * 0.8) if history <= 2 else 0
        inahin, barako, grower = total // 10, total // 50, total // 4
        farmer = farmers.get(barangays[bg_index].pk)
        records.append(HogSurvey(
            barangay=barangays[bg_index],
            farmer_name=(farmer.get_full_name() if farmer else "Demo Hog Raisers") if total else "",
            contact_number=(farmer.phone_no if farmer else "09990000007") if total else "",
            survey_date=survey_date,
            inahin=inahin, barako=barako, grower=grower,
            fattener=total-inahin-barako-grower, total_pigs=total,
        ))
    HogSurvey.objects.bulk_create(records)


def _scenarios(now, validity_days):
    """Explicit cases first, historical variation second; no missing stages."""
    cases = [(status, status, now - datetime.timedelta(hours=6), False) for status in S.values]
    cases += [
        ("payment_failed", S.PAYMENT_PENDING, now - datetime.timedelta(hours=6), False),
        ("released_valid_unchecked", S.RELEASED, now - datetime.timedelta(hours=6), False),
        ("released_valid_checked", S.RELEASED, now - datetime.timedelta(hours=8), True),
        ("released_expired", S.RELEASED, now - datetime.timedelta(days=validity_days + 7), False),
    ]
    rng = random.Random(2026)
    for index in range(APPLICATION_COUNT - len(cases)):
        created = now - datetime.timedelta(days=7 + index * 4, hours=2)
        status = rng.choice((S.RELEASED, S.RELEASED, S.OPV_REJECTED, S.CANCELLED))
        cases.append((f"history_{index+1:03d}", status, created, status == S.RELEASED))
    return cases


def _create_application(index, case, users, files, frontend, fee, validity_days):
    label, status, created, inspected = case
    farmer = users["farmer_lucio"] if index < 16 else users[
        ("farmer_lucio", "farmer_kristel", "jerwin_nico")[index % 3]
    ]
    agri, opv = users["agri_user123"], users["opv_user123"]
    transport = created.date() if inspected else created.date() + datetime.timedelta(days=1)
    app = PermitApplication.objects.create(
        application_id=f"DEMO-{index+1:03d}", farmer=farmer, status=status,
        destination=("Lucena City Public Slaughterhouse, Quezon",
                     "Lipa Livestock Center, Batangas", "Tayabas Public Abattoir, Quezon")[index % 3],
        transport_date=transport,
        purpose=f"[DEMO:{label}] Hog transport for commercial distribution. Vehicle DAE-4819.",
    )
    submitted = None if status == S.DRAFT else created + datetime.timedelta(minutes=15)
    changed = submitted or created
    _audit(farmer, f"[DEMO APPLICATION] {app.application_id}: {label} ({status})", created, farmer)
    if submitted:
        for doc_type in PermitApplicationDocument.DocumentType.values:
            PermitApplicationDocument.objects.create(
                application=app, document_type=doc_type,
                file=files.pdf(doc_type, doc_type.replace("_", " ").title()),
            )
    origins = [TransportOrigin.objects.create(
        application=app, barangay=farmer.barangay, source_farmer_name=farmer.get_full_name(),
        source_phone_no=farmer.phone_no, fattener=8 + index % 8, grower=2,
    )]
    if status == S.OCR_VALIDATED:
        other = users["farmer_kristel"]
        origins.append(TransportOrigin.objects.create(
            application=app, barangay=other.barangay,
            source_farmer_name=other.get_full_name(), source_phone_no=other.phone_no,
            inahin=1, barako=1, starter=2, bulaw=1,
        ))
    if submitted:
        for origin in origins:
            doc_types = [SubmittedDocument.DocumentType.CIS,
                         SubmittedDocument.DocumentType.ENDORSEMENT_CERTIFICATE]
            if origin == origins[0]:
                doc_types.extend(PermitApplicationDocument.DocumentType.values)
            for doc_type in doc_types:
                doc = SubmittedDocument.objects.create(
                    origin=origin, document_type=doc_type,
                    file=files.pdf(doc_type, doc_type.replace("_", " ").title()),
                )
                if status not in (S.SUBMITTED, S.CANCELLED):
                    manual = status in (S.MANUAL, S.RESUBMISSION)
                    overridden = status == S.OCR_VALIDATED
                    ocr = OCRValidationResult.objects.create(
                        document=doc, status="MANUAL" if manual else "OVERRIDDEN" if overridden else "PASSED",
                        provider="none", extracted_field={
                            "demo": True, "owner_name": origin.source_farmer_name,
                            "origin_barangay": origin.barangay.name,
                        },
                        remarks={"verification": "Seeded sample outcome; no OCR provider called."},
                        manually_overridden=overridden, overridden_by=agri if overridden else None,
                        overridden_at=submitted + datetime.timedelta(minutes=10) if overridden else None,
                        overridden_fields={"owner_name": origin.source_farmer_name} if overridden else {},
                    )
                    OCRValidationResult.objects.filter(pk=ocr.pk).update(
                        validated_at=submitted + datetime.timedelta(minutes=5)
                    )
    forwarded = status in (S.FORWARDED_TO_OPV, S.OPV_VALIDATED, S.OPV_REJECTED,
                           S.PERMIT_ISSUED, S.PAYMENT_PENDING, S.RELEASED)
    if forwarded:
        changed = created + datetime.timedelta(hours=1)
        app.aic_number = f"DEMO-AIC-{index+1:03d}"
        app.mao_certificate_number = f"DEMO-MAO-{index+1:03d}"
        app.aic_issued_at = app.mao_cert_issued_at = changed
        app.aic_pdf = files.pdf("aic", "Animal Inspection Certificate",
                                ("Synthetic certificate for demo use.",))
        app.mao_certificate_pdf = files.pdf("mao", "MAO Health Certificate",
                                            ("Synthetic certificate for demo use.",))
        if status != S.FORWARDED_TO_OPV:
            approved = status != S.OPV_REJECTED
            validation = OPVValidation.objects.create(
                application=app, opv_staff=opv, status="VALIDATED" if approved else "REJECTED",
                remarks="Demo: health documents validated." if approved else "Demo: updated ASF clearance required.",
                aic_verified=approved, aic_verified_at=changed if approved else None,
                veterinary_health_certificate=files.pdf("vhc", "Veterinary Health Certificate") if approved else None,
                transportation_pass=files.pdf("transport_pass", "Transportation Pass") if approved else None,
            )
            OPVValidation.objects.filter(pk=validation.pk).update(validated_at=changed)
        _audit(agri, f"[DEMO MAO REVIEW] {app.application_id}: forwarded with AIC and MAO certificate", changed, farmer)
    if status in (S.PAYMENT_PENDING, S.RELEASED, S.PERMIT_ISSUED):
        paid = status == S.RELEASED
        issued = created + datetime.timedelta(hours=2)
        method = "OFFLINE" if index % 2 == 0 else "ONLINE"
        token = str(uuid.uuid5(uuid.NAMESPACE_URL, f"farmpass-demo/{index}"))
        permit = IssuedPermit.objects.create(
            application=app, issued_by=agri, permit_number=f"DEMO-{index+1:04d}", qr_token=token,
            is_paid=paid, payment_method=method, permit_fee=fee,
            valid_until=issued.date()+datetime.timedelta(days=validity_days),
            payment_deadline=issued+datetime.timedelta(hours=24),
            aic_number=app.aic_number, aic_pdf=app.aic_pdf,
            mao_certificate_number=app.mao_certificate_number, mao_certificate_pdf=app.mao_certificate_pdf,
        )
        IssuedPermit.objects.filter(pk=permit.pk).update(date_issued=issued.date())
        if paid:
            permit.permit_pdf = files.pdf(
                f"permit_{index+1:03d}", "Livestock Transport Permit",
                (f"Application: {app.application_id}", f"Permit: {permit.permit_number}",
                 f"Farmer: {farmer.get_full_name()}", f"Valid until: {permit.valid_until}",
                 f"QR token: {token}"),
                qr_url=f"{frontend}/inspector/verify/{token}",
            )
            permit.save(update_fields=["permit_pdf"])
        payment = PaymentHistory.objects.create(
            issued_permit=permit, method="gcash" if method == "OFFLINE" else "ONLINE",
            status="SUCCESS" if paid else "FAILED" if label == "payment_failed" else "PENDING",
            amount=int(fee), confirmed_by=agri if paid and method == "OFFLINE" else None,
            confirmed_at=issued+datetime.timedelta(minutes=15) if paid else None,
            or_number=f"D{index+1:06d}" if paid else "",
            # Provider IDs stay empty: no live payment exists.
        )
        PaymentHistory.objects.filter(pk=payment.pk).update(created_at=issued)
        app.is_issued = paid
        app.issued_at = issued if paid else None
        changed = issued + datetime.timedelta(minutes=15) if paid else issued
        if inspected:
            log = InspectorLogs.objects.create(
                inspector=users["inspector_mario"], application=app,
                notes="Demo: hog count and documents verified at Lutucan checkpoint.",
                lat=13.9654, longi=121.5103,
            )
            scan_time = created+datetime.timedelta(hours=4)
            InspectorLogs.objects.filter(pk=log.pk).update(scanned_at=scan_time)
            app.is_checked = True
            _audit(users["inspector_mario"], f"[DEMO INSPECTION] {app.application_id}", scan_time, farmer)
        _audit(agri, f"[DEMO PAYMENT] {app.application_id}: {payment.status}, {method}", changed, farmer)
        if inspected:
            changed = scan_time
    if status == S.PERMIT_ISSUED:
        app.purpose += " Legacy status example, no workflow actions supported."
    app.save()
    PermitApplication.objects.filter(pk=app.pk).update(
        created_at=created, submitted_at=submitted, updated_at=changed
    )
    if submitted:
        notice = Notification.objects.create(
            recipient=farmer,
            type="WARNING" if status in (S.RESUBMISSION, S.OPV_REJECTED, S.CANCELLED) else "INFO",
            title=f"Demo: {app.get_status_display()}", message=f"{app.application_id}: {label}",
            is_read=index % 2 == 0,
        )
        Notification.objects.filter(pk=notice.pk).update(sent_at=changed)
        sms = SMSLog.objects.create(
            application=app, phone_number=farmer.phone_no,
            message_type="NOTIFICATION", status_captured="demo_simulated_not_sent",
        )
        SMSLog.objects.filter(pk=sms.pk).update(send_at=changed)
        if status in (S.SUBMITTED, S.OCR_VALIDATED, S.MANUAL, S.FORWARDED_TO_OPV):
            staff_notice = Notification.objects.create(
                recipient=opv if status == S.FORWARDED_TO_OPV else agri,
                type="INFO", title="Demo application ready for review",
                message=f"{app.application_id}: {label}",
            )
            Notification.objects.filter(pk=staff_notice.pk).update(sent_at=changed)


def _print_summary(marker):
    print(f"Demo seed completed at {marker.when_performed}. No records changed on subsequent runs.")
    print(f"Applications: {PermitApplication.objects.count()} | Hog surveys: {HogSurvey.objects.count()}")
    print("\nDEMO CREDENTIALS (initial passwords; reruns never reset them)")
    print(f"{'Username':<20} {'Password':<14} {'Role':<10} {'Verification':<16} Barangay")
    accounts = {u.username: u for u in User.objects.filter(
        username__in=[a[0] for a in ACCOUNTS]
    ).select_related("barangay")}
    for username, *_ in ACCOUNTS:
        user = accounts.get(username)
        if user:
            print(f"{username:<20} {PASSWORD:<14} {user.role:<10} {user.verification_status:<16} "
                  f"{user.barangay.name if user.barangay else '-'}")
    print("\nMAIN DEMO FARMER: farmer_lucio")
    for app in PermitApplication.objects.filter(
        application_id__in=[f"DEMO-{i:03d}" for i in range(1, 17)]
    ).order_by("application_id"):
        print(f"{app.application_id}: {app.status} | {app.purpose.split(']')[0]}]")
    expired = list(IssuedPermit.objects.filter(
        application__application_id__startswith="DEMO-", is_paid=True,
        valid_until__lt=timezone.localdate(),
    ).values_list("permit_number", flat=True))
    print(f"Expired demo permits ({len(expired)}): {', '.join(expired) or 'none'}. "
          "Dates are preserved on redeploy.")


def run(*args):
    if args:
        raise RuntimeError("This demo seeder takes no arguments and has no reset option.")
    if not settings.DEBUG and os.environ.get("FARMPASS_DEMO_SEED_ENABLED", "").lower() != "true":
        print("Demo seeding disabled. Set FARMPASS_DEMO_SEED_ENABLED=true only on a demo deployment.")
        return
    if connection.vendor != "postgresql":
        raise RuntimeError("The demo seed requires PostgreSQL.")
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", [LOCK_ID])
        marker = AuditTrail.objects.filter(what_performed=COMPLETION_MARKER).first()
        if marker:
            print("Demo already seeded; skipping.")
        else:
            barangays, selected, frontend = _preflight()
            now = timezone.localtime()
            files = DemoFiles()
            config, _ = MunicipalConfig.objects.get_or_create(pk=1)
            fee = sum(Decimal(str(value)) for value in (
                config.vet_health_cert_fee, config.transport_pass_fee, config.local_transport_permit_fee,
            ))
            if fee != fee.to_integral_value() or fee < 0 or config.validity_days < 1:
                raise RuntimeError("Demo requires whole-peso fees and positive permit validity.")
            users = _create_accounts(selected, files, now)
            _create_surveys(barangays, now, users)
            for index, case in enumerate(_scenarios(now, config.validity_days)):
                _create_application(index, case, users, files, frontend, fee, config.validity_days)
            _audit(users["admin"], COMPLETION_MARKER, now)
            marker = AuditTrail.objects.get(what_performed=COMPLETION_MARKER)
    _print_summary(marker)
