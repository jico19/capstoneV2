from django.db import models
from apps.api.models import User
from apps.maps.models import Barangay
from django.core.validators import FileExtensionValidator
from django.utils import timezone
from datetime import timedelta
import secrets
from django.core.exceptions import ValidationError


def validate_file_size(value):
    """Validator to ensure file size does not exceed 10MB."""
    filesize = value.size
    
    if filesize > 10 * 1024 * 1024:
        raise ValidationError("The maximum file size that can be uploaded is 10MB")
    else:
        return value

def document_id():
    '''
        Unique ID for each application, format: LP-2024-ABC123 (LP = Livestock Permit, 2024 = current year, ABC123 = random alphanumeric string)
    '''
    random_suffix = "".join(secrets.choice('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') for _ in range(6))
    return f"LP-{timezone.now().year}-{random_suffix}"

class PermitApplication(models.Model):
    class Status(models.TextChoices):
        DRAFT               = 'DRAFT',              'Draft'
        SUBMITTED           = 'SUBMITTED',          'Submitted'
        RESUBMISSION        = 'RESUBMISSION',        'Resubmission'
        OCR_VALIDATED       = 'OCR_VALIDATED',      'OCR Validated'
        MANUAL              = 'MANUAL',             'Waiting for Manual Review'
        FORWARDED_TO_OPV    = 'FORWARDED_TO_OPV',  'Forwarded to OPV'
        OPV_VALIDATED       = 'OPV_VALIDATED',      'OPV Validated'
        OPV_REJECTED        = 'OPV_REJECTED',       'OPV Rejected'
        PERMIT_ISSUED       = 'PERMIT_ISSUED',       'Permit issued'
        PAYMENT_PENDING     = 'PAYMENT_PENDING',     'Payment pending'
        RELEASED            = 'RELEASED',            'Released' 

    application_id  = models.CharField(max_length=32, unique=True, editable=False, default=document_id)
    farmer = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.DRAFT)

    destination = models.CharField(max_length=255)
    transport_date = models.DateField()
    purpose = models.TextField(blank=True)

    is_issued = models.BooleanField(default=False)
    issued_at = models.DateTimeField(null=True, blank=True)
    is_checked = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True, auto_now_add=True)

    class Meta:
        ordering = ['-created_at', 'status']
    
    def __str__(self):
        return f"Application #{self.pk} — {self.farmer} ({self.status})"
    

class TransportOrigin(models.Model):
    application = models.ForeignKey(PermitApplication, on_delete=models.CASCADE, related_name='origins')
    barangay = models.ForeignKey(Barangay, on_delete=models.CASCADE)
    source_farmer_name = models.CharField(max_length=200, blank=True, default="")
    source_phone_no = models.CharField(max_length=20, blank=True, default="")
    number_of_pigs = models.PositiveIntegerField(default=0)

    inahin = models.PositiveIntegerField(default=0)
    barako = models.PositiveIntegerField(default=0)
    fattener = models.PositiveIntegerField(default=0)
    grower = models.PositiveIntegerField(default=0)
    bulaw = models.PositiveIntegerField(default=0)
    starter = models.PositiveIntegerField(default=0)

    def __str__(self):
        source_info = f" — Source: {self.source_farmer_name}" if self.source_farmer_name else ""
        return f"{self.barangay.name} ({self.number_of_pigs} pigs){source_info}"

    def save(self, *args, **kwargs):
        total = (
            self.inahin + self.barako + self.fattener + self.grower + self.bulaw + self.starter
        )
        # If types are not specified but number_of_pigs is, default to fattener for backward compatibility/tests
        if total == 0 and self.number_of_pigs > 0:
            self.fattener = self.number_of_pigs
            total = self.number_of_pigs

        if total == 0:
            raise ValidationError("At least one pig must be specified for transport.")

        self.number_of_pigs = total
        super().save(*args, **kwargs)


class SubmittedDocument(models.Model):
    class DocumentType(models.TextChoices):
        TRADERS_PASS = 'traders_pass', "Trader's Pass"
        HANDLERS_LICENSE = 'handlers_license', "Handler's License"
        TRANSPORT_CARRIER_REG = 'transport_carrier_reg', "Transport Carrier Registration"
        CIS = 'cis', "CIS (Barangay-issued)"
        ENDORSEMENT_CERTIFICATE = 'endorsement_cert', "Endorsement Certificate"

    # Updated to link to TransportOrigin
    origin = models.ForeignKey(TransportOrigin, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=30, choices=DocumentType.choices)
    file = models.FileField(upload_to='submitted_docs/', validators=[
        FileExtensionValidator(
            allowed_extensions=['pdf', 'jpg', 'jpeg', 'png']),
        validate_file_size
        ])
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [('origin', 'document_type')]

    def __str__(self):
        return f"Document → {self.get_document_type_display()} — Origin #{self.origin_id}"

class OPVValidation(models.Model):
    
    class Status(models.TextChoices):
        PENDING     = 'PENDING',    'Pending' # for default value
        VALIDATED   = 'VALIDATED',  'Validated'
        REJECTED    = 'REJECTED',   'Rejected'
    
    application = models.OneToOneField(PermitApplication, on_delete=models.CASCADE, related_name="opv_validation")
    opv_staff = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=Status, default=Status.PENDING)
    remarks = models.TextField(blank=True)
    validated_at = models.DateTimeField(null=True, blank=True, auto_now_add=True)
    
    veterinary_health_certificate   = models.FileField(upload_to='opv_docs/vhc/', null=True, blank=True, validators=[validate_file_size])
    transportation_pass = models.FileField(upload_to='opv_docs/pass/', null=True, blank=True, validators=[validate_file_size])

    
    def __str__(self):
        # Fallback to "System" if the OPV staff is None (e.g. deleted user)
        staff = self.opv_staff.username if self.opv_staff else "System"
        return f"OPV → {self.application.id} - {staff} - {self.status}"

class OCRValidationResult(models.Model):
    class ValidationStatus(models.TextChoices):
        PASSED  = 'PASSED',  'Passed'
        MANUAL  = 'MANUAL',  'Needs Manual Review'
        OVERRIDDEN = 'OVERRIDDEN', 'Overridden'
        
    document = models.OneToOneField(SubmittedDocument, on_delete=models.CASCADE, related_name="ocr")
    status = models.CharField(max_length=20, choices=ValidationStatus)
    extracted_field = models.JSONField(default=dict)
    remarks = models.JSONField(default=dict)
    validated_at = models.DateTimeField(auto_now_add=True)

    manually_overridden  = models.BooleanField(default=False)
    overridden_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    overridden_at = models.DateTimeField(null=True, blank=True)
    overridden_fields = models.JSONField(default=dict)

    
    def __str__(self):
        return f"OCR → {self.document.id} - {self.status}"


class IssuedPermit(models.Model):
    class PaymentMethodChoices(models.TextChoices):
        ONLINE  = 'ONLINE',  'Online'
        OFFLINE  = 'OFFLINE',  'Offline'

    permit_number = models.CharField(max_length=13, unique=True, null=False, editable=False)
    application = models.OneToOneField(PermitApplication, on_delete=models.CASCADE, related_name="issued_permit")
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    qr_token = models.CharField(max_length=36, editable=False, unique=True)

    is_paid = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=100, default="", blank=True, choices=PaymentMethodChoices)
    permit_fee = models.DecimalField(max_digits=10, decimal_places=2, default=150.00)

    permit_pdf = models.FileField(upload_to='issued_docs/permits/', null=True, blank=True, validators=[validate_file_size])
    aic_number = models.CharField(max_length=20, default="", blank=True)
    aic_pdf = models.FileField(upload_to='issued_docs/aic/', null=True, blank=True, validators=[validate_file_size])

    date_issued = models.DateField(auto_now_add=True)
    valid_until = models.DateField(null=True)

    def save(self, *args, **kwargs):
        # Set expiry date after issuance
        if not self.valid_until:
            # If date_issued is not yet set (new object), use current date
            base_date = self.date_issued if self.date_issued else timezone.now().date()
            config = MunicipalConfig.objects.first()
            days = config.validity_days if config else 3
            self.valid_until = base_date + timedelta(days=days)
        super().save(*args, **kwargs)

    def __str__(self):
        # Fallback to "System" if the issuing user is None (e.g. deleted user)
        issuer = self.issued_by.username if self.issued_by else "System"
        return f"Issued -> ID:{self.pk} - Application ID:{self.application.id} - {issuer}"


class MunicipalConfig(models.Model):
    vet_health_cert_fee = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)
    transport_pass_fee = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)
    local_transport_permit_fee = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)
    validity_days = models.PositiveIntegerField(default=3)
    oic_name = models.CharField(max_length=100, default="AMALITA C. AMORES")
    oic_title = models.CharField(max_length=100, default="OIC - Municipal Agriculturist")
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_fee(cls):
        config = cls.objects.first()
        if not config:
            config = cls.objects.create()
        return config.permit_fee

    @property
    def permit_fee(self):
        return self.vet_health_cert_fee + self.transport_pass_fee + self.local_transport_permit_fee

    def __str__(self):
        return f"Municipal Config (Fee: ₱{self.permit_fee}, Validity: {self.validity_days} days)"

