# serializers.py
from rest_framework import serializers
from .models import PermitApplication, SubmittedDocument, OPVValidation, OCRValidationResult, IssuedPermit, TransportOrigin
from django.utils import timezone
from rest_framework.exceptions import ValidationError

# ─────────────────────────────────────────
# OCR VALIDATION RESULT
# ─────────────────────────────────────────

class OCRValidationResultListSerializer(serializers.ModelSerializer):
    """Used in: GET /documents/<id>/ocr/"""

    document_id = serializers.IntegerField(
        source='document.pk',
        read_only=True
    )

    class Meta:
        model = OCRValidationResult
        fields = ["id", "document_id","status", "extracted_field", "remarks"]


class OCRValidationResultWriteSerializer(serializers.ModelSerializer):
    """Used in: GET /documents/<id>/ocr/"""

    class Meta:
        model = OCRValidationResult
        fields = ["id", "document", "status", "extracted_field", "remarks", "validated_at", "manually_overridden"]

# ─────────────────────────────────────────
# TRANSPORT ORIGIN & DOCUMENTS
# ─────────────────────────────────────────

class SubmittedDocumentListSerializer(serializers.ModelSerializer):
    """Used in: GET /applications/<id>/ (nested inside permit application)"""
    document_type_display = serializers.CharField(source="get_document_type_display", read_only=True)
    ocr = OCRValidationResultListSerializer(read_only=True)

    class Meta:
        model = SubmittedDocument
        fields = ["id", "document_type", "document_type_display", "file", "ocr", "uploaded_at"]

class TransportOriginListSerializer(serializers.ModelSerializer):
    """Used in: GET /applications/<id>/ (nested)"""
    barangay_name = serializers.CharField(source='barangay.name', read_only=True)
    documents = SubmittedDocumentListSerializer(many=True, read_only=True)

    class Meta:
        model = TransportOrigin
        fields = ["id", "barangay", "barangay_name", "number_of_pigs", "documents"]

class TransportOriginWriteSerializer(serializers.ModelSerializer):
    """Used for nested creation/updates"""
    class Meta:
        model = TransportOrigin
        fields = ["id", "barangay", "number_of_pigs"]
        extra_kwargs = {'id': {'read_only': False, 'required': False}}


# ─────────────────────────────────────────
# PERMIT APPLICATION
# ─────────────────────────────────────────

class PermitApplicationListSerializer(serializers.ModelSerializer):
    """Used in: GET /applications/"""
    farmer_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = PermitApplication
        fields = ["id", "application_id", "destination", "farmer_name", "status", "is_issued", "status_display", "transport_date", "created_at"]

    def get_farmer_name(self, obj):
        return obj.farmer.get_full_name() or obj.farmer.username


class PermitApplicationDetailSerializer(serializers.ModelSerializer):
    """Used in: GET /applications/<id>/"""
    farmer_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    origins = TransportOriginListSerializer(many=True, read_only=True)
    all_documents = serializers.SerializerMethodField()

    class Meta:
        model = PermitApplication
        fields = [
            "id", "application_id", "farmer_name", "status", "status_display",
            "destination", "transport_date", "purpose", "origins", "all_documents", "created_at",
        ]

    def get_farmer_name(self, obj):
        return obj.farmer.get_full_name() or obj.farmer.username

    def get_all_documents(self, obj):
        # Flatten all documents from all transport origins
        all_docs = []
        for origin in obj.origins.all():
            all_docs.extend(origin.documents.all())
        return SubmittedDocumentListSerializer(all_docs, many=True).data


class PermitApplicationWriteSerializer(serializers.ModelSerializer):
    """Used in: POST /applications/"""
    origins = TransportOriginWriteSerializer(many=True)

    class Meta:
        model = PermitApplication
        fields = ["destination", "transport_date", "purpose", "origins"]

    def validate_transport_date(self, value):
        if value < timezone.now().date():
            raise ValidationError("Date cannot be in the past.")
        return value
    
    def create(self, validated_data):
        origins_data = validated_data.pop('origins')
        application = PermitApplication.objects.create(**validated_data)
        for origin_data in origins_data:
            TransportOrigin.objects.create(application=application, **origin_data)
        return application

    def update(self, instance, validated_data):
        origins_data = validated_data.pop('origins', None)
        
        # Update PermitApplication fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if origins_data is not None:
            # Keep track of IDs present in the request
            keep_origins = []
            for origin_data in origins_data:
                origin_id = origin_data.get('id')
                if origin_id:
                    # Update existing origin
                    origin_item = TransportOrigin.objects.get(id=origin_id, application=instance)
                    origin_item.barangay = origin_data.get('barangay', origin_item.barangay)
                    origin_item.number_of_pigs = origin_data.get('number_of_pigs', origin_item.number_of_pigs)
                    origin_item.save()
                    keep_origins.append(origin_item.id)
                else:
                    # Create new origin
                    new_origin = TransportOrigin.objects.create(application=instance, **origin_data)
                    keep_origins.append(new_origin.id)
            
            # Delete origins not in keep_origins
            instance.origins.exclude(id__in=keep_origins).delete()
        
        return instance


# ─────────────────────────────────────────
# OPV VALIDATION
# ─────────────────────────────────────────

class OPVValidationDetailSerializer(serializers.ModelSerializer):
    """Used in: GET /opv-validations/<id>/"""
    opv_staff_username = serializers.CharField(source="opv_staff.username", read_only=True, default=None)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = OPVValidation
        fields = [
            "id", "application", "opv_staff_username", "status", "status_display",
            "remarks", "veterinary_health_certificate", "transportation_pass", "validated_at",
        ]


class OPVValidationWriteSerializer(serializers.ModelSerializer):
    """Used in: POST /opv-validations/  |  PATCH /opv-validations/<id>/
    Note: 'opv_staff' is excluded — set it via perform_create(serializer.save(opv_staff=request.user))
    """

    class Meta:
        model = OPVValidation
        fields = ["application", "status", "remarks", "veterinary_health_certificate", "transportation_pass"]

    def validate_veterinary_health_certificate(self, value):
        """Check if file size is less than 30MB."""
        limit = 30 * 1024 * 1024
        if value and value.size > limit:
            raise ValidationError("Veterinary Health Certificate size cannot exceed 30MB.")
        return value

    def validate_transportation_pass(self, value):
        """Check if file size is less than 30MB."""
        limit = 30 * 1024 * 1024
        if value and value.size > limit:
            raise ValidationError("Transportation Pass size cannot exceed 30MB.")
        return value


# ─────────────────────────────────────────
# ISSUED PERMIT
# ─────────────────────────────────────────

class IssuedPermitDetailSerializer(serializers.ModelSerializer):
    """Used in: GET /permits/<id>/"""
    issued_by_username = serializers.CharField(source="issued_by.username", read_only=True, default=None)

    class Meta:
        model = IssuedPermit
        fields = [
            "id", "permit_number", "application", "issued_by_username",
            "is_paid", "payment_method", "permit_pdf", "date_issued", "valid_until",
        ]


class IssuedPermitWriteSerializer(serializers.ModelSerializer):
    """Used in: POST /permits/
    Note: 'issued_by' is excluded — set it via perform_create(serializer.save(issued_by=request.user))
    """

    class Meta:
        model = IssuedPermit
        fields = ["application", "payment_method", "valid_until"]