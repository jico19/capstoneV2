from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.shortcuts import get_object_or_404
from .. import models, serializers, services

class OPVValidationViewSets(viewsets.ModelViewSet):
    queryset = models.OPVValidation.objects.all()
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return serializers.OPVValidationDetailSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return serializers.OPVValidationWriteSerializer
        else:
            return serializers.OPVValidationDetailSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.OPVValidation.objects.none()

        if user.role == "Farmer":
            return models.OPVValidation.objects.filter(application__farmer=user)
        return models.OPVValidation.objects.all()

    # actions
    @action(detail=False, methods=["get"])
    def application(self, request):
        """Display the Application to OPV"""
        if request.user.role != "Opv":
            return Response(
                {"error": "Not Authorized"}, status=status.HTTP_403_FORBIDDEN
            )

        qs = models.PermitApplication.objects.filter(
            status__in=[
                models.PermitApplication.Status.FORWARDED_TO_OPV,
                models.PermitApplication.Status.RESUBMISSION,
                models.PermitApplication.Status.OPV_REJECTED,
                models.PermitApplication.Status.OPV_VALIDATED,
            ]
        )

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = serializers.PermitApplicationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = serializers.PermitApplicationListSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve the application attached with documents."""
        application_instance = get_object_or_404(models.PermitApplication, pk=pk)
        data = request.data
        files = request.FILES

        try:
            services.approve_opv_validation(
                application=application_instance,
                staff=request.user,
                data=data,
                files=files
            )
            return Response({"msg": "Approved successfully"}, status=status.HTTP_200_OK)
        except PermissionDenied as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else str(e)},
                status=status.HTTP_403_FORBIDDEN,
            )
        except ValidationError as e:
            return Response(
                {
                    "error": (
                        str(e.detail[0])
                        if isinstance(e.detail, list)
                        else str(e.detail)
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Reject the applications with reason"""
        application_instance = get_object_or_404(models.PermitApplication, pk=pk)
        data = request.data

        try:
            services.reject_opv_validation(
                application=application_instance,
                staff=request.user,
                data=data
            )
            return Response({"msg": "Rejected successfully"}, status=status.HTTP_200_OK)
        except PermissionDenied as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else str(e)},
                status=status.HTTP_403_FORBIDDEN,
            )
        except ValidationError as e:
            return Response(
                {
                    "error": (
                        str(e.detail[0])
                        if isinstance(e.detail, list)
                        else str(e.detail)
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def resubmit(self, request, pk=None):
        """Return the applications for resubmission with reason"""
        application_instance = get_object_or_404(models.PermitApplication, pk=pk)
        data = request.data

        try:
            services.request_opv_resubmission(
                application=application_instance,
                staff=request.user,
                data=data
            )
            return Response(
                {"msg": "Returned for resubmission successfully"},
                status=status.HTTP_200_OK,
            )
        except PermissionDenied as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else str(e)},
                status=status.HTTP_403_FORBIDDEN,
            )
        except ValidationError as e:
            return Response(
                {
                    "error": (
                        str(e.detail[0])
                        if isinstance(e.detail, list)
                        else str(e.detail)
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
