from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from . import models


@admin.register(models.User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('role', 'phone_no', 'address', 'barangay')
        }),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Additional Info', {
            'fields': ('role', 'phone_no', 'address', 'barangay')
        }),
    )

admin.site.register(models.Notification)


@admin.register(models.AuditTrail)
class AuditTrailAdmin(admin.ModelAdmin):
    list_display = ("id", "action_type", "who_performed", "target_user", "ip_address", "when_performed")
    list_filter = ("action_type", "when_performed")
    search_fields = ("what_performed", "who_performed__username", "ip_address")
    readonly_fields = [f.name for f in models.AuditTrail._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(models.PrivacyConsentLog)
class PrivacyConsentLogAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "consent_version", "ip_address", "agreed_at")
    readonly_fields = [f.name for f in models.PrivacyConsentLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False