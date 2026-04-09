from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from . import models


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.User
        fields = [
            'id',
            'username',
            'role',
            'phone_no',
            'address',
        ]

class UserWriteSeiralizer(serializers.ModelSerializer):
    class Meta:
        model = models.User
        fields = [
            'username',
            'password',
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
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