from rest_framework import viewsets, status
from rest_framework.response import Response
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
        services.override_ocr_result(
            ocr_instance=ocr_instance,
            user=request.user,
            data=request.data
        )
        return Response({"msg": "Updated successfully"}, status=status.HTTP_200_OK)
