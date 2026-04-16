from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.db import transaction
from . import serializers
from . import models
from . import services
from apps.documents.services import generate_permit_pdf
import uuid
from datetime import timedelta
from apps.api.models import Notification
from django_filters.rest_framework import DjangoFilterBackend
from .filters import PermitApplicationFilter

class PermitApplicationViewSets(viewsets.ModelViewSet):
    queryset = models.PermitApplication.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = PermitApplicationFilter


    def get_serializer_class(self):
        if self.action == 'list':
            return serializers.PermitApplicationListSerializer
        elif self.action in ['retrieve', 'verify']:
            return serializers.PermitApplicationDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.PermitApplicationWriteSerializer
        else:
            return serializers.PermitApplicationListSerializer
    
    def  get_queryset(self):

        if self.request.user.role == 'Farmer':
                return models.PermitApplication.objects.filter(farmer=self.request.user)
        
        elif self.request.user.role == 'Agri':
            return models.PermitApplication.objects.all()
        
        elif self.request.user.role == 'Opv':
            return models.PermitApplication.objects.filter(status__in = ["OPV_REJECTED", "OPV_VALIDATED", "FORWARDED_TO_OPV"])
        
        # # for testing
        # return models.PermitApplication.objects.all()


    def create(self, request, *args, **kwargs):

        try:
            # serializes the data
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            application = serializer.save(farmer=request.user)
            # create the permit
            services.create_permit(
                files=request.FILES,
                application=application,
                user=request.user
            )

            return Response('ok!!', status=status.HTTP_200_OK)

        except Exception as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

    # actions
    @action(detail=True, methods=['post'])
    def forward(self, request, pk=None):
        try:
            application = get_object_or_404(
                models.PermitApplication,
                pk=pk
            )

            if application.status not in ['OCR_VALIDATED', 'MANUAL']:
                return Response("you can't forward this.", status=status.HTTP_400_BAD_REQUEST)

            application.status = models.PermitApplication.Status.FORWARDED_TO_OPV
            application.save()

            return Response('forwarded!', status=status.HTTP_200_OK)
        except Exception:
            return Response("error forwarding.", status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if request.user.role != 'Agri':
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )

        application_instance = self.get_object()
        approvable_statuses = [
            models.PermitApplication.Status.SUBMITTED,
            models.PermitApplication.Status.OCR_VALIDATED,
            models.PermitApplication.Status.MANUAL,
        ]
        if application_instance.status not in approvable_statuses:
            return Response(
                {"detail": f"Cannot approve an application with status '{application_instance.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        remarks = request.data.get("remarks", "").strip()
        application_instance.status = models.PermitApplication.Status.FORWARDED_TO_OPV

        Notification.objects.create(
            recipient=application_instance.farmer,
            title="Application Approved",
            message=(
                f"Your permit application has been approved and forwarded to the OPV for validation.\n\n"
                f"Remarks: {remarks}"
            ) if remarks else "Your permit application has been approved and forwarded to the OPV for validation.",
        )

        application_instance.save()
        return Response("ok", status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if request.user.role != 'Agri':
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )

        application_instance = self.get_object()
        rejectable_statuses = [
            models.PermitApplication.Status.SUBMITTED,
            models.PermitApplication.Status.OCR_VALIDATED,
            models.PermitApplication.Status.MANUAL,
        ]
        if application_instance.status not in rejectable_statuses:
            return Response(
                {"detail": f"Cannot reject an application with status '{application_instance.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        remarks = request.data.get("remarks", "").strip()
        application_instance.status = models.PermitApplication.Status.RESUBMISSION
        
        Notification.objects.create(
            recipient=application_instance.farmer,
            title="Application Requires Resubmission",
            message=(
                f"Your permit application has been returned for resubmission.\n\n"
                f"Remarks: {remarks}"
            ) if remarks else "Your permit application has been returned for resubmission. Please review and resubmit.",
        )

        application_instance.save()
        return Response("ok", status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def verify(self, request, pk=None):
        try:
            issued_permit_instance = get_object_or_404(
                models.IssuedPermit, qr_token = pk
            )

            serializer = self.get_serializer(issued_permit_instance.application)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            print(str(e))
            return Response("error", status=status.HTTP_400_BAD_REQUEST)



class SubmittedDocumentViewSets(viewsets.ModelViewSet):
    queryset = models.SubmittedDocument.objects.all()

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return serializers.SubmittedDocumentListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.SubmittedDocumentWriteSerializer
        else:
            return serializers.SubmittedDocumentListSerializer

class OPVValidationViewSets(viewsets.ModelViewSet):
    queryset = models.OPVValidation.objects.all()

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return serializers.OPVValidationDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.OPVValidationWriteSerializer
        else:
            return serializers.OPVValidationDetailSerializer


    # actions
    @action(detail=False, methods=['get'])
    def application(self, request):
        """ Display the Application to """
        qs = models.PermitApplication.objects.filter(
            status__icontains='OPV'
        )
        serializer = serializers.PermitApplicationListSerializer(
            qs, many=True
        )
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve the application attched with documents."""
        application_instance = get_object_or_404(
            models.PermitApplication,
            pk=pk
        )

        # if request.user.role != "Opv":
        #     return Response("Not Authorized", status=status.HTTP_403_FORBIDDEN)
        
        if application_instance.status not in ["OPV_REJECTED", "FORWARDED_TO_OPV"]:
            return Response("This is already approved.", status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        files = request.FILES

        services.create_approve_opv_validation(
            application_id=pk,
            files=files,
            data=data,
            staff=request.user
        )

        return Response("ok!!", status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject the applications with reason"""
        application_instance = get_object_or_404(
            models.PermitApplication,
            pk=pk
        )
        
        # if request.user.role != "Opv":
        #     return Response("Not Authorized", status=status.HTTP_403_FORBIDDEN)

        if application_instance.status == "OPV_VALIDATED":
            return Response("This is already approved.", status=status.HTTP_400_BAD_REQUEST)

        data = request.data

        services.create_reject_opv_validation(
            application_id=pk,
            staff = request.user,
            data=data
        )

        return Response("ok!!", status=status.HTTP_200_OK)

class IssuedPermitViewSets(viewsets.ModelViewSet):
    queryset = models.IssuedPermit.objects.all()

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return serializers.IssuedPermitDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.IssuedPermitWriteSerializer
        else:
            return serializers.IssuedPermitDetailSerializer
        

    def create(self, request, *args, **kwargs):
        application_id = request.data.get('application_id')

        application_instance = get_object_or_404(
            models.PermitApplication, pk=application_id
        )

        issued_permit = models.IssuedPermit.objects.create(
                permit_number=uuid.uuid4().hex[:13],
                application_id = application_instance.id,
                issued_by = request.user,
                qr_token = uuid.uuid4(),
        )

        application_instance.status = models.PermitApplication.Status.PAYMENT_PENDING
        application_instance.save()


        return Response("issued permit!!", status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        application_id = self.kwargs.get('pk')
        applicataion_instance = get_object_or_404(
            models.PermitApplication, pk=application_id
        )    
        opv_docs_instance = applicataion_instance.opv_validation
        issued_permit_instance = applicataion_instance.issued_permit

        if not issued_permit_instance.is_paid:
            return Response("not paid.", status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "veterinary_health_certificate": request.build_absolute_uri(opv_docs_instance.veterinary_health_certificate.url),
            "transportation_pass" : request.build_absolute_uri(opv_docs_instance.transportation_pass.url),
            "issued_permit_pdf": request.build_absolute_uri(issued_permit_instance.permit_pdf.url),
        }, status=status.HTTP_200_OK)


class OCRValidationResultViewSets(viewsets.ModelViewSet):
    queryset = models.OCRValidationResult.objects.all()


    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return serializers.OCRValidationResultListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.OCRValidationResultWriteSerializer
        else:
            return serializers.OCRValidationResultListSerializer
        
    def update(self, request, *args, **kwargs):
        
        new_fields = request.data
        ocr_instance = self.get_object()
        merged = {**ocr_instance.extracted_field, **new_fields}

        ocr_instance.extracted_field = merged
        ocr_instance.status = models.OCRValidationResult.ValidationStatus.OVERRIDDEN
        ocr_instance.manually_overridden = True
        ocr_instance.overridden_by = request.user
        ocr_instance.overridden_fields    = new_fields
        ocr_instance.remarks = f'Manually reviewed by {request.user.get_full_name()}'
        ocr_instance.save()

        return Response("Updated!", status=status.HTTP_200_OK)