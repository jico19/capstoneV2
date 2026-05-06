from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from . import models


class UserListSerializer(serializers.ModelSerializer):
    barangay_name = serializers.CharField(source='barangay.name', read_only=True)

    class Meta:
        model = models.User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'role',
            'phone_no',
            'address',
            'barangay',
            'barangay_name',
            'receive_sms',
        ]

class UserWriteSeiralizer(serializers.ModelSerializer):
    class Meta:
        model = models.User
        fields = [
            'username',
            'password',
            'phone_no',
            'first_name',
            'last_name',
            'address',
            'barangay',
            'receive_sms',
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }

    def create(self, validated_data):
        print(validated_data)
        return models.User.objects.create_user(**validated_data)


class NotificationSerializer(serializers.ModelSerializer):

    recipient_name = serializers.CharField(
        source = 'recipient.username',
        read_only=True
    )

    class Meta:
        model = models.Notification
        fields = [
            'id',
            'recipient_name',
            'type',
            'title',
            'message',
            'is_read',
            'sent_at'
        ]


class CustomTokenObtainSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        token['id'] = user.id
        token['role'] = user.role
        token['username'] = user.username
        
        return token