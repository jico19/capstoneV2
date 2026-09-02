from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.shortcuts import get_object_or_404
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

        if user.role == "Farmer":
            return models.IssuedPermit.objects.filter(application__farmer=user)
        return models.IssuedPermit.objects.all()

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

        permit_fee = request.data.get("permit_fee", 150.00)

        try:
            issued_permit = services.issue_permit(
                application=application_instance,
                user=request.user,
                permit_fee=permit_fee
            )
            return Response(
                {"msg": "Permit issued successfully!", "id": issued_permit.id},
                status=status.HTTP_201_CREATED,
            )
        except PermissionDenied as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else str(e)},
                status=status.HTTP_403_FORBIDDEN,
            )
        except ValidationError as e:
            return Response(
                {"error": e.detail[0] if isinstance(e.detail, list) else e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
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
                        )
                        if issued_permit_instance.aic_pdf
                        else None
                    ),
                },
                status=status.HTTP_200_OK,
            )
        except PermissionDenied as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else str(e)},
                status=status.HTTP_403_FORBIDDEN,
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
            return Response(
                {"error": e.detail[0] if isinstance(e.detail, list) else e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
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

        if errors:
            raise ValidationError(errors)

        config = models.MunicipalConfig.objects.first()
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
            config.save()

        serializer = serializers.MunicipalConfigSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)
