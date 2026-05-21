from rest_framework import viewsets, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.db import transaction
from . import serializers
from . import models
from . import services
import uuid
from apps.api.models import Notification
from django_filters.rest_framework import DjangoFilterBackend
from .filters import PermitApplicationFilter
from apps.api.models import AuditTrail
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated


class PermitApplicationViewSets(viewsets.ModelViewSet):
    queryset = models.PermitApplication.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = PermitApplicationFilter
    permission_classes = [IsAuthenticated]


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
        user = self.request.user
        if not user.is_authenticated:
            return models.PermitApplication.objects.none()

        if user.role == 'Farmer':
            return models.PermitApplication.objects.filter(farmer=user)
        
        elif user.role == 'Agri':
            return models.PermitApplication.objects.all()
        
        elif user.role == 'Opv':
            return models.PermitApplication.objects.filter(status__in = ["OPV_REJECTED", "OPV_VALIDATED", "FORWARDED_TO_OPV"])
        
        return models.PermitApplication.objects.all()


    def _parse_bracket_data(self, data):
        """
        Helper to parse origins[i][field] style keys from FormData/QueryDict.
        """
        origins_data = []
        i = 0
        while f'origins[{i}][barangay]' in data:
            origin = {
                'barangay': data.get(f'origins[{i}][barangay]'),
                'number_of_pigs': data.get(f'origins[{i}][number_of_pigs]'),
            }
            # Include ID if present (for updates)
            if f'origins[{i}][id]' in data:
                origin['id'] = data.get(f'origins[{i}][id]')
            
            origins_data.append(origin)
            i += 1
        return origins_data

    def create(self, request, *args, **kwargs):
        """
        Create a new permit application with nested origins parsed from FormData.
        """
        if request.user.role != 'Farmer':
            return Response({"error": "Only farmers can submit new applications."}, status=status.HTTP_403_FORBIDDEN)

        # Construct payload for serializer
        data = {
            'destination': request.data.get('destination'),
            'transport_date': request.data.get('transport_date'),
            'purpose': request.data.get('purpose'),
            'origins': self._parse_bracket_data(request.data)
        }

        try:
            with transaction.atomic():
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                application = serializer.save(farmer=request.user)
                
                # Link documents using the saved application and files
                if request.FILES:
                    services.create_permit(
                        files=request.FILES,
                        application=application,
                        user=request.user
                    )
                
                application.status = models.PermitApplication.Status.SUBMITTED
                application.save()

            return Response({"msg": "Application submitted successfully", "id": application.pk}, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            return Response({"error": "Validation failed", "detail": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "Failed to create application", "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Agri officer approval to forward the application to OPV.
        """
        if request.user.role != 'Agri':
            return Response({"error": "Only Agri officers can approve applications."}, status=status.HTTP_403_FORBIDDEN)

        application_instance = self.get_object()
        approvable_statuses = [
            models.PermitApplication.Status.SUBMITTED,
            models.PermitApplication.Status.OCR_VALIDATED,
            models.PermitApplication.Status.MANUAL,
        ]
        
        if application_instance.status not in approvable_statuses:
            return Response(
                {"error": f"Cannot approve an application with status '{application_instance.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        remarks = request.data.get("remarks", "").strip()
        
        with transaction.atomic():
            application_instance.status = models.PermitApplication.Status.FORWARDED_TO_OPV
            application_instance.save()

            # Create notification for the farmer
            Notification.objects.create(
                recipient=application_instance.farmer,
                title="Application Approved by Agri",
                message=(
                    f"Your permit application has been reviewed by Agri and forwarded to OPV for final validation.\n\n"
                    f"Remarks: {remarks}"
                ) if remarks else "Your permit application has been forwarded to OPV.",
            )

            # --- Formal Audit Entry ---
            AuditTrail.objects.create(
                who_performed = request.user,
                what_performed = f"[AGRI OFFICER REVIEW] - Application #{application_instance.application_id} approved for health validation. Forwarded to OPV.",
                when_performed = timezone.now(),
            )

        return Response({"msg": "Application approved and forwarded to OPV"}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Agri officer rejection - sends application back for resubmission.
        """
        if request.user.role != 'Agri':
            return Response({"error": "Only Agri officers can reject applications."}, status=status.HTTP_403_FORBIDDEN)

        application_instance = self.get_object()
        rejectable_statuses = [
            models.PermitApplication.Status.SUBMITTED,
            models.PermitApplication.Status.OCR_VALIDATED,
            models.PermitApplication.Status.MANUAL,
        ]
        
        if application_instance.status not in rejectable_statuses:
            return Response(
                {"error": f"Cannot reject an application with status '{application_instance.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        remarks = request.data.get("remarks", "").strip()
        if not remarks:
            return Response({"error": "Remarks are required when rejecting an application."}, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            application_instance.status = models.PermitApplication.Status.RESUBMISSION
            application_instance.save()
            
            Notification.objects.create(
                recipient=application_instance.farmer,
                title="Application Requires Resubmission",
                message=f"Your permit application has been returned for resubmission.\n\nRemarks: {remarks}",
            )

            # --- Formal Audit Entry ---
            AuditTrail.objects.create(
                who_performed = request.user,
                what_performed = f"[AGRI OFFICER REVIEW] - Application #{application_instance.application_id} returned for resubmission. Reason: {remarks}.",
                when_performed = timezone.now(),
            )

        return Response({"msg": "Application rejected and returned for resubmission"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def resubmit(self, request, pk=None):
        """
        Farmer resubmission - allows updating details and documents for rejected applications.
        """
        if request.user.role != 'Farmer':
            return Response({"error": "Only farmers can resubmit their applications."}, status=status.HTTP_403_FORBIDDEN)

        application_instance = self.get_object()

        # Guard: Only allow resubmission if status is RESUBMISSION
        if application_instance.status != models.PermitApplication.Status.RESUBMISSION:
            return Response(
                {"error": f"Cannot resubmit an application with status '{application_instance.status}'. Status must be 'RESUBMISSION'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # Construct payload for serializer
                data = {
                    'destination': request.data.get('destination'),
                    'transport_date': request.data.get('transport_date'),
                    'purpose': request.data.get('purpose'),
                    'origins': self._parse_bracket_data(request.data)
                }

                # Update basic application data if provided
                serializer = self.get_serializer(application_instance, data=data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()

                # Handle document updates/replacements
                if request.FILES:
                    services.resubmit_permit(
                        files=request.FILES,
                        application=application_instance,
                        user=request.user
                    )

                # Set status back to SUBMITTED
                application_instance.status = models.PermitApplication.Status.SUBMITTED
                application_instance.save()

                # --- Formal Audit Entry ---
                AuditTrail.objects.create(
                    who_performed = request.user,
                    what_performed = f"[FARMER RESUBMISSION] - Application #{application_instance.application_id} resubmitted with updated information/documents.",
                    when_performed = timezone.now(),
                )

            return Response({"msg": "Application resubmitted successfully"}, status=status.HTTP_200_OK)

        except Exception as e:
            error_detail = getattr(e, 'detail', str(e))
            return Response({"error": "Failed to resubmit application", "detail": error_detail}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def verify(self, request, pk=None):
        """
        Verification endpoint used by the Inspector App to scan QR codes.
        Takes the qr_token as 'pk' and returns the associated permit details if valid.
        """
        # Ensure only authorized personnel can verify
        if request.user.role not in ['Agri', 'Opv', 'Inspector']:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        try:
            issued_permit_instance = get_object_or_404(
                models.IssuedPermit, qr_token = pk
            )

            serializer = self.get_serializer(issued_permit_instance.application)

            # --- Formal Audit Entry ---
            AuditTrail.objects.create(
                who_performed = request.user,
                what_performed = f"[FIELD INSPECTION] - Security QR Code scan performed for Application #{issued_permit_instance.application.application_id}. Result: VERIFIED.",
                when_performed = timezone.now(),
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)


class SubmittedDocumentViewSets(viewsets.ModelViewSet):
    queryset = models.SubmittedDocument.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return serializers.SubmittedDocumentListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.SubmittedDocumentWriteSerializer
        else:
            return serializers.SubmittedDocumentListSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.SubmittedDocument.objects.none()

        if user.role == 'Farmer':
            return models.SubmittedDocument.objects.filter(origin__application__farmer=user)
        return models.SubmittedDocument.objects.all()



class OPVValidationViewSets(viewsets.ModelViewSet):
    queryset = models.OPVValidation.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return serializers.OPVValidationDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.OPVValidationWriteSerializer
        else:
            return serializers.OPVValidationDetailSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.OPVValidation.objects.none()

        if user.role == 'Farmer':
            return models.OPVValidation.objects.filter(application__farmer=user)
        return models.OPVValidation.objects.all()

    # actions
    @action(detail=False, methods=['get'])
    def application(self, request):
        """ Display the Application to OPV """
        if request.user.role != "Opv":
             return Response({"error": "Not Authorized"}, status=status.HTTP_403_FORBIDDEN)

        qs = models.PermitApplication.objects.filter(
            status__icontains='OPV'
        )
        
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = serializers.PermitApplicationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = serializers.PermitApplicationListSerializer(
            qs, many=True
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve the application attched with documents."""
        if request.user.role != "Opv":
            return Response({"error": "Not Authorized"}, status=status.HTTP_403_FORBIDDEN)

        application_instance = get_object_or_404(
            models.PermitApplication,
            pk=pk
        )

        if application_instance.status not in ["OPV_REJECTED", "FORWARDED_TO_OPV"]:
            return Response({"error": "This is already approved."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        files = request.FILES

        services.create_approve_opv_validation(
            application_id=pk,
            files=files,
            data=data,
            staff=request.user
        )

        # --- Formal Audit Entry ---
        AuditTrail.objects.create(
            who_performed = request.user,
            what_performed = f"[PROVINCIAL VETERINARY REVIEW] - Health requirements validated for Application #{application_instance.application_id}. Status updated to OPV_VALIDATED.",
            when_performed = timezone.now(),
        )

        return Response({"msg": "Approved successfully"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject the applications with reason"""
        if request.user.role != "Opv":
            return Response({"error": "Not Authorized"}, status=status.HTTP_403_FORBIDDEN)

        application_instance = get_object_or_404(
            models.PermitApplication,
            pk=pk
        )

        if application_instance.status == "OPV_VALIDATED":
            return Response({"error": "This is already approved."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data

        services.create_reject_opv_validation(
            application_id=pk,
            staff = request.user,
            data=data
        )

        # --- Formal Audit Entry ---
        AuditTrail.objects.create(
            who_performed = request.user,
            what_performed = f"[PROVINCIAL VETERINARY REVIEW] - Application #{application_instance.application_id} rejected by Veterinary Officer. Remarks: {data.get('remarks', 'N/A')}.",
            when_performed = timezone.now(),
        )

        return Response({"msg": "Rejected successfully"}, status=status.HTTP_200_OK)


class IssuedPermitViewSets(viewsets.ModelViewSet):
    queryset = models.IssuedPermit.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return serializers.IssuedPermitDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.IssuedPermitWriteSerializer
        else:
            return serializers.IssuedPermitDetailSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.IssuedPermit.objects.none()

        if user.role == 'Farmer':
            return models.IssuedPermit.objects.filter(application__farmer=user)
        return models.IssuedPermit.objects.all()

    def create(self, request, *args, **kwargs):
        """
        Issue a permit for a validated application.
        Includes guards for duplicate permits and invalid application status.
        """
        if request.user.role != "Agri":
            return Response({"error": "Only Agri officers can issue permits."}, status=status.HTTP_403_FORBIDDEN)

        application_id = request.data.get('application_id')
        if not application_id:
            return Response({"error": "application_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        application_instance = get_object_or_404(
            models.PermitApplication, pk=application_id
        )

        # Guard: Ensure the application has been validated by OPV
        if application_instance.status != models.PermitApplication.Status.OPV_VALIDATED:
            return Response(
                {"error": f"Cannot issue permit for application with status: {application_instance.status}. It must be OPV_VALIDATED."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Guard: Prevent duplicate IssuedPermit for the same application (OneToOne constraint)
        if hasattr(application_instance, 'issued_permit'):
            return Response({"error": "A permit has already been issued for this application."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            issued_permit = models.IssuedPermit.objects.create(
                    permit_number=uuid.uuid4().hex[:13].upper(),
                    application = application_instance,
                    issued_by = request.user,
                    qr_token = uuid.uuid4(),
            )

            # Advance status to Payment Pending
            application_instance.status = models.PermitApplication.Status.PAYMENT_PENDING
            application_instance.save()

            # --- Formal Audit Entry ---
            AuditTrail.objects.create(
                who_performed = request.user,
                what_performed = f"[PERMIT ISSUANCE] - Final Transport Permit {issued_permit.permit_number} issued for Application #{application_instance.application_id} by {request.user.get_full_name()}. Status: PAYMENT_PENDING.",
                when_performed = timezone.now(),
            )

        return Response({"msg": "Permit issued successfully!", "id": issued_permit.id}, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve issued permit documents (VHC, Pass, and the Permit PDF itself).
        Includes guards for unpaid permits and missing related records.
        """
        application_id = self.kwargs.get('pk')
        application_instance = get_object_or_404(
            models.PermitApplication, pk=application_id
        )    

        # Ownership check for Farmer
        if request.user.role == 'Farmer' and application_instance.farmer != request.user:
            return Response({"error": "Unauthorized access to this permit."}, status=status.HTTP_403_FORBIDDEN)

        # Guard: Check if OPV validation exists
        try:
            opv_docs_instance = application_instance.opv_validation
        except models.OPVValidation.DoesNotExist:
            return Response({"error": "OPV validation records not found for this application."}, status=status.HTTP_404_NOT_FOUND)

        # Guard: Check if IssuedPermit exists
        try:
            issued_permit_instance = application_instance.issued_permit
        except models.IssuedPermit.DoesNotExist:
            return Response({"error": "No permit has been issued for this application."}, status=status.HTTP_404_NOT_FOUND)

        # Guard: Only allow retrieval if paid
        if not issued_permit_instance.is_paid:
            return Response({"error": "This permit has not been paid for yet."}, status=status.HTTP_403_FORBIDDEN)

        # Guard: Ensure PDF has been generated
        if not issued_permit_instance.permit_pdf:
            return Response({"error": "Permit PDF is still being generated. Please try again in a moment."}, status=status.HTTP_202_ACCEPTED)

        return Response({
            "veterinary_health_certificate": request.build_absolute_uri(opv_docs_instance.veterinary_health_certificate.url) if opv_docs_instance.veterinary_health_certificate else None,
            "transportation_pass" : request.build_absolute_uri(opv_docs_instance.transportation_pass.url) if opv_docs_instance.transportation_pass else None,
            "issued_permit_pdf": request.build_absolute_uri(issued_permit_instance.permit_pdf.url),
        }, status=status.HTTP_200_OK)


class OCRValidationResultViewSets(viewsets.ModelViewSet):
    queryset = models.OCRValidationResult.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return serializers.OCRValidationResultListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.OCRValidationResultWriteSerializer
        else:
            return serializers.OCRValidationResultListSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return models.OCRValidationResult.objects.none()

        if user.role == 'Farmer':
            return models.OCRValidationResult.objects.filter(document__origin__application__farmer=user)
        return models.OCRValidationResult.objects.all()

    def update(self, request, *args, **kwargs):
        if request.user.role != "Agri":
            return Response({"error": "Only Agri officers can manually override OCR results."}, status=status.HTTP_403_FORBIDDEN)

        new_fields = request.data
        ocr_instance = self.get_object()
        merged = {**ocr_instance.extracted_field, **new_fields}

        ocr_instance.extracted_field = merged
        ocr_instance.status = models.OCRValidationResult.ValidationStatus.OVERRIDDEN
        ocr_instance.manually_overridden = True
        ocr_instance.overridden_by = request.user
        ocr_instance.overridden_fields = new_fields
        ocr_instance.remarks = f'Manually reviewed by {request.user.get_full_name()}'
        ocr_instance.save()

        # --- Formal Audit Entry ---
        AuditTrail.objects.create(
            who_performed = request.user,
            what_performed = f"[OCR DATA CORRECTION]- Agri Officer manually corrected data fields for Document #{ocr_instance.document.id} issued for Application #{ocr_instance.document.origin.application.id}.",
            when_performed = timezone.now(),
        )

        return Response({"msg": "Updated successfully"}, status=status.HTTP_200_OK)


class ReportViewSets(viewsets.ViewSet):
    """
    Report generation endpoints for Agri Officers only.
    All reports accept optional start_date and end_date query params (YYYY-MM-DD).
    Defaults to today when not provided.
    """
    permission_classes = [IsAuthenticated]

    def _parse_date_range(self, request):
        """Parse start_date and end_date from query params. Defaults to today."""
        from datetime import datetime
        today = timezone.now().date()
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else today
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else today
        except ValueError:
            return None, None, Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        if start_date > end_date:
            return None, None, Response({"error": "Start date cannot be after end date."}, status=400)

        return start_date, end_date, None

    @action(detail=False, methods=['get'], url_path='permit-issuance/pdf')
    def permit_issuance_pdf(self, request):
        """Export the permit issuance summary as a PDF for a given date range."""
        from django.http import FileResponse
        from apps.documents.services import generate_permit_issuance_report_pdf

        if request.user.role != 'Agri':
            return Response({"error": "Only Agri officers can generate reports."}, status=403)

        start_date, end_date, error = self._parse_date_range(request)
        if error:
            return error

        pdf_buffer = generate_permit_issuance_report_pdf(start_date=start_date, end_date=end_date)
        filename = f"PERMIT_ISSUANCE_{start_date}_to_{end_date}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename)

    @action(detail=False, methods=['get'], url_path='permit-issuance/csv')
    def permit_issuance_csv(self, request):
        """Export the permit issuance list as a CSV file for a given date range."""
        from django.http import HttpResponse
        from apps.documents.services import generate_permit_issuance_csv

        if request.user.role != 'Agri':
            return Response({"error": "Only Agri officers can generate reports."}, status=403)

        start_date, end_date, error = self._parse_date_range(request)
        if error:
            return error

        csv_output = generate_permit_issuance_csv(start_date=start_date, end_date=end_date)
        filename = f"PERMIT_ISSUANCE_{start_date}_to_{end_date}.csv"
        response = HttpResponse(csv_output, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'], url_path='barangay-distribution/pdf')
    def barangay_distribution_pdf(self, request):
        """Export barangay livestock volume distribution as a PDF."""
        from django.http import FileResponse
        from apps.documents.services import generate_barangay_distribution_pdf

        if request.user.role != 'Agri':
            return Response({"error": "Only Agri officers can generate reports."}, status=403)

        start_date, end_date, error = self._parse_date_range(request)
        if error:
            return error

        pdf_buffer = generate_barangay_distribution_pdf(start_date=start_date, end_date=end_date)
        filename = f"BARANGAY_DISTRIBUTION_{start_date}_to_{end_date}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename)

    @action(detail=False, methods=['get'], url_path='inspector-logs/pdf')
    def inspector_logs_pdf(self, request):
        """Export field inspection audit log as a PDF."""
        from django.http import FileResponse
        from apps.documents.services import generate_inspector_report_pdf

        if request.user.role != 'Agri':
            return Response({"error": "Only Agri officers can generate reports."}, status=403)

        start_date, end_date, error = self._parse_date_range(request)
        if error:
            return error

        pdf_buffer = generate_inspector_report_pdf(start_date=start_date, end_date=end_date)
        filename = f"INSPECTOR_LOGS_{start_date}_to_{end_date}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename)
