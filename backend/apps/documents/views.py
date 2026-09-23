from io import BytesIO

from django.http import FileResponse
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.maps.models import Barangay
from .services.cis_template import generate_cis_template


class CISTemplateViewSet(viewsets.ViewSet):
    """Serves the printable blank CIS form as a PDF download.

    Any authenticated role may fetch the template for a barangay.
    """

    permission_classes = [IsAuthenticated]

    def list(self, request):
        barangay_id = request.query_params.get("barangay")
        if not barangay_id:
            return Response(
                {"error": "Missing 'barangay' query parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            barangay = Barangay.objects.get(id=barangay_id)
        except (Barangay.DoesNotExist, ValueError):
            return Response(
                {"error": "Barangay not found."}, status=status.HTTP_404_NOT_FOUND
            )

        pdf = generate_cis_template(barangay.name)
        filename = f"CIS_TEMPLATE_{barangay.name.replace(' ', '_').upper()}.pdf"
        return FileResponse(
            BytesIO(pdf), content_type="application/pdf", as_attachment=True, filename=filename
        )