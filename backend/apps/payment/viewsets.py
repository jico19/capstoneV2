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
from apps.documents.services import generate_permit_pdf
from django.utils import timezone
from datetime import timedelta
import uuid
from django.shortcuts import get_object_or_404
from apps.permits import models as Permits
from django.db import transaction



class PaymentViewSets(viewsets.ModelViewSet):
    queryset = models.PaymentHistory.objects.all()

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
            TODO: CREATE ISSUED PERMIT HERE
            TODO: ADD PERMIT NUMBER
        """
        application = get_object_or_404(Permits.PermitApplication, pk=pk)
        if application.status != Permits.PermitApplication.Status.PAYMENT_PENDING:
            return Response({"error": "Application not ready for payment"}, status=400)

        with transaction.atomic():
        # Create Issued instance
            issued_permit = models.IssuedPermit.objects.create(
                permit_number=uuid.uuid4().hex[:13],
                application_id = pk,
                issued_by = request.user,
                qr_token = uuid.uuid4(),
            )
            # pass the issued_permit pk
            data = services.create_checkout_session(
                issued_permit_pk = issued_permit.pk
            )
            return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def verify_paymongo_session(self, request, pk=None):
        """
        Calls PayMongo to check the actual status of the checkout session.
        it passed issed_permit pk
        """
        try:
            application_permit_instance = get_object_or_404(
                Permits.PermitApplication,
                pk=pk
            )
            issued_permit_instance = application_permit_instance.issued_permit
            payment_history_instance = issued_permit_instance.payment_history

            url = f"{settings.PAYMONGO_URL}/checkout_sessions/{payment_history_instance.paymongo_session_id}"
            headers = get_auth_header()

            response = requests.get(url, headers=headers)
            
            if payment_history_instance.status == 'SUCCESS':
                return Response({"msg": "Payment Verified", "verified": True}, status=200)

            if response.status_code == 200:
                data = response.json()['data']
                payment_status = data['attributes']['status']

                # change to paid for prod
                if payment_status == 'active': 
                    with transaction.atomic():
                        payment_history_instance = models.PaymentHistory.objects.select_for_update().get(
                            issued_permit=issued_permit_instance
                        )
                        
                        if payment_history_instance.status == 'SUCCESS':
                            return Response({"msg": "Payment Verified", "verified": True}, status=200)
                        
                        # 1. Update Payment History
                        payment_history_instance.status = 'SUCCESS'
                        payment_history_instance.method = data['attributes']['payment_method_used']
                        payment_history_instance.save()

                        # 2. Finally flip the bit on the Permit
                        permit = issued_permit_instance
                        permit.is_paid = True
                        permit.payment_method = data['attributes']['payment_method_used']
                        permit.valid_until = timezone.now() + timedelta(days=3)
                        permit.save()

                        # 3. Trigger the PDF Generation
                        generate_permit_pdf.enqueue(permit_application_id=application_permit_instance.pk)       
                
                    return Response({
                        "msg": "Payment Verified",
                        "verified": True,
                    }, status=200)
                
        except Exception as e:
            print(str(e))
            return Response("Payment not confirmed yet", status=status.HTTP_400_BAD_REQUEST)
