from django.db import models
from apps.api.models import User
from apps.maps.models import Barangay
from django.core.validators import FileExtensionValidator
from django.utils import timezone
from nanoid import generate


def document_id():
    '''
        Unique ID for each application, format: LP-2024-ABC123 (LP = Livestock Permit, 2024 = current year, ABC123 = random alphanumeric string)
    '''
    return f"LP-{timezone.now().year}-{generate(size=6, alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')}"

class PermitApplication(models.Model):
    class Status(models.TextChoices):
        DRAFT               = 'DRAFT',              'Draft'
        SUBMITTED           = 'SUBMITTED',          'Submitted'
        RESUBMISSION        = 'RESUBMISSION',          'Resubmission'
        OCR_VALIDATED       = 'OCR_VALIDATED',      'OCR Validated'
        MANUAL              = 'MANUAL',             'Manual Review'
        FORWARDED_TO_OPV    = 'FORWARDED_TO_OPV',  'Forwarded to OPV'
        OPV_VALIDATED       = 'OPV_VALIDATED',      'OPV Validated'
        OPV_REJECTED        = 'OPV_REJECTED',       'OPV Rejected'
        PERMIT_ISSUED       = 'PERMIT_ISSUED',       'Permrit issued'# ← payment starts here
        PAYMENT_PENDING     = 'PAYMENT_PENDING',     'Payment pending'# ← waiting for payment
        RELEASED            = 'RELEASED',            'Released' 

    application_id  = models.CharField(max_length=12, unique=True, editable=False, default=document_id)
    farmer = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.DRAFT)

    # Transport details
    origin_barangay = models.ForeignKey(Barangay, on_delete=models.SET_NULL, null=True, related_name='origin')
    destination = models.CharField(max_length=255)
    number_of_pigs = models.PositiveIntegerField()
    transport_date = models.DateField()
    purpose = models.TextField(blank=True)

    # Tracking
    is_issued = models.BooleanField(default=False)
    issued_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True, auto_now_add=True)

    class Meta:
        ordering = ['-created_at', 'status']
    
    def __str__(self):
        return f"Application #{self.pk} — {self.farmer} ({self.status})"
    

class SubmittedDocument(models.Model):
    class DocumentType(models.TextChoices):
        TRADERS_PASS = 'traders_pass', "Trader's Pass"
        HANDLERS_LICENSE = 'handlers_license', "Handler's License"
        TRANSPORT_CARRIER_REG = 'transport_carrier_reg', "Transport Carrier Registration"
        CIS = 'cis', "CIS (Barangay-issued)"
        ENDORSEMENT_CERTIFICATE = 'endorsement_cert', "Endorsement Certificate"

    application = models.ForeignKey(PermitApplication, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=30, choices=DocumentType.choices)
    file = models.FileField(upload_to='submitted_docs/', validators=[
        FileExtensionValidator(
            allowed_extensions=['pdf', 'jpg', 'jpeg', 'png'])
        ])
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [('application', 'document_type')]

    def __str__(self):
        return f"Document → {self.get_document_type_display()} — App #{self.application_id}"

class OPVValidation(models.Model):
    
    class Status(models.TextChoices):
        PENDING     = 'PENDING',    'Pending' # for default value
        VALIDATED   = 'VALIDATED',  'Validated'
        REJECTED    = 'REJECTED',   'Rejected'
    
    application = models.OneToOneField(PermitApplication, on_delete=models.CASCADE, related_name="permit_application")
    opv_staff = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=Status, default=Status.PENDING)
    remarks = models.TextField(blank=True)
    validated_at = models.DateTimeField(null=True, blank=True, auto_now_add=True)
    
    veterinary_health_certificate   = models.FileField(upload_to='opv_docs/vhc/', null=True, blank=True)
    transportation_pass = models.FileField(upload_to='opv_docs/pass/', null=True, blank=True)

    
    def __str__(self):
        return f"OPV → {self.application.id} - {self.opv_staff.username} - {self.status}"

class OCRValidationResult(models.Model):
    class ValidationStatus(models.TextChoices):
        PASSED  = 'PASSED',  'Passed'
        MANUAL  = 'MANUAL',  'Needs Manual Review'
        
    document = models.OneToOneField(SubmittedDocument, on_delete=models.CASCADE, related_name="ocr")
    status = models.CharField(max_length=20, choices=ValidationStatus)
    extracted_field = models.JSONField(default=dict)
    remarks = models.JSONField(default=dict)
    validated_at = models.DateTimeField(auto_now_add=True)

    manually_overridden     = models.BooleanField(default=False)
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

    permit_pdf = models.FileField(upload_to='issued_docs/permits/', null=True, blank=True)

    date_issued = models.DateField(auto_now_add=True)
    valid_until = models.DateField(null=True)
    
    def __str__(self):
        return f"Issued -> ID:{self.pk} - Application ID:{self.application.id} - {self.issued_by.username}"

