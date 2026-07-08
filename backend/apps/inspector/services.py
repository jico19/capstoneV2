from rest_framework.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from . import models, serializers
from apps.api.models import User, Notification
from apps.documents.services import generate_inspector_report_pdf
from apps.api.utils import parse_date_range_strings

def generate_duty_report(user, start_date_str, end_date_str):
    if user.role != 'Agri':
        raise PermissionDenied("Unauthorized")

    start_date, end_date = parse_date_range_strings(start_date_str, end_date_str)
    pdf_buffer = generate_inspector_report_pdf(start_date=start_date, end_date=end_date, requesting_user=user)
    return pdf_buffer, start_date, end_date

def create_inspector_log(user, request_data):
    if user.role != 'Inspector':
        raise PermissionDenied("Only inspectors can log verification activity.")
    
    serializer = serializers.InspectorLogsSerializer(data=request_data)
    serializer.is_valid(raise_exception=True)
    log_instance = serializer.save(inspector=user)

    # --- Update Permit Status ---
    application = log_instance.application
    application.is_checked = True
    application.save()

    # --- Send Notifications ---
    # 1. Notify the Farmer
    Notification.objects.create(
        recipient=log_instance.application.farmer,
        type=Notification.Type.INFO,
        title="Checkpoint Verified",
        message=f"Your transport permit (ID: {log_instance.application.application_id}) has been successfully verified by an inspector at a checkpoint."
    )

    # 2. Notify Agri and OPV offices
    staff_to_notify = User.objects.filter(role__in=['Agri', 'Opv'])
    for staff in staff_to_notify:
        Notification.objects.create(
            recipient=staff,
            type=Notification.Type.INFO,
            title="Field Inspection Activity",
            message=f"Inspector {user.get_full_name() or user.username} has just recorded a field verification for Application #{log_instance.application.application_id}."
        )

    return serializer.data
