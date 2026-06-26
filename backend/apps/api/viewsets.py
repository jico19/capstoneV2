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
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == "create":
            return []
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return serializers.UserListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return serializers.UserWriteSeiralizer
        else:
            return serializers.UserListSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.User.objects.none()

        if user.role == "Admin":
            qs = models.User.objects.all()
        elif user.role == "Agri":
            qs = models.User.objects.filter(role="Farmer")
        else:
            return models.User.objects.filter(id=user.id)

        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone_no__icontains=search)
            )
        return qs

    @action(detail=False, methods=["post"], permission_classes=[])
    def verify_otp(self, request):
        phone_no = request.data.get("phone_no")
        otp_input = request.data.get("otp")

        if not phone_no or not otp_input:
            return Response(
                {"error": "Phone number and OTP are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Normalize phone number to match cache key
        if phone_no.startswith("09"):
            phone_no = "+63" + phone_no[1:]

        try:
            otp_input = int(otp_input)
        except (ValueError, TypeError):
            return Response(
                {"error": "OTP must be a numeric value."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Retrieve the OTP specifically tied to this phone number
        cached_otp = cache.get(f"otp_{phone_no}")

        if not cached_otp:
            return Response(
                {"error": "OTP has expired or hasn't been requested."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if int(cached_otp) != otp_input:
            return Response(
                {"error": "Invalid verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Success: remove OTP from cache and verify session
        cache.delete(f"otp_{phone_no}")
        return Response(
            {"msg": "Phone number verified!", "is_verified": True},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], permission_classes=[])
    def send_otp(self, request):
        phone_no = request.data.get("phone_no")

        if not phone_no:
            return Response(
                {"error": "No phone number provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Consistent normalization
        normalized_phone = phone_no
        if phone_no.startswith("09"):
            normalized_phone = "+63" + phone_no[1:]

        from apps.sms.services import send_sms

        try:
            # Generate and cache OTP tied to the normalized phone number
            otp = generate_otp(normalized_phone)

            success = send_sms(
                phone_number=normalized_phone,
                message=f"Your FarmPass OTP is: {otp}. Valid for 5 minutes."
            )

            if success:
                return Response(
                    {"msg": f"OTP successfully sent to {phone_no}"},
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(
                    {"error": "SMS provider error. Please try again later."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        except Exception as e:
            print(f"OTP SEND ERROR: {str(e)}")
            return Response(
                {"error": "Failed to send OTP due to a system error."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class NotificationViewSets(viewsets.ModelViewSet):
    serializer_class = serializers.NotificationSerializer
    queryset = models.Notification.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.Notification.objects.none()

        queryset = models.Notification.objects.filter(recipient=user)

        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == "true")

        return queryset

    @action(detail=False, methods=["get"])
    def mark_all_read(self, request):

        data = models.Notification.objects.filter(recipient=request.user).update(
            is_read=True
        )

        return Response("ok!!", status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        # Returns the count of unread notifications for the authenticated user.
        unread_count = models.Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()

        return Response({"unread_count": unread_count}, status=status.HTTP_200_OK)


class AuditTrailViewSets(viewsets.ModelViewSet):
    serializer_class = serializers.AuditTrailSerializer
    queryset = models.AuditTrail.objects.all()
    permission_classes = [IsAuthenticated]
