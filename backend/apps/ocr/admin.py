from django.contrib import admin
from .models import DailyOCRUsage


@admin.register(DailyOCRUsage)
class DailyOCRUsageAdmin(admin.ModelAdmin):
    list_display = ('provider', 'date', 'call_count')
    list_filter = ('provider', 'date')
    ordering = ('-date', 'provider')
    readonly_fields = ('date', 'provider', 'call_count')
