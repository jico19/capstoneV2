import logging
from datetime import datetime
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status, filters, viewsets
from django.db.models import Q, Count
from . import serializers
from . import models
from . import services
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError
from .base import BaseModelViewSet

logger = logging.getLogger(__name__)


def safe_parse_date(val):
    if not val:
        return None
    val_str = str(val).strip()
    clean_str = val_str.split('T')[0].split(' ')[0]
    parsed = parse_date(clean_str)
    if parsed:
        return parsed
    parsed_dt = parse_datetime(val_str)
    if parsed_dt:
        return parsed_dt.date()
    try:
        return datetime.strptime(clean_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None

class UserViewSet(BaseModelViewSet):
    queryset = models.User.objects.all()
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "first_name", "last_name", "phone_no"]

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return serializers.UserListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return serializers.UserWriteSerializer
        else:
            return serializers.UserListSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        # Log explicit consent under Data Privacy Act of 2012 (RA 10173) upon account creation
        ip = (
            self.request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
            or self.request.META.get("REMOTE_ADDR")
        )
        ua = self.request.META.get("HTTP_USER_AGENT", "")
        models.PrivacyConsentLog.objects.create(
            user=user,
            consent_version="v1.0-2026",
            consent_scope="registration_kyc_transport",
            ip_address=ip if ip else None,
            user_agent=ua,
        )

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.User.objects.none()

        if user.role == "Admin":
            queryset = models.User.objects.all()
        elif user.role == "Agri":
            # Agri can see Farmers, Barangay Officials, and their own profile
            queryset = models.User.objects.filter(
                Q(role__in=["Farmer", "Barangay"]) | Q(id=user.id)
            )
        else:
            # All other roles (OPV, Inspector, Farmer) can only see themselves
            queryset = models.User.objects.filter(id=user.id)

        role_filter = self.request.query_params.get("role")
        if role_filter:
            queryset = queryset.filter(role=role_filter)

        verification_status_filter = self.request.query_params.get("verification_status")
        if verification_status_filter:
            queryset = queryset.filter(verification_status=verification_status_filter)

        return queryset.select_related("barangay", "verified_by").prefetch_related("farmer_documents")

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = serializers.UserListSerializer(request.user, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def export_personal_data(self, request):
        """
        Data Privacy Act of 2012 (RA 10173 Sec. 16 - Right to Data Portability).
        Generates a comprehensive machine-readable personal dossier for the authenticated citizen.
        """
        user = request.user
        from .audit import log_audit_event
        from apps.permits.models import PermitApplication

        user_data = serializers.UserListSerializer(user, context={"request": request}).data
        apps = list(PermitApplication.objects.filter(farmer=user).values(
            "id", "application_id", "status", "destination", "transport_date", "created_at"
        ))
        consents = list(models.PrivacyConsentLog.objects.filter(user=user).values(
            "consent_version", "consent_scope", "ip_address", "agreed_at"
        ))

        log_audit_event(
            request=request,
            action_type=models.AuditTrail.ActionType.EXPORT,
            what_performed=f"[DPA_DATA_PORTABILITY] - Citizen {user.username} requested personal data archive export.",
            target_user=user,
        )

        return Response({
            "generated_at": timezone.now().isoformat(),
            "data_subject": user_data,
            "permit_records": apps,
            "consent_history": consents,
        })

    @action(detail=False, methods=["get", "post"], permission_classes=[IsAuthenticated])
    def documents(self, request):
        user = request.user
        if request.method == "GET":
            docs = models.FarmerDocument.objects.filter(user=user)
            serializer = serializers.FarmerDocumentSerializer(docs, many=True, context={"request": request})
            return Response({
                "verification_status": user.verification_status,
                "verification_remarks": user.verification_remarks,
                "verified_at": user.verified_at,
                "documents": serializer.data,
            })

        # POST: upload documents
        doc_types = [
            models.FarmerDocument.DocumentType.HANDLERS_LICENSE,
            models.FarmerDocument.DocumentType.TRANSPORT_CARRIER_REG,
        ]

        uploaded_any = False
        newly_uploaded_docs = []

        for dtype in doc_types:
            file = request.FILES.get(dtype)
            expiry_str = request.data.get(f"{dtype}_expiry") or request.data.get(f"{dtype}_expiration_date")
            expiry = safe_parse_date(expiry_str) if expiry_str else None
            license_no = request.data.get(f"{dtype}_license_number") or request.data.get(f"{dtype}_number")

            if file or expiry or license_no:
                doc = models.FarmerDocument.objects.filter(user=user, document_type=dtype).first()
                if doc:
                    if file:
                        doc.file = file
                        doc.ocr_status = "PENDING"
                        doc.extracted_data = {}
                        doc.expiration_date = expiry
                        doc.license_number = license_no.strip() if license_no else None
                    if expiry:
                        doc.expiration_date = expiry
                    if license_no:
                        doc.license_number = license_no.strip()
                    doc.is_verified = False
                    doc.full_clean()
                    doc.save()
                    if file:
                        newly_uploaded_docs.append(doc)
                else:
                    if file:
                        doc = models.FarmerDocument(
                            user=user,
                            document_type=dtype,
                            file=file,
                            license_number=license_no.strip() if license_no else None,
                            expiration_date=expiry,
                            is_verified=False,
                            ocr_status="PENDING",
                        )
                        doc.full_clean()
                        doc.save()
                        newly_uploaded_docs.append(doc)
                uploaded_any = True

        # Trigger background OCR extraction for newly uploaded documents
        for doc in newly_uploaded_docs:
            try:
                from apps.ocr.tasks import extract_farmer_document_info
                transaction.on_commit(
                    lambda doc_id=doc.id, file_name=doc.file.name: extract_farmer_document_info.enqueue(doc_id, expected_file_name=file_name)
                )
            except Exception as e:
                logger.error(f"Failed to enqueue OCR for FarmerDocument {doc.id}: {str(e)}")

        existing_types = set(
            models.FarmerDocument.objects.filter(user=user).values_list("document_type", flat=True)
        )
        required_types = set(doc_types)

        if required_types.issubset(existing_types):
            user.verification_status = models.User.VerificationStatus.PENDING_REVIEW
            user.verification_remarks = ""
            user.save(update_fields=["verification_status", "verification_remarks"])

            models.Notification.objects.create(
                recipient=user,
                type=models.Notification.Type.INFO,
                section=models.Notification.Section.FARMERS,
                title="Documents Submitted for Verification",
                message="Your required licenses have been submitted and are now under review by the Municipal Agriculture Office.",
            )

            models.AuditTrail.objects.create(
                who_performed=user,
                what_performed=f"Farmer {user.username} submitted required licenses for KYC verification.",
                when_performed=timezone.now(),
            )

        docs = models.FarmerDocument.objects.filter(user=user)
        serializer = serializers.FarmerDocumentSerializer(docs, many=True, context={"request": request})
        return Response({
            "verification_status": user.verification_status,
            "verification_remarks": user.verification_remarks,
            "documents": serializer.data,
            "message": "Documents updated successfully.",
        })


    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def verify_documents(self, request, pk=None):
        if request.user.role not in ["Admin", "Agri"]:
            return Response(
                {"error": "Only Agriculture Office or Admin can verify farmer documents."},
                status=status.HTTP_403_FORBIDDEN,
            )

        target_user = self.get_object()
        action_type = request.data.get("action") or request.data.get("status")
        remarks = request.data.get("remarks", "")

        if action_type in ["approve", "VERIFIED", "APPROVE"]:
            # Optionally update document expiration dates or license numbers provided during review
            doc_updates = request.data.get("document_updates") or {}
            if isinstance(doc_updates, dict):
                for dtype, vals in doc_updates.items():
                    if isinstance(vals, dict):
                        fdoc = target_user.farmer_documents.filter(document_type=dtype).first()
                        if fdoc:
                            up_fields = []
                            if "expiration_date" in vals and vals["expiration_date"]:
                                parsed_exp = safe_parse_date(vals["expiration_date"])
                                if parsed_exp:
                                    fdoc.expiration_date = parsed_exp
                                    up_fields.append("expiration_date")
                            if "license_number" in vals and vals["license_number"]:
                                fdoc.license_number = str(vals["license_number"]).strip()
                                up_fields.append("license_number")
                            if up_fields:
                                fdoc.save(update_fields=up_fields)

            target_user.verification_status = models.User.VerificationStatus.VERIFIED
            target_user.verification_remarks = remarks
            target_user.verified_at = timezone.now()
            target_user.verified_by = request.user
            target_user.save()

            target_user.farmer_documents.all().update(is_verified=True)


            models.Notification.objects.create(
                recipient=target_user,
                type=models.Notification.Type.SUCCESS,
                section=models.Notification.Section.FARMERS,
                title="Account Fully Verified",
                message="Your credentials have been verified by MAO. You are now authorized to submit livestock transport permit requests.",
            )

            if target_user.receive_sms and target_user.phone_no:
                try:
                    from apps.sms.services import send_sms
                    send_sms(
                        target_user.phone_no,
                        "FarmPass: Your account documents have been approved by MAO. You can now request livestock permits.",
                    )
                except Exception:
                    pass

            models.AuditTrail.objects.create(
                who_performed=request.user,
                what_performed=f"MAO {request.user.username} approved and verified documents for farmer {target_user.username}.",
                when_performed=timezone.now(),
            )

            return Response({
                "msg": f"Farmer {target_user.username} successfully verified.",
                "verification_status": target_user.verification_status,
            })

        elif action_type in ["reject", "REJECTED", "REJECT"]:
            target_user.verification_status = models.User.VerificationStatus.REJECTED
            target_user.verification_remarks = remarks or "Documents did not meet municipal verification criteria."
            target_user.save()

            target_user.farmer_documents.all().update(is_verified=False)

            models.Notification.objects.create(
                recipient=target_user,
                type=models.Notification.Type.WARNING,
                section=models.Notification.Section.FARMERS,
                title="Document Verification Needs Attention",
                message=f"Your documents were not approved: {target_user.verification_remarks}. Please re-upload updated copies.",
            )

            models.AuditTrail.objects.create(
                who_performed=request.user,
                what_performed=f"MAO {request.user.username} rejected documents for farmer {target_user.username}. Reason: {target_user.verification_remarks}",
                when_performed=timezone.now(),
            )

            return Response({
                "msg": f"Farmer {target_user.username} verification rejected.",
                "verification_status": target_user.verification_status,
                "verification_remarks": target_user.verification_remarks,
            })

        return Response(
            {"error": "Invalid action. Must be 'approve' or 'reject'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
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

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
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
            return Response(
                {"error": "Failed to send OTP due to a system error."},
                status=status.HTTP_400_BAD_REQUEST,
            )



class NotificationViewSet(BaseModelViewSet):
    serializer_class = serializers.NotificationSerializer
    queryset = models.Notification.objects.all()

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.Notification.objects.none()

        queryset = models.Notification.objects.filter(recipient=user)

        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == "true")

        return queryset

    @action(detail=False, methods=["get", "post"])
    def mark_all_read(self, request):

        data = models.Notification.objects.filter(recipient=request.user).update(
            is_read=True
        )

        return Response("ok!!", status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        """Returns the count of unread notifications for the authenticated user."""
        unread_count = models.Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()

        return Response({"unread_count": unread_count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def section_counts(self, request):
        """Returns unread notification counts grouped by section for the authenticated user."""
        counts = (
            models.Notification.objects.filter(recipient=request.user, is_read=False)
            .values("section")
            .annotate(count=Count("id"))
        )
        data = {item["section"]: item["count"] for item in counts}
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def mark_section_read(self, request):
        """Marks unread notifications in a specific section as read."""
        section = request.data.get("section")
        if section:
            models.Notification.objects.filter(
                recipient=request.user, section=section, is_read=False
            ).update(is_read=True)
            return Response({"msg": f"Section {section} notifications marked read."}, status=status.HTTP_200_OK)
        return Response({"error": "section parameter is required."}, status=status.HTTP_400_BAD_REQUEST)


class AuditTrailViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.AuditTrailSerializer
    queryset = models.AuditTrail.objects.all()
    http_method_names = ["get", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.AuditTrail.objects.none()

        queryset = models.AuditTrail.objects.select_related("who_performed").order_by("-when_performed")
        if user.role in ["Farmer", "Inspector", "Barangay"]:
            return queryset.filter(who_performed=user)
        elif user.role in ["Agri", "Admin", "Opv"]:
            return queryset
        return queryset.none()
