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
                total_heads = sum(o.number_of_pigs for o in app.origins.all()) if app.origins.exists() else 0
                origin_brgy = app.origins.first().barangay.name if (app.origins.exists() and app.origins.first().barangay) else (app.farmer.barangay.name if (app.farmer and app.farmer.barangay) else "N/A")

                return Response({
                    "id": f"aic-{app.id}",
                    "document_type": "aic",
                    "document_type_display": "Animal Inspection Certificate (AIC)",
                    "file": request.build_absolute_uri(app.aic_pdf.url),
                    "ocr": {
                        "status": "completed",
                        "extracted_field": {
                            "AIC Number": app.aic_number or f"AIC-{str(app.id)[:8].upper()}",
                            "Application ID": str(app.application_id or app.id),
                            "Shipper Name": app.farmer.get_full_name() if app.farmer else "N/A",
                            "Origin Barangay": origin_brgy,
                            "Destination": app.destination or "N/A",
                            "Total Swine Heads": total_heads,
                            "Purpose": "Slaughter / Transport",
                            "Issue Date": app.aic_issued_at.strftime("%Y-%m-%d %H:%M") if app.aic_issued_at else "N/A",
                            "Certification Status": app.get_status_display() if hasattr(app, "get_status_display") else str(app.status),
                        },
                        "remarks": {}
                    },
                    "uploaded_at": app.aic_issued_at or app.updated_at,
                    "is_generated": True,
                })
            except models.PermitApplication.DoesNotExist:
                return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)
        return super().retrieve(request, *args, **kwargs)

    def perform_update(self, serializer):
        doc = self.get_object()
        app = doc.origin.application if doc.origin else None
        if app and app.status in [
            models.PermitApplication.Status.OPV_VALIDATED,
            models.PermitApplication.Status.PAYMENT_PENDING,
            models.PermitApplication.Status.PERMIT_ISSUED,
            models.PermitApplication.Status.RELEASED
        ]:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Documents are locked after OPV approval.")
        serializer.save()

    def perform_destroy(self, instance):
        app = instance.origin.application if instance.origin else None
        if app and app.status in [
            models.PermitApplication.Status.OPV_VALIDATED,
            models.PermitApplication.Status.PAYMENT_PENDING,
            models.PermitApplication.Status.PERMIT_ISSUED,
            models.PermitApplication.Status.RELEASED
        ]:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Documents are locked after OPV approval.")
        instance.delete()
