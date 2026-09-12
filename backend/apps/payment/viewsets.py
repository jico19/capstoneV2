from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied, MethodNotAllowed
from django.shortcuts import get_object_or_404
from django.http import FileResponse
from . import models, serializers, services
from apps.permits import models as Permits
from apps.permits.services.numbers import get_aic_number

from apps.api.base import BaseModelViewSet

class PaymentViewSet(BaseModelViewSet):
    queryset = models.PaymentHistory.objects.all()

    def get_queryset(self):
        user = self.request.user
        qs = models.PaymentHistory.objects.select_related(
            'issued_permit__application__farmer',
            'confirmed_by',
        ).prefetch_related(
            'issued_permit__application__origins__barangay',
        ).order_by('-created_at')

        if user.role == 'Farmer':
            qs = qs.filter(issued_permit__application__farmer=user)

        # Status filter
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'ALL':
            qs = qs.filter(status__iexact=status_param)

        # Method filter
        method_param = self.request.query_params.get('method')
        if method_param and method_param != 'ALL':
            qs = qs.filter(method__iexact=method_param)

        # Search filter
        search_param = self.request.query_params.get('search')
        if search_param:
            from django.db.models import Q
            clean_search = search_param.strip().replace('#TRX-', '').replace('TRX-', '')
            qs = qs.filter(
                Q(or_number__icontains=search_param) |
                Q(issued_permit__permit_number__icontains=search_param) |
                Q(issued_permit__application__farmer__first_name__icontains=search_param) |
                Q(issued_permit__application__farmer__last_name__icontains=search_param) |
                Q(issued_permit__application__farmer__username__icontains=search_param) |
                Q(paymongo_session_id__icontains=search_param) |
                Q(id__icontains=clean_search)
            )

        # Date range filter
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            qs = qs.filter(created_at__date__range=[start_date, end_date])

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return serializers.PaymentListSerializer
        elif self.action in ['retrieve','create', 'update', 'partial_update']:
            return serializers.PaymentWriteAndDetailSerializer
        else:
            return serializers.PaymentListSerializer

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method)

    def update(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method)

    def partial_update(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method)

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        API Endpoint: GET /payment/stats/
        Returns comprehensive aggregate statistics across the entire collections ledger.
        """
        from django.db.models import Sum, Count
        from django.utils import timezone

        today = timezone.now().date()
        base_qs = self.get_queryset()
        cleared_qs = base_qs.filter(status__in=[models.PaymentHistory.Status.SUCCESS, models.PaymentHistory.Status.CONFIRMED])
        
        total_collected = cleared_qs.aggregate(Sum('amount'))['amount__sum'] or 0
        total_cleared = cleared_qs.count()
        today_collected = cleared_qs.filter(created_at__date=today).aggregate(Sum('amount'))['amount__sum'] or 0
        today_cleared = cleared_qs.filter(created_at__date=today).count()
        
        pending_count = base_qs.filter(status=models.PaymentHistory.Status.PENDING).count()
        
        # Gateway breakdown
        qrph_count = cleared_qs.filter(method=models.PaymentHistory.Method.QRPH).count()
        gcash_count = cleared_qs.filter(method=models.PaymentHistory.Method.OFFLINE).count()
        card_count = cleared_qs.filter(method=models.PaymentHistory.Method.CARD).count()
        paymaya_count = cleared_qs.filter(method=models.PaymentHistory.Method.PAYMAYA).count()
        digital_count = qrph_count + gcash_count + card_count + paymaya_count

        return Response({
            "total_collected": total_collected,
            "total_cleared": total_cleared,
            "today_collected": today_collected,
            "today_cleared": today_cleared,
            "pending_count": pending_count,
            "digital_count": digital_count,
            "methods": {
                "qrph": qrph_count,
                "gcash": gcash_count,
                "card": card_count,
                "paymaya": paymaya_count,
            }
        })

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
    def farmer_simulate_payment(self, request, pk=None):
        """
        POST /api/payment/{application_pk}/farmer_simulate_payment/

        Allows a Farmer to simulate a realistic payment transaction (DEBUG only).
        Mimics the full PayMongo webhook flow from the farmer's perspective.
        The farmer chooses a payment method and the system processes it as if
        the payment gateway confirmed it successfully.

        Required body: { "payment_method": "gcash" | "card" | "paymaya" | "qrph" }
        Returns: Receipt data matching PaymentListSerializer shape.
        """
        payment_method = request.data.get('payment_method', 'gcash').strip().lower()

        try:
            payment_history = services.farmer_simulate_payment(
                application_pk=pk,
                user=request.user,
                payment_method=payment_method,
            )
            return Response(
                {
                    "msg": "Payment simulation successful.",
                    "verified": True,
                    "data": serializers.PaymentListSerializer(payment_history).data,
                },
                status=status.HTTP_200_OK,
            )
        except PermissionDenied as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else str(e)},
                status=status.HTTP_403_FORBIDDEN,
            )
        except ValidationError as e:
            return Response(
                {"error": e.detail[0] if isinstance(e.detail, list) else e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['post'])
    def confirm_offline_payment(self, request, pk=None):
        """
        POST /api/payment/{application_pk}/confirm_offline_payment/

        Agri officer confirms a walk-in (offline/cash) payment.
        Required body: { "or_number": "1234567" }
        """
        or_number = request.data.get('or_number', '').strip()

        try:
            payment_history = services.confirm_offline_payment(
                application_pk=pk,
                user=request.user,
                or_number=or_number,
            )
            return Response(
                {
                    "msg": "Offline payment confirmed successfully.",
                    "or_number": payment_history.or_number,
                    "confirmed_at": payment_history.confirmed_at,
                },
                status=status.HTTP_200_OK,
            )
        except PermissionDenied as e:
            return Response(
                {"error": e.detail if hasattr(e, "detail") else str(e)},
                status=status.HTTP_403_FORBIDDEN,
            )
        except ValidationError as e:
            return Response(
                {"error": e.detail[0] if isinstance(e.detail, list) else e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['post'])
    def simulate_payment(self, request, pk=None):
        """
        Simulates payment success for testing/demo purposes ONLY.
        BLOCKED in production (DEBUG=False). Restricted to Agri role.
        """
        from django.conf import settings
        from django.db import transaction
        from django.utils import timezone
        from datetime import timedelta

        # Guard #1: Block in production
        if not settings.DEBUG:
            return Response(
                {"error": "This endpoint is not available in production."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Guard #2: Only Agri officers may simulate payments
        if request.user.role != 'Agri':
            return Response(
                {"error": "Only Agri officers can simulate payments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        application = get_object_or_404(Permits.PermitApplication, pk=pk)
        issued_permit = get_object_or_404(Permits.IssuedPermit, application=application)

        try:
            payment_history = issued_permit.payment_history
        except models.PaymentHistory.DoesNotExist:
            return Response({"error": "No payment history found"}, status=status.HTTP_404_NOT_FOUND)

        if payment_history.status == models.PaymentHistory.Status.SUCCESS:
            return Response({"msg": "Already paid"}, status=status.HTTP_200_OK)

        with transaction.atomic():
            payment_history = models.PaymentHistory.objects.select_for_update().get(pk=payment_history.pk)
            payment_history.status = models.PaymentHistory.Status.SUCCESS
            payment_history.save()

            issued_permit.is_paid = True
            issued_permit.payment_method = 'ONLINE'
            issued_permit.valid_until = timezone.now().date() + timedelta(days=3)

            # Use the shared atomic helper (no more duplicate inline logic)
            if not issued_permit.aic_number:
                issued_permit.aic_number = get_aic_number(issued_permit)

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
                    "data": serializers.PaymentListSerializer(payment_history).data
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
            return Response({"error": "An internal error occurred during verification"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
