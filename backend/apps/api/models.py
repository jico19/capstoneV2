from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator, FileExtensionValidator
from django.core.exceptions import ValidationError
from apps.maps.models import Barangay


def validate_license_file_size(value):
    if value.size > 10 * 1024 * 1024:
        raise ValidationError("The maximum file size that can be uploaded is 10MB")
    return value


class User(AbstractUser):
    class VerificationStatus(models.TextChoices):
        UNVERIFIED = "UNVERIFIED", "Unverified"
        PENDING_REVIEW = "PENDING_REVIEW", "Pending Review"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"

    role = models.CharField(
        max_length=20,
        default="Farmer",
        choices=(
            ("Admin", "Admin"),
            ("Farmer", "Farmer"),
            ("Inspector", "Inspector"),
            ("Opv", "Opv"),
            ("Agri", "Agri"),
            ("Barangay", "Barangay Official"),
        ),
        null=False,
        help_text="User role",
    )
    phone_no = models.CharField(
        max_length=11,
        validators=[
            RegexValidator(
                regex=r"^(?:\+639|639|09)\d{9}$", message="Enter a valid mobile number."
            )
        ],
        unique=True,
        blank=True,
        null=True,
    )
    address = models.CharField(max_length=255, blank=True)
    barangay = models.ForeignKey(
        Barangay,
        help_text="User barangay.",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    receive_sms = models.BooleanField(
        default=True, help_text="Whether the user wants to receive SMS notifications."
    )
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED,
        help_text="Farmer KYC document verification status",
    )
    verification_remarks = models.TextField(blank=True, default="")
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_farmers",
    )

    def __str__(self):
        return f"{self.username} | {self.role} | {self.verification_status}"


class FarmerDocument(models.Model):
    class DocumentType(models.TextChoices):
        HANDLERS_LICENSE = "handlers_license", "Handler's License"
        TRANSPORT_CARRIER_REG = "transport_carrier_reg", "Transport Carrier Registration"
        TRADERS_PASS = "traders_pass", "Trader's Pass"

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="farmer_documents"
    )
    document_type = models.CharField(max_length=30, choices=DocumentType.choices)
    file = models.FileField(
        upload_to="farmer_licenses/",
        validators=[
            FileExtensionValidator(allowed_extensions=["pdf", "jpg", "jpeg", "png"]),
            validate_license_file_size,
        ],
    )
    license_number = models.CharField(max_length=100, null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)
    extracted_data = models.JSONField(default=dict, blank=True)
    ocr_status = models.CharField(
        max_length=20,
        choices=[
            ("PENDING", "Pending"),
            ("PROCESSED", "Processed"),
            ("FAILED", "Failed"),
        ],
        default="PENDING",
    )
    is_verified = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("user", "document_type")]

    def __str__(self):
        return f"{self.user.username} - {self.get_document_type_display()} ({'Verified' if self.is_verified else 'Unverified'})"



class Notification(models.Model):
    class Type(models.TextChoices):
        WARNING = "WARNING", "Warning"
        INFO = "INFO", "Info"
        SUCCESS = "SUCCESS", "Success"

    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notif → {self.recipient} | {self.title}"

    class Meta:
        ordering = ["-sent_at"]


class AuditTrail(models.Model):
    who_performed = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    what_performed = models.TextField()
    when_performed = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        # Fallback to "System" if the performing user is None (e.g. deleted user or automated task)
        who = self.who_performed.username if self.who_performed else "System"
        return f"AuditTrails -> #{self.pk} - {who}"
