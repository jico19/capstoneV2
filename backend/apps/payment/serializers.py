from rest_framework import serializers
from . import models


class PaymentListSerializers(serializers.ModelSerializer):
    payment_status = serializers.CharField(
        source = 'get_status_display',
        read_only=True
    )

    confirmed_by = serializers.CharField(
        source = 'confirmed_by.username',
        read_only = True,
    )
    
    farmer_name = serializers.CharField(
        source = 'issued_permit.application.farmer.username',
        read_only = True
    )

    class Meta:
        model = models.PaymentHistory
        fields = [
            'id',
            'method',
            'payment_status',
            'amount',
            'farmer_name',
            'paymongo_session_id',
            'confirmed_by',
        ]



class PaymentWriteAndDetailSerializers(serializers.ModelSerializer):
    class Meta:
        model = models.PaymentHistory
        fields = '__all__'