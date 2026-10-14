from rest_framework import status
from rest_framework.response import Response
from rest_framework.exceptions import MethodNotAllowed
from apps.api.base import BaseModelViewSet
from .. import models, serializers, services

class OCRValidationResultViewSet(BaseModelViewSet):
    queryset = models.OCRValidationResult.objects.all()
    http_method_names = ["get", "put", "patch", "head", "options"]

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed("POST")

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE")

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return serializers.OCRValidationResultListSerializer
        elif self.action in ["update", "partial_update"]:
            return serializers.OCRValidationResultWriteSerializer
        return serializers.OCRValidationResultListSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.OCRValidationResult.objects.none()

        qs = models.OCRValidationResult.objects.select_related(
            "document", "document__application", "document__application__farmer"
        )
        if user.role == "Farmer":
            return qs.filter(document__application__farmer=user)
        elif user.role in ["Agri", "Admin", "Opv"]:
            return qs
        return models.OCRValidationResult.objects.none()

    def update(self, request, *args, **kwargs):
        ocr_instance = self.get_object()
        services.override_ocr_result(
            ocr_instance=ocr_instance,
            user=request.user,
            data=request.data
        )
        return Response({"msg": "Updated successfully"}, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)
