from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from apps.api.models import AuditTrail
from apps.api.base import BaseModelViewSet
from .. import models, serializers, services

class IssuedPermitViewSet(BaseModelViewSet):
    queryset = models.IssuedPermit.objects.all()

    def update(self, request, *args, **kwargs):
        if request.user.role != "Agri":
            raise PermissionDenied("Only Agri officers can update permits.")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role != "Agri":
            raise PermissionDenied("Only Agri officers can update permits.")
        return super().partial_update(request, *args, **kwargs)

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return serializers.IssuedPermitDetailSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return serializers.IssuedPermitWriteSerializer
        else:
            return serializers.IssuedPermitDetailSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.IssuedPermit.objects.none()

        base_qs = models.IssuedPermit.objects.select_related("issued_by", "application")
        if user.role == "Farmer":
            return base_qs.filter(application__farmer=user)
        elif user.role in ["Agri", "Opv", "Admin"]:
            return base_qs.all()
        return models.IssuedPermit.objects.none()

    def create(self, request, *args, **kwargs):
        """
        Issue a permit for a validated application.
        Includes guards for duplicate permits and invalid application status.
        """
        application_id = request.data.get("application_id")
        if not application_id:
            return Response(
                {"error": "application_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application_instance = get_object_or_404(
            models.PermitApplication, pk=application_id
        )

        # Enforce official municipal configuration fee; prevent client fee manipulation
        permit_fee = models.MunicipalConfig.get_fee()

        issued_permit = services.issue_permit(
            application=application_instance,
            user=request.user,
            permit_fee=permit_fee
        )
        return Response(
            {"msg": "Permit issued successfully!", "id": issued_permit.id},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve issued permit documents (VHC, Pass, and the Permit PDF itself).
        Includes guards for unpaid permits and missing related records.
        """
        application_id = self.kwargs.get("pk")
        application_instance = get_object_or_404(
            models.PermitApplication, pk=application_id
        )

        try:
            opv_docs_instance, issued_permit_instance = services.get_issued_permit_details(
                application=application_instance,
                user=request.user
            )
        except ValidationError as e:
            code = getattr(e, "code", None)
            if code == "not_found":
                return Response(
                    {"error": e.detail[0] if isinstance(e.detail, list) else e.detail},
                    status=status.HTTP_404_NOT_FOUND,
                )
            elif code == "pdf_generating":
                return Response(
                    {"error": e.detail[0] if isinstance(e.detail, list) else e.detail},
                    status=status.HTTP_202_ACCEPTED,
                )
            raise

        return Response(
            {
                "veterinary_health_certificate": (
                    request.build_absolute_uri(
                        opv_docs_instance.veterinary_health_certificate.url
                    )
                    if opv_docs_instance.veterinary_health_certificate
                    else None
                ),
                "transportation_pass": (
                    request.build_absolute_uri(
                        opv_docs_instance.transportation_pass.url
                    )
                    if opv_docs_instance.transportation_pass
                    else None
                ),
                "issued_permit_pdf": request.build_absolute_uri(
                    issued_permit_instance.permit_pdf.url
                ),
                "animal_inspection_certificate": (
                    request.build_absolute_uri(
                        issued_permit_instance.aic_pdf.url
                        if issued_permit_instance.aic_pdf
                        else application_instance.aic_pdf.url
                    )
                    if (issued_permit_instance.aic_pdf or application_instance.aic_pdf)
                    else None
                ),
                "mao_certificate": (
                    request.build_absolute_uri(
                        issued_permit_instance.mao_certificate_pdf.url
                        if issued_permit_instance.mao_certificate_pdf
                        else application_instance.mao_certificate_pdf.url
                    )
                    if (issued_permit_instance.mao_certificate_pdf or application_instance.mao_certificate_pdf)
                    else None
                ),
            },
            status=status.HTTP_200_OK,
        )


class MunicipalConfigViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """GET /api/municipal-config/"""
        # Anyone authenticated can view the permit settings
        fee = models.MunicipalConfig.get_fee()
        config = models.MunicipalConfig.objects.first()
        serializer = serializers.MunicipalConfigSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        """POST /api/municipal-config/"""
        # Only Agri officers can change it
        if request.user.role != "Agri":
            raise PermissionDenied("Only Agri officers can configure permit settings.")
        
        vhc_fee = request.data.get("vet_health_cert_fee")
        tp_fee = request.data.get("transport_pass_fee")
        ltp_fee = request.data.get("local_transport_permit_fee")
        validity = request.data.get("validity_days")
        oic_name = (request.data.get("oic_name") or "").strip()
        oic_title = (request.data.get("oic_title") or "").strip()

        errors = {}
        
        def validate_positive_decimal(val, field_name):
            if val is None:
                errors[field_name] = "This field is required."
                return None
            try:
                d_val = float(val)
                if d_val < 0:
                    raise ValueError()
                return d_val
            except ValueError:
                errors[field_name] = "Must be a positive number."
                return None

        def validate_positive_integer(val, field_name):
            if val is None:
                errors[field_name] = "This field is required."
                return None
            try:
                i_val = int(val)
                if i_val <= 0:
                    raise ValueError()
                return i_val
            except ValueError:
                errors[field_name] = "Must be a positive integer greater than zero."
                return None

        vhc_val = validate_positive_decimal(vhc_fee, "vet_health_cert_fee")
        tp_val = validate_positive_decimal(tp_fee, "transport_pass_fee")
        ltp_val = validate_positive_decimal(ltp_fee, "local_transport_permit_fee")
        validity_val = validate_positive_integer(validity, "validity_days")

        if len(oic_name) > 100:
            errors["oic_name"] = "Must be 100 characters or fewer."
        if len(oic_title) > 100:
            errors["oic_title"] = "Must be 100 characters or fewer."

        if errors:
            raise ValidationError(errors)

        with transaction.atomic():
            config = models.MunicipalConfig.objects.select_for_update().first()
            if not config:
                config = models.MunicipalConfig.objects.create(
                    vet_health_cert_fee=vhc_val,
                    transport_pass_fee=tp_val,
                    local_transport_permit_fee=ltp_val,
                    validity_days=validity_val
                )
            else:
                config.vet_health_cert_fee = vhc_val
                config.transport_pass_fee = tp_val
                config.local_transport_permit_fee = ltp_val
                config.validity_days = validity_val

            # Global fallback signatory. The Settings > Signatory roster
            # (position defaults) takes precedence over these values; these
            # only apply when no roster default exists.
            if oic_name:
                config.oic_name = oic_name
            if oic_title:
                config.oic_title = oic_title
            config.save()

            AuditTrail.objects.create(
                who_performed=request.user,
                what_performed=(
                    f"[MUNICIPAL CONFIG UPDATED] - VHC Fee: ₱{vhc_val}, TP Fee: ₱{tp_val}, "
                    f"LTP Fee: ₱{ltp_val}, Validity: {validity_val} days"
                    + (f", Default Signatory: {config.oic_name} ({config.oic_title})"
                       if oic_name or oic_title else "")
                ),
                when_performed=timezone.now(),
            )

        serializer = serializers.MunicipalConfigSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SignatoryViewSet(BaseModelViewSet):
    """
    Roster of officials who may sign MAO-issued documents.

    Reads are open to any authenticated user because the roster feeds the
    signatory pickers; writes are restricted to Agri officers. Entries are
    retired rather than deleted — `ApplicationSignatory.signatory` is PROTECTed,
    so a hard delete would fail once a signatory has signed anything.
    """

    queryset = models.Signatory.objects.all()
    serializer_class = serializers.SignatorySerializer

    def _require_agri(self):
        if self.request.user.role != "Agri":
            raise PermissionDenied("Only Agri officers can manage signatories.")

    @staticmethod
    def _clear_conflicting_default(validated_data, instance=None):
        """
        Keep exactly one default per position.

        The DB enforces this with a conditional unique constraint, so the
        previous default has to be cleared *before* the new one is written.
        """
        if not validated_data.get("is_default"):
            return

        position = validated_data.get("position") or (instance.position if instance else None)
        if not position:
            return

        conflicting = models.Signatory.objects.filter(position=position, is_default=True)
        if instance and instance.pk:
            conflicting = conflicting.exclude(pk=instance.pk)
        conflicting.update(is_default=False)

    def create(self, request, *args, **kwargs):
        self._require_agri()
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._require_agri()
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._require_agri()
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._require_agri()
        signatory = self.get_object()
        signatory.is_active = False
        signatory.is_default = False
        signatory.save(update_fields=["is_active", "is_default", "updated_at"])

        AuditTrail.objects.create(
            who_performed=request.user,
            what_performed=(
                f"[SIGNATORY RETIRED] - {signatory.name} "
                f"({signatory.get_position_display()})"
            ),
            when_performed=timezone.now(),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_create(self, serializer):
        self._clear_conflicting_default(serializer.validated_data)
        signatory = serializer.save()
        AuditTrail.objects.create(
            who_performed=self.request.user,
            what_performed=(
                f"[SIGNATORY ADDED] - {signatory.name} "
                f"({signatory.get_position_display()})"
            ),
            when_performed=timezone.now(),
        )

    def perform_update(self, serializer):
        self._clear_conflicting_default(serializer.validated_data, serializer.instance)
        signatory = serializer.save()
        AuditTrail.objects.create(
            who_performed=self.request.user,
            what_performed=(
                f"[SIGNATORY UPDATED] - {signatory.name} "
                f"({signatory.get_position_display()})"
            ),
            when_performed=timezone.now(),
        )
