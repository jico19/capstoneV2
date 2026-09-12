from django.contrib import admin
from . import models
# Register your models here.


@admin.register(models.SMSLog)
class SMSLogAdmin(admin.ModelAdmin):
    list_display = ("id", "phone_number", "application", "message_type", "status_captured", "send_at")
    list_filter = ("message_type", "status_captured", "send_at")
    search_fields = ("phone_number", "application__application_id")
    readonly_fields = ("send_at",)