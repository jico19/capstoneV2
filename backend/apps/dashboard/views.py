from rest_framework import views, status
from rest_framework.response import Response
from apps.permits import models as permits
from django.db.models import Count, Q

class AgriDashboardView(views.APIView):
    def get(self, request):
        # awaitin for payments
        total_awaiting_payment = permits.PermitApplication.objects.filter(
            status = permits.PermitApplication.Status.PAYMENT_PENDING
        ).count()
        # at opv stage
        total_at_opv = permits.PermitApplication.objects.filter(
            status = permits.PermitApplication.Status.FORWARDED_TO_OPV
        ).count()
        # ocr manual review
        total_manual_review = permits.OCRValidationResult.objects.filter(
            status = 'MANUAL',
        ).count()
        # automation rate
        total_ocr = permits.OCRValidationResult.objects.count()
        success_ocr = permits.OCRValidationResult.objects.filter(
            status = 'PASSED',
            manually_overridden=False
        ).count()
        sucess_rate = (success_ocr / total_ocr) * 100 if total_ocr > 0 else 0

        return Response({
            "total_awaiting_payment": total_awaiting_payment,
            "total_at_opv": total_at_opv,
            "total_manual_ocr": total_manual_review,
            "automation_rate": round(sucess_rate, 1),

        }, status=status.HTTP_200_OK)