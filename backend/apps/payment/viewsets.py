from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.shortcuts import get_object_or_404
from django.http import FileResponse
from . import models, serializers, services
from apps.permits import models as Permits

class PaymentViewSets(viewsets.ModelViewSet):
    queryset = models.PaymentHistory.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'Farmer':
            return models.PaymentHistory.objects.filter(issued_permit__application__farmer=user)
        return models.PaymentHistory.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return serializers.PaymentListSerializers
        elif self.action in ['retrieve','create', 'update', 'partial_update']:
            return serializers.PaymentWriteAndDetailSerializers
        else:
            return serializers.PaymentListSerializers

    @action(detail=False, methods=['get'])
    def generate_report(self, request):
        """
        API Endpoint: GET /api/payments/generate_report/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
        Generates and returns a PDF collection report for a date range.
        """
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        try:
            pdf_buffer, start_date, end_date = services.generate_collection_report(
                user=request.user,
                start_date_str=start_date_str,
                end_date_str=end_date_str
            )
            filename = f"COLLECTION_REPORT_{start_date}_to_{end_date}.pdf"
            return FileResponse(pdf_buffer, as_attachment=True, filename=filename)
        except PermissionDenied as e:
            return Response({"error": e.detail if hasattr(e, "detail") else str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({"error": e.detail[0] if isinstance(e.detail, list) else e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def checkout_session(self, request, pk=None):
        """
        Pass the issued permit PK to create the checkout session
        """
        application = get_object_or_404(Permits.PermitApplication, pk=pk)
        total_price = request.data.get("total_price", 0)

        # Ownership check
        if request.user.role == 'Farmer' and application.farmer != request.user:
            return Response({"error": "Unauthorized access to this application"}, status=status.HTTP_403_FORBIDDEN)

        if application.status != Permits.PermitApplication.Status.PAYMENT_PENDING:
            return Response({"error": "Application not ready for payment"}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure IssuedPermit exists
        get_object_or_404(Permits.IssuedPermit, application=application)

        try:
            data = services.create_checkout_session(application_pk=application.pk, total_price=total_price)
            return Response(data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail[0] if isinstance(e.detail, list) else e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def create_qrph_payment(self, request, pk=None):
        """
        Pass the permit application PK to create a QR Ph payment (Payment Intent/Method attach)
        """
        application = get_object_or_404(Permits.PermitApplication, pk=pk)
        total_price = request.data.get("total_price", 0)

        # Ownership check
        if request.user.role == 'Farmer' and application.farmer != request.user:
            return Response({"error": "Unauthorized access to this application"}, status=status.HTTP_403_FORBIDDEN)

        if application.status != Permits.PermitApplication.Status.PAYMENT_PENDING:
            return Response({"error": "Application not ready for payment"}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure IssuedPermit exists
        get_object_or_404(Permits.IssuedPermit, application=application)

        try:
            data = services.create_qrph_payment(application_pk=application.pk, total_price=total_price)
            return Response(data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail[0] if isinstance(e.detail, list) else e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def simulate_payment(self, request, pk=None):
        """
        Action to simulate payment success for testing/prototype purposes.
        Sets status to SUCCESS and processes the permit issuance.
        """
        from django.db import transaction
        from django.utils import timezone
        from datetime import timedelta

        application = get_object_or_404(Permits.PermitApplication, pk=pk)
        issued_permit = get_object_or_404(Permits.IssuedPermit, application=application)
        
        try:
            payment_history = issued_permit.payment_history
        except models.PaymentHistory.DoesNotExist:
            return Response({"error": "No payment history found"}, status=status.HTTP_404_NOT_FOUND)

        if payment_history.status == models.PaymentHistory.Status.SUCCESS:
            return Response({"msg": "Already paid"}, status=status.HTTP_200_OK)

        # Run transaction logic to mark as paid (same as successful verification)
        with transaction.atomic():
            payment_history = models.PaymentHistory.objects.select_for_update().get(pk=payment_history.pk)
            payment_history.status = models.PaymentHistory.Status.SUCCESS
            payment_history.save()

            issued_permit.is_paid = True
            issued_permit.payment_method = 'ONLINE'
            issued_permit.valid_until = timezone.now().date() + timedelta(days=3)
            
            if not issued_permit.aic_number:
                today = timezone.now().date()
                mm_dd = today.strftime("%m-%d")
                yy = today.strftime("%y")
                prefix = f"{mm_dd}-"
                today_count = Permits.IssuedPermit.objects.filter(
                    aic_number__startswith=prefix
                ).count()
                issued_permit.aic_number = f"{mm_dd}-{today_count + 1:03d}-{yy}"
                
            issued_permit.save()

            from apps.permits.services import handle_application_status_change
            handle_application_status_change(application, Permits.PermitApplication.Status.RELEASED)

            from apps.documents.services import generate_permit_pdf, generate_aic_pdf
            generate_permit_pdf.enqueue(permit_application_id=application.pk)     
            generate_aic_pdf.enqueue(permit_application_id=application.pk)

        return Response({"msg": "Payment simulated successfully", "verified": True}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def verify_paymongo_session(self, request, pk=None):
        """
        Calls PayMongo to check the actual status of the checkout session.
        This endpoint verifies if a payment has been successfully made.
        """
        try:
            is_success, payment_history = services.verify_paymongo_session(
                application_pk=pk,
                user=request.user
            )

            if is_success:
                return Response({
                    "msg": "Payment verified successfully",
                    "verified": True,
                    "data": serializers.PaymentListSerializers(payment_history).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "msg": "Payment session is not active. Please try again.",
                    "verified": False,
                }, status=status.HTTP_200_OK)

        except PermissionDenied as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValidationError as e:
            code = getattr(e, "code", None)
            if code == "not_found":
                return Response(
                    {"error": e.detail[0] if isinstance(e.detail, list) else e.detail},
                    status=status.HTTP_404_NOT_FOUND
                )
            return Response(
                {"error": e.detail[0] if isinstance(e.detail, list) else e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            print(f"Payment Verification Error: {str(e)}")
            return Response({"error": "An internal error occurred during verification"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
