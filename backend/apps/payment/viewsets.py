from rest_framework import viewsets
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from . import models
from . import serializers
from . import services
from .services import get_auth_header
import requests
from django.conf import settings
from apps.documents.services import generate_permit_pdf, generate_collection_report_pdf
from django.utils import timezone
from datetime import timedelta
import uuid
from django.shortcuts import get_object_or_404
from apps.permits import models as Permits
from django.db import transaction
from django.http import FileResponse

from rest_framework.permissions import IsAuthenticated

class PaymentViewSets(viewsets.ModelViewSet):
    queryset = models.PaymentHistory.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'Farmer':
            return models.PaymentHistory.objects.filter(issued_permit__application__farmer=user)
        return models.PaymentHistory.objects.all()

    @action(detail=False, methods=['get'])
    def generate_report(self, request):
        """
        API Endpoint: GET /api/payments/generate_report/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
        Generates and returns a PDF collection report for a date range.
        """
        if request.user.role != 'Agri':
            return Response({"error": "Only Agri officers can generate collection reports."}, status=403)

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
            return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=400)

        if start_date > end_date:
            return Response({"error": "Start date cannot be after end date"}, status=400)

        pdf_buffer = generate_collection_report_pdf(start_date=start_date, end_date=end_date)
        filename = f"COLLECTION_REPORT_{start_date}_to_{end_date}.pdf"

        return FileResponse(pdf_buffer, as_attachment=True, filename=filename)

    def get_serializer_class(self):
        if self.action == 'list':
            return serializers.PaymentListSerializers
        elif self.action in ['retrieve','create', 'update', 'partial_update']:
            return serializers.PaymentWriteAndDetailSerializers
        else:
            return serializers.PaymentListSerializers
        
        
    @action(detail=True, methods=['post'])
    def checkout_session(self, request, pk=None):
        """
            pass the issued permit PK to create the checkout session
        """
        application = get_object_or_404(Permits.PermitApplication, pk=pk)

        # Ownership check
        if request.user.role == 'Farmer' and application.farmer != request.user:
            return Response({"error": "Unauthorized access to this application"}, status=403)

        if application.status != Permits.PermitApplication.Status.PAYMENT_PENDING:
            return Response({"error": "Application not ready for payment"}, status=400)

        with transaction.atomic():
            # Create Issued instance
            # pass the issued_permit pk
            issued_permit = get_object_or_404(Permits.IssuedPermit, application=application)
            data = services.create_checkout_session(application_pk=application.pk)

            return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def verify_paymongo_session(self, request, pk=None):
        """
        Calls PayMongo to check the actual status of the checkout session.
        This endpoint verifies if a payment has been successfully made.
        """
        try:
            # 1. Fetch the application and its related permit
            application = get_object_or_404(Permits.PermitApplication, pk=pk)

            # Ownership check
            if request.user.role == 'Farmer' and application.farmer != request.user:
                return Response({"error": "Unauthorized access to this application"}, status=403)
            
            # Verify the application is in the correct state for payment verification
            if application.status != Permits.PermitApplication.Status.PAYMENT_PENDING:
                # If it's already released, we can return success immediately
                if application.status == Permits.PermitApplication.Status.RELEASED:
                    return Response({"msg": "Payment already verified", "verified": True}, status=200)
                return Response({"error": f"Application is not in payment pending state (Current status: {application.status})"}, status=400)

            # 2. Get the issued permit and its associated payment history
            try:
                issued_permit = application.issued_permit
            except Permits.IssuedPermit.DoesNotExist:
                return Response({"error": "No permit has been issued for this application yet"}, status=404)

            try:
                payment_history = issued_permit.payment_history
            except models.PaymentHistory.DoesNotExist:
                return Response({"error": "No payment session found for this permit"}, status=404)

            # 3. If we already know it's a success locally, skip the external API call
            if payment_history.status == models.PaymentHistory.Status.SUCCESS:
                return Response({"msg": "Payment already verified", "verified": True}, status=200)

            # 4. Query PayMongo API for the checkout session details
            url = f"{settings.PAYMONGO_URL}/checkout_sessions/{payment_history.paymongo_session_id}"
            headers = get_auth_header()

            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                return Response({"error": "Failed to verify session with payment provider"}, status=400)

            data = response.json().get('data', {})
            attributes = data.get('attributes', {})
            payments = attributes.get('payments', [])

            # 5. PROTOTYPE SIMULATION:
            # For this prototype, we treat an 'active' session status as 'paid' to simulate a successful transaction.
            # IN PRODUCTION: You should iterate through the 'payments' array and check for status == 'paid'.
            payment_status = attributes.get('status')
            
            if payment_status == 'active':
                with transaction.atomic():
                    # Re-fetch payment history with a lock to prevent concurrent update issues
                    payment_history = models.PaymentHistory.objects.select_for_update().get(pk=payment_history.pk)
                    
                    if payment_history.status == models.PaymentHistory.Status.SUCCESS:
                        return Response({"msg": "Payment already verified", "verified": True}, status=200)
                    
                    # A. Update Payment History record
                    payment_history.status = models.PaymentHistory.Status.SUCCESS
                    # Defaulting to 'ONLINE' for the prototype simulation
                    payment_history.method = 'ONLINE'
                    payment_history.save()

                    # B. Update the Issued Permit state
                    issued_permit.is_paid = True
                    issued_permit.payment_method = 'ONLINE'
                    # Permits are valid for 3 days from the time of payment simulation
                    issued_permit.valid_until = timezone.now().date() + timedelta(days=3)
                    issued_permit.save()

                    # C. Advance the Application status to RELEASED
                    application.status = Permits.PermitApplication.Status.RELEASED
                    application.save()

                    # D. Queue the background tasks for PDF generation
                    generate_permit_pdf.enqueue(permit_application_id=application.pk)     
                
                return Response({
                    "msg": "Payment Verified (Simulated)",
                    "verified": True,
                }, status=200)
            else:
                return Response({
                    "msg": "Payment session is not active. Please try again.",
                    "verified": False,
                }, status=200)
                
        except Exception as e:
            # General fallback for unexpected errors
            print(f"Payment Verification Error: {str(e)}")
            return Response({"error": "An internal error occurred during verification"}, status=500)
