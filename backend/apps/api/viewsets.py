from rest_framework import viewsets, status
from . import serializers
from . import models
from rest_framework.decorators import action    
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import requests
from django.conf import settings
from django.core.cache import cache
from .utils import generate_otp

class UserViewSets(viewsets.ModelViewSet):
    queryset = models.User.objects.all()
    # permission_classes = [IsAuthenticated]


    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return serializers.UserListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.UserWriteSeiralizer
        else:
            return serializers.UserListSerializer
    
    # def get_queryset(self):
    #     user = self.request.user
    #     if user.role == 'Admin':
    #         return models.User.objects.all()
    #     # Non-admin users can only see their own profile
    #     return models.User.objects.filter(id=user.id)
    

    @action(detail=False, methods=['post'])
    def verify_otp(self, request):
        phone_no = request.data.get('phone_no')
        otp_input = request.data.get('otp')

        if not phone_no or not otp_input:
            return Response({
                "error": "Phone number and OTP are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Normalize phone number to match cache key
        if phone_no.startswith("09"):
            phone_no = "+63" + phone_no[1:]

        try:
            otp_input = int(otp_input)
        except (ValueError, TypeError):
            return Response({
                "error": "OTP must be a numeric value."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve the OTP specifically tied to this phone number
        cached_otp = cache.get(f'otp_{phone_no}')

        if not cached_otp:
            return Response({
                "error": "OTP has expired or hasn't been requested."
            }, status=status.HTTP_400_BAD_REQUEST)

        if int(cached_otp) != otp_input:
            return Response({
                "error": "Invalid verification code."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Success: remove OTP from cache and verify session
        cache.delete(f"otp_{phone_no}")
        return Response({
            "msg": "Phone number verified!",
            "is_verified": True
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def send_otp(self, request):
        phone_no = request.data.get('phone_no')

        if not phone_no:
            return Response({
                "error": "No phone number provided."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Consistent normalization
        normalized_phone = phone_no
        if phone_no.startswith("09"):
            normalized_phone = "+63" + phone_no[1:]
        
        try:
            # Generate and cache OTP tied to the normalized phone number
            otp = generate_otp(normalized_phone)

            res = requests.post(
                f"{settings.SMS_BASE_URL}/messages",
                auth=(settings.SMS_USERNAME, settings.SMS_PASSWORD),
                json={
                    "textMessage": {"text": f"Your LivestockPass OTP is: {otp}. Valid for 5 minutes."},
                    "phoneNumbers": [normalized_phone]
                },
                timeout=10
            )
            
            if res.status_code == 202:
                return Response({
                    "msg": f"OTP successfully sent to {phone_no}"
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "error": "SMS provider error. Please try again later."
                }, status=status.HTTP_502_BAD_GATEWAY)

        except Exception as e:
            print(f"OTP SEND ERROR: {str(e)}")
            return Response({
                "error": "Failed to send OTP due to a system error."
            }, status=status.HTTP_400_BAD_REQUEST)


class NotificationViewSets(viewsets.ModelViewSet):
    serializer_class = serializers.NotificationSerializer 
    queryset = models.Notification.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.Notification.objects.none()

        if user.role == 'Farmer':
            return models.Notification.objects.filter(
                recipient=user
            )
        
        # Other roles might need to see their own notifications too
        return models.Notification.objects.none()
        
    @action(detail=False, methods=['get'])
    def mark_all_read(self, request):

        data = models.Notification.objects.filter(
            recipient = request.user
        ).update(is_read=True)

        return Response('ok!!', status=status.HTTP_200_OK)
    
class AuditTrailViewSets(viewsets.ModelViewSet):
    serializer_class = serializers.AuditTrailSerializer
    queryset = models.AuditTrail.objects.all()
    permission_classes = [IsAuthenticated]