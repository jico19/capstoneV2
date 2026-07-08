from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.http import FileResponse, HttpResponse
from apps.api.utils import parse_date_range_strings
from rest_framework.exceptions import ValidationError

class ReportViewSets(viewsets.ViewSet):
    """
    Report generation endpoints for Agri Officers only.
    All reports accept optional start_date and end_date query params (YYYY-MM-DD).
    Defaults to today when not provided.
    """

    permission_classes = [IsAuthenticated]

    def _parse_date_range(self, request):
        """Parse start_date and end_date from query params. Defaults to today."""
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        try:
            start_date, end_date = parse_date_range_strings(start_date_str, end_date_str)
            return start_date, end_date, None
        except ValidationError as e:
            return (
                None,
                None,
                Response({"error": e.detail[0] if isinstance(e.detail, list) else e.detail}, status=400),
            )

    @action(detail=False, methods=["get"], url_path="permit-issuance/pdf")
    def permit_issuance_pdf(self, request):
        """Export the permit issuance summary as a PDF for a given date range."""
        from apps.documents.services import generate_permit_issuance_report_pdf

        if request.user.role != "Agri":
            return Response(
                {"error": "Only Agri officers can generate reports."}, status=403
            )

        start_date, end_date, error = self._parse_date_range(request)
        if error:
            return error

        pdf_buffer = generate_permit_issuance_report_pdf(
            start_date=start_date, end_date=end_date, requesting_user=request.user
        )
        filename = f"PERMIT_ISSUANCE_{start_date}_to_{end_date}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename)

    @action(detail=False, methods=["get"], url_path="permit-issuance/csv")
    def permit_issuance_csv(self, request):
        """Export the permit issuance list as a CSV file for a given date range."""
        from apps.documents.services import generate_permit_issuance_csv

        if request.user.role != "Agri":
            return Response(
                {"error": "Only Agri officers can generate reports."}, status=403
            )

        start_date, end_date, error = self._parse_date_range(request)
        if error:
            return error

        csv_output = generate_permit_issuance_csv(
            start_date=start_date, end_date=end_date
        )
        filename = f"PERMIT_ISSUANCE_{start_date}_to_{end_date}.csv"
        response = HttpResponse(csv_output, content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"], url_path="barangay-distribution/pdf")
    def barangay_distribution_pdf(self, request):
        """Export barangay livestock volume distribution as a PDF."""
        from apps.documents.services import generate_barangay_distribution_pdf

        if request.user.role != "Agri":
            return Response(
                {"error": "Only Agri officers can generate reports."}, status=403
            )

        start_date, end_date, error = self._parse_date_range(request)
        if error:
            return error

        pdf_buffer = generate_barangay_distribution_pdf(
            start_date=start_date, end_date=end_date
        )
        filename = f"BARANGAY_DISTRIBUTION_{start_date}_to_{end_date}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename)

    @action(detail=False, methods=["get"], url_path="inspector-logs/pdf")
    def inspector_logs_pdf(self, request):
        """Export field inspection audit log as a PDF."""
        from apps.documents.services import generate_inspector_report_pdf

        if request.user.role != "Agri":
            return Response(
                {"error": "Only Agri officers can generate reports."}, status=403
            )

        start_date, end_date, error = self._parse_date_range(request)
        if error:
            return error

        pdf_buffer = generate_inspector_report_pdf(
            start_date=start_date, end_date=end_date
        )
        filename = f"INSPECTOR_LOGS_{start_date}_to_{end_date}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename)
