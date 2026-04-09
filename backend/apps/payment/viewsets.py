from rest_framework import viewsets
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from . import models
from . import serializers
from . import services
from django.shortcuts import get_object_or_404
from apps.permits.models import PermitApplication


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
            pass the issued permit id to create the checkout session
        """
        data = services.create_checkout_session(
            issued_permit_id=pk,
            staff=request.user
        )
        return Response(data, status=status.HTTP_200_OK)

