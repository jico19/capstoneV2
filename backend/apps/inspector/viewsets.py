from rest_framework import viewsets, status
from . import serializers
from . import models
from rest_framework.response import Response



from rest_framework.permissions import IsAuthenticated

from rest_framework.decorators import action
from django.http import FileResponse
from django.utils import timezone
from apps.documents.services import generate_inspector_report_pdf

class InspectorLogViewSets(viewsets.ModelViewSet):
    queryset = models.InspectorLogs.objects.all()
    serializer_class = serializers.InspectorLogsSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def generate_report(self, request):
        """
        API Endpoint: GET /api/inspector/generate_report/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
        Generates and returns a PDF duty log for a date range.
        """
        if request.user.role != 'Agri':
            return Response({"error": "Unauthorized"}, status=403)

        from datetime import datetime
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        today = timezone.now().date()
        start_date = today
        end_date = today
        
        try:
            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            if end_date_str:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Invalid date format"}, status=400)

        pdf_buffer = generate_inspector_report_pdf(start_date=start_date, end_date=end_date)
        filename = f"INSPECTOR_LOGS_{start_date}_to_{end_date}.pdf"

        return FileResponse(pdf_buffer, as_attachment=True, filename=filename)

    def get_queryset(self):
        user = self.request.user
        if user.role in ['Admin', 'Agri']:
            return models.InspectorLogs.objects.all()
        # Inspectors can only see their own logs
        return models.InspectorLogs.objects.filter(inspector=user)

    def create(self, request, *args, **kwargs):
        if request.user.role != 'Inspector':
            return Response({"error": "Only inspectors can log verification activity."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(inspector=request.user)

            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            print(str(e))
            return Response("error", status=status.HTTP_400_BAD_REQUEST)