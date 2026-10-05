from rest_framework import serializers
from . import models


class PaymentListSerializer(serializers.ModelSerializer):
    payment_status = serializers.CharField(
        source = 'get_status_display',
        read_only=True
    )

    confirmed_by = serializers.CharField(
        source = 'confirmed_by.username',
        read_only = True,
        default = '',
    )
    
    farmer_name = serializers.SerializerMethodField()
    farmer_phone = serializers.CharField(
        source = 'issued_permit.application.farmer.phone_no',
        read_only = True,
        default = '',
    )
    permit_number = serializers.CharField(
        source = 'issued_permit.permit_number',
        read_only = True,
        default = '',
    )
    application_id = serializers.CharField(
        source = 'issued_permit.application.application_id',
        read_only = True,
        default = '',
    )
    destination = serializers.CharField(
        source = 'issued_permit.application.destination',
        read_only = True,
        default = '',
    )
    total_heads = serializers.SerializerMethodField()
    raw_status = serializers.CharField(source='status', read_only=True)
    payment_deadline = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    def get_farmer_name(self, obj):
        try:
            farmer = obj.issued_permit.application.farmer
            return farmer.get_full_name() or farmer.username
        except Exception:
            return "N/A"

    def get_total_heads(self, obj):
        try:
            origins = obj.issued_permit.application.origins.all()
            return sum(o.number_of_pigs for o in origins)
        except Exception:
            return 0

    def get_payment_deadline(self, obj):
        try:
            deadline = obj.issued_permit.payment_deadline or obj.expires_at
            return deadline.isoformat() if deadline else None
        except Exception:
            return None

    def get_is_expired(self, obj):
        try:
            from django.utils import timezone
            if obj.issued_permit.is_paid:
                return False
            deadline = obj.issued_permit.payment_deadline or obj.expires_at
            return (timezone.now() > deadline) if deadline else False
        except Exception:
            return False

    class Meta:
        model = models.PaymentHistory
        fields = [
            'id',
            'or_number',
            'method',
            'payment_status',
            'raw_status',
            'amount',
            'farmer_name',
            'farmer_phone',
            'permit_number',
            'application_id',
            'destination',
            'total_heads',
            'paymongo_session_id',
            'paymongo_payment_intent_id',
            'expires_at',
            'payment_deadline',
            'is_expired',
            'confirmed_by',
            'confirmed_at',
            'created_at',
        ]



class PaymentWriteAndDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PaymentHistory
        fields = '__all__'
        read_only_fields = [
            'status', 'amount', 'method', 'or_number', 'confirmed_by',
            'confirmed_at', 'paymongo_session_id',
            'paymongo_payment_intent_id', 'paymongo_payment_id',
            'expires_at', 'issued_permit', 'created_at',
        ]