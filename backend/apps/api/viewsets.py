from rest_framework import viewsets, status, filters
from . import serializers
from . import models
from . import services
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError



class UserViewSets(viewsets.ModelViewSet):
    queryset = models.User.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "first_name", "last_name", "phone_no"]

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
            return models.User.objects.all()
        elif user.role == "Agri":
            return models.User.objects.filter(role="Farmer")
        else:
            return models.User.objects.filter(id=user.id)

    @action(detail=False, methods=["post"], permission_classes=[])
    def verify_otp(self, request):
        phone_no = request.data.get("phone_no")
        otp_input = request.data.get("otp")

        try:
            services.verify_otp(phone_no, otp_input)
            return Response(
                {"msg": "Phone number verified!", "is_verified": True},
                status=status.HTTP_200_OK,
            )
        except ValidationError as e:
            return Response(
                {"error": e.detail[0] if isinstance(e.detail, list) else e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["post"], permission_classes=[])
    def send_otp(self, request):
        phone_no = request.data.get("phone_no")

        try:
            services.send_otp(phone_no)
            return Response(
                {"msg": f"OTP successfully sent to {phone_no}"},
                status=status.HTTP_200_OK,
            )
        except ValidationError as e:
            code = getattr(e, "code", None)
            if code == "sms_error":
                return Response(
                    {"error": e.detail[0] if isinstance(e.detail, list) else e.detail},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            return Response(
                {"error": e.detail[0] if isinstance(e.detail, list) else e.detail},
                status=status.HTTP_400_BAD_REQUEST,
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
