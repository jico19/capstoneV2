from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.http import FileResponse
from . import models, serializers, services

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
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        try:
            pdf_buffer, start_date, end_date = services.generate_duty_report(
                user=request.user,
                start_date_str=start_date_str,
                end_date_str=end_date_str
            )
            filename = f"INSPECTOR_LOGS_{start_date}_to_{end_date}.pdf"
            return FileResponse(pdf_buffer, as_attachment=True, filename=filename)
        except PermissionDenied as e:
            return Response({"error": e.detail if hasattr(e, "detail") else str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({"error": e.detail[0] if isinstance(e.detail, list) else e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        user = self.request.user
        if user.role in ['Admin', 'Agri']:
            return models.InspectorLogs.objects.all()
        # Inspectors can only see their own logs
        return models.InspectorLogs.objects.filter(inspector=user)

    def create(self, request, *args, **kwargs):
        try:
            data = services.create_inspector_log(
                user=request.user,
                request_data=request.data
            )
            return Response(data, status=status.HTTP_200_OK)
        except PermissionDenied as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValidationError as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": "Failed to record inspection", "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )