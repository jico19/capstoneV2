from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.http import FileResponse, HttpResponse
from apps.api.utils import parse_date_range_strings
from rest_framework.exceptions import ValidationError
from apps.documents.services import (
    generate_permit_issuance_report_pdf,
    generate_permit_issuance_csv,
    generate_barangay_distribution_pdf,
    generate_inspector_report_pdf,
    generate_formal_government_report_pdf,
)
from apps.documents.report_drafter import get_report_draft

class ReportViewSet(viewsets.ViewSet):
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

    @action(detail=False, methods=["get"], url_path="draft")
    def get_draft(self, request):
        """
        Returns auto-drafted content for an official LGU Memorandum Accomplishment Report.
        Allows frontend to present an interactive, editable preview before generating PDF.
        """
        if request.user.role != "Agri":
            return Response(
                {"error": "Only Agri officers can draft reports."}, status=403
            )

        report_type = request.query_params.get("report_type", "permit_issuance")
        start_date, end_date, error = self._parse_date_range(request)
        if error:
            return error

        try:
            draft_data = get_report_draft(
                report_type=report_type,
                start_date=start_date,
                end_date=end_date,
                requesting_user=request.user,
            )
            return Response(draft_data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Failed to draft report: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path="export-formal-pdf")
    def export_formal_pdf(self, request):
        """
        Takes user-reviewed/customized report draft payload and generates the final formal LGU Memorandum PDF.
        """
        if request.user.role != "Agri":
            return Response(
                {"error": "Only Agri officers can generate reports."}, status=403
            )

        draft_data = request.data
        if not draft_data or not isinstance(draft_data, dict):
            return Response({"error": "Report draft payload is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pdf_buffer = generate_formal_government_report_pdf(draft_data)
            report_type = draft_data.get("report_type", "REPORT").upper()
            start_date = draft_data.get("start_date", timezone.now().strftime("%Y-%m-%d"))
            end_date = draft_data.get("end_date", start_date)
            filename = f"LGU_{report_type}_{start_date}_to_{end_date}.pdf"
            return FileResponse(pdf_buffer, as_attachment=True, filename=filename)
        except Exception as e:
            return Response({"error": f"Failed to generate formal PDF: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"], url_path="permit-issuance/pdf")
    def permit_issuance_pdf(self, request):
        """Export the permit issuance summary as a formal PDF for a given date range."""
        if request.user.role != "Agri":
            return Response(
                {"error": "Only Agri officers can generate reports."}, status=403
            )

        start_date, end_date, error = self._parse_date_range(request)
        if error:
            return error

        draft = get_report_draft("permit_issuance", start_date, end_date, requesting_user=request.user)
        pdf_buffer = generate_formal_government_report_pdf(draft)
        filename = f"PERMIT_ISSUANCE_{start_date}_to_{end_date}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename)

    @action(detail=False, methods=["get"], url_path="permit-issuance/csv")
    def permit_issuance_csv(self, request):
        """Export the permit issuance list as a CSV file for a given date range."""
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
        """Export barangay livestock volume distribution as a formal PDF."""
        if request.user.role != "Agri":
            return Response(
                {"error": "Only Agri officers can generate reports."}, status=403
            )

        start_date, end_date, error = self._parse_date_range(request)
        if error:
            return error

        draft = get_report_draft("barangay_distribution", start_date, end_date, requesting_user=request.user)
        pdf_buffer = generate_formal_government_report_pdf(draft)
        filename = f"BARANGAY_DISTRIBUTION_{start_date}_to_{end_date}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename)

    @action(detail=False, methods=["get"], url_path="inspector-logs/pdf")
    def inspector_logs_pdf(self, request):
        """Export field inspection audit log as a formal PDF."""
        if request.user.role != "Agri":
            return Response(
                {"error": "Only Agri officers can generate reports."}, status=403
            )

        start_date, end_date, error = self._parse_date_range(request)
        if error:
            return error

        draft = get_report_draft("inspector_logs", start_date, end_date, requesting_user=request.user)
        pdf_buffer = generate_formal_government_report_pdf(draft)
        filename = f"INSPECTOR_LOGS_{start_date}_to_{end_date}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename)

    @action(detail=False, methods=["get"], url_path="revenue-collection/pdf")
    def revenue_collection_pdf(self, request):
        """Export revenue collection audit as a formal PDF."""
        if request.user.role != "Agri":
            return Response(
                {"error": "Only Agri officers can generate reports."}, status=403
            )

        start_date, end_date, error = self._parse_date_range(request)
        if error:
            return error

        draft = get_report_draft("revenue_collection", start_date, end_date, requesting_user=request.user)
        pdf_buffer = generate_formal_government_report_pdf(draft)
        filename = f"REVENUE_COLLECTION_{start_date}_to_{end_date}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename)
