from rest_framework import views, status
from rest_framework.response import Response
from apps.permits import models as permits
from apps.maps import models as maps
from django.db.models import Count, Q, Avg
from django.db.models.functions import TruncDate, TruncMonth


class AgriDashboardView(views.APIView):
    def get(self, request):
        # awaitin for payments
        total_awaiting_payment = permits.PermitApplication.objects.filter(
            status = permits.PermitApplication.Status.PAYMENT_PENDING
        ).count()
        # at opv stage
        total_at_opv = permits.OPVValidation.objects.filter(
            status = permits.OPVValidation.Status.VALIDATED
        ).count()
        # ocr manual review
        total_application_permit = permits.PermitApplication.objects.all().count()
        # automation rate
        total_ocr = permits.OCRValidationResult.objects.count()
        success_ocr = permits.OCRValidationResult.objects.filter(
            status = 'PASSED',
            manually_overridden=False
        ).count()
        sucess_rate = (success_ocr / total_ocr) * 100 if total_ocr > 0 else 0


        density_trend = (
            maps.HogSurvey.objects
            .annotate(
                date = TruncMonth('survey_date')
            ).values('date')
            .annotate(avg=Avg('total_pigs'))
            .order_by('date')
        )


        return Response({
            "total_awaiting_payment": total_awaiting_payment,
            "total_at_opv": total_at_opv,
            "total_application": total_application_permit,
            "automation_rate": round(sucess_rate, 1),
            "density_trend": density_trend,

        }, status=status.HTTP_200_OK)



class InspectorDashboardView(views.APIView):
    # TODO: Gumamwa ng ano dashboard API Endpoint
    def get(self, request):
        pass


