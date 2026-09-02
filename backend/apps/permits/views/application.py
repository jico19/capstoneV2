from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from apps.api.base import BaseModelViewSet
from ..filters import PermitApplicationFilter
from .. import models, serializers, services

class PermitApplicationViewSet(BaseModelViewSet):
    queryset = models.PermitApplication.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = PermitApplicationFilter

    def get_serializer_class(self):
        if self.action == "list":
            return serializers.PermitApplicationListSerializer
        elif self.action in ["retrieve", "verify"]:
            return serializers.PermitApplicationDetailSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return serializers.PermitApplicationWriteSerializer
        else:
            return serializers.PermitApplicationListSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.PermitApplication.objects.none()

        if user.role == "Farmer":
            return models.PermitApplication.objects.filter(farmer=user)

        elif user.role == "Agri":
            return models.PermitApplication.objects.all()

        elif user.role == "Opv":
            return models.PermitApplication.objects.filter(
                status__in=[
                    models.PermitApplication.Status.FORWARDED_TO_OPV,
                    models.PermitApplication.Status.OPV_REJECTED,
                    models.PermitApplication.Status.OPV_VALIDATED,
                ]
            )

        return models.PermitApplication.objects.all()

    def _parse_bracket_data(self, data):
        """
        Helper to parse origins[i][field] style keys from FormData/QueryDict.
        """
        origins_data = []
        i = 0
        while f"origins[{i}][barangay]" in data:
            origin = {
                "barangay": data.get(f"origins[{i}][barangay]"),
            }
            # Parse pig types and counts if present
            for field in ["inahin", "barako", "fattener", "grower", "bulaw", "starter", "number_of_pigs"]:
                key = f"origins[{i}][{field}]"
                if key in data:
                    origin[field] = data.get(key)

            # Include ID if present (for updates)
            if f"origins[{i}][id]" in data:
                origin["id"] = data.get(f"origins[{i}][id]")

            origins_data.append(origin)
            i += 1
        return origins_data

    def create(self, request, *args, **kwargs):
        """
        Create a new permit application with nested origins parsed from FormData.
        """
        if request.user.role != "Farmer":
            return Response(
                {"error": "Only farmers can submit new applications."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Construct payload for serializer
        data = {
            "destination": request.data.get("destination"),
            "transport_date": request.data.get("transport_date"),
            "purpose": request.data.get("purpose"),
            "origins": self._parse_bracket_data(request.data),
        }

        try:
            with transaction.atomic():
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)

                if not request.FILES:
                    return Response(
                        {
                            "error": "Validation failed",
                            "detail": "At least one document is required.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                application = serializer.save(farmer=request.user)

                # Link documents using the saved application and files
                services.create_permit(
                    files=request.FILES, application=application, user=request.user
                )

                services.handle_application_status_change(
                    application, models.PermitApplication.Status.SUBMITTED
                )

            return Response(
                {"msg": "Application submitted successfully", "id": application.pk},
                status=status.HTTP_201_CREATED,
            )

        except ValidationError as e:
            return Response(
                {"error": "Validation failed", "detail": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": "Failed to create application", "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """
        Agri officer approval to forward the application to OPV.
        """
        application_instance = self.get_object()
        remarks = request.data.get("remarks", "").strip()

        try:
            services.approve_application(
                application=application_instance,
                user=request.user,
                remarks=remarks
            )
            return Response(
                {"msg": "Application approved and forwarded to OPV"},
                status=status.HTTP_200_OK,
            )
        except PermissionDenied as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else str(e)},
                status=status.HTTP_403_FORBIDDEN,
            )
        except ValidationError as e:
            return Response(
                {"error": "Validation failed", "detail": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """
        Agri officer rejection - sends application back for resubmission.
        """
        application_instance = self.get_object()
        remarks = request.data.get("remarks", "").strip()

        try:
            services.reject_application(
                application=application_instance,
                user=request.user,
                remarks=remarks
            )
            return Response(
                {"msg": "Application rejected and returned for resubmission"},
                status=status.HTTP_200_OK,
            )
        except PermissionDenied as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else str(e)},
                status=status.HTTP_403_FORBIDDEN,
            )
        except ValidationError as e:
            return Response(
                {"error": "Validation failed", "detail": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def resubmit(self, request, pk=None):
        """
        Farmer resubmission - allows updating details and documents for rejected applications.
        """
        application_instance = self.get_object()

        # Construct payload for serializer
        data = {
            "destination": request.data.get("destination"),
            "transport_date": request.data.get("transport_date"),
            "purpose": request.data.get("purpose"),
            "origins": self._parse_bracket_data(request.data),
        }

        try:
            services.resubmit_application(
                application=application_instance,
                user=request.user,
                serializer_data=data,
                files=request.FILES,
            )
            return Response(
                {"msg": "Application resubmitted successfully"},
                status=status.HTTP_200_OK,
            )
        except PermissionDenied as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else str(e)},
                status=status.HTTP_403_FORBIDDEN,
            )
        except ValidationError as e:
            return Response(
                {"error": "Validation failed", "detail": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["get"])
    def verify(self, request, pk=None):
        """
        Verification endpoint used by the Inspector App to scan QR codes.
        Takes the qr_token as 'pk' and returns the associated permit details if valid.
        """
        try:
            application_instance, issued_permit, is_already_checked = services.verify_permit(
                qr_token=pk,
                user=request.user
            )

            serializer = self.get_serializer(application_instance)
            data = serializer.data
            data["valid_until"] = issued_permit.valid_until
            if is_already_checked:
                data["is_checked"] = True

            return Response(data, status=status.HTTP_200_OK)
        except PermissionDenied as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else str(e)},
                status=status.HTTP_403_FORBIDDEN,
            )
        except ValidationError as e:
            detail = getattr(e, "detail", str(e))
            if isinstance(detail, dict) and "error" in detail:
                return Response(detail, status=status.HTTP_400_BAD_REQUEST)
            return Response(
                {"error": "Invalid token"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": "Invalid token"},
                status=status.HTTP_400_BAD_REQUEST
            )
