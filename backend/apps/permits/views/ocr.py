from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.api.base import BaseModelViewSet
from .. import models, serializers, services

class OCRValidationResultViewSet(BaseModelViewSet):
    queryset = models.OCRValidationResult.objects.all()

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return serializers.OCRValidationResultListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return serializers.OCRValidationResultWriteSerializer
        else:
            return serializers.OCRValidationResultListSerializer

    def get_queryset(self):
        return models.OCRValidationResult.objects.all()

    def update(self, request, *args, **kwargs):
        ocr_instance = self.get_object()
        try:
            services.override_ocr_result(
                ocr_instance=ocr_instance,
                user=request.user,
                data=request.data
            )
            return Response({"msg": "Updated successfully"}, status=status.HTTP_200_OK)
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
