from rest_framework import viewsets, status
from rest_framework.response import Response
from apps.api.base import BaseModelViewSet
from .. import models, serializers

class SubmittedDocumentViewSet(BaseModelViewSet):
    queryset = models.SubmittedDocument.objects.all()

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return serializers.SubmittedDocumentListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return serializers.SubmittedDocumentWriteSerializer
        else:
            return serializers.SubmittedDocumentListSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.SubmittedDocument.objects.none()

        if user.role == "Farmer":
            return models.SubmittedDocument.objects.filter(
                origin__application__farmer=user
            )
        return models.SubmittedDocument.objects.all()

    def retrieve(self, request, *args, **kwargs):
        pk = self.kwargs.get("pk")
        if str(pk).startswith("aic-"):
            app_id = str(pk).replace("aic-", "")
            try:
                user = request.user
                app = models.PermitApplication.objects.get(pk=app_id)
                if user.role == "Farmer" and app.farmer != user:
                    return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
                if not app.aic_pdf:
                    return Response({"error": "AIC not generated"}, status=status.HTTP_404_NOT_FOUND)
                return Response({
                    "id": f"aic-{app.id}",
                    "document_type": "aic",
                    "document_type_display": "Animal Inspection Certificate (AIC)",
                    "file": request.build_absolute_uri(app.aic_pdf.url),
                    "ocr": None,
                    "uploaded_at": app.aic_issued_at or app.updated_at,
                    "is_generated": True,
                })
            except models.PermitApplication.DoesNotExist:
                return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)
        return super().retrieve(request, *args, **kwargs)
