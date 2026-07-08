from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.shortcuts import get_object_or_404
from .. import models, serializers, services

class IssuedPermitViewSets(viewsets.ModelViewSet):
    queryset = models.IssuedPermit.objects.all()
    permission_classes = [IsAuthenticated]

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

        try:
            issued_permit = services.issue_permit(
                application=application_instance,
                user=request.user
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
