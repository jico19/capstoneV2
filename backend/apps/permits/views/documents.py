from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .. import models, serializers

class SubmittedDocumentViewSets(viewsets.ModelViewSet):
    queryset = models.SubmittedDocument.objects.all()
    permission_classes = [IsAuthenticated]

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
