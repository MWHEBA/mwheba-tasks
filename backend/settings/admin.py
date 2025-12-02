from django.contrib import admin
from .models import Setting, UnifiedSettings


@admin.register(Setting)
class SettingAdmin(admin.ModelAdmin):
    """Admin interface for Setting model"""
    list_display = ['key_name', 'value', 'updated_at']
    search_fields = ['key_name']
    readonly_fields = ['updated_at']
    fieldsets = (
        ('Setting Details', {
            'fields': ('key_name', 'value', 'updated_at')
        }),
    )
    ordering = ['key_name']


@admin.register(UnifiedSettings)
class UnifiedSettingsAdmin(admin.ModelAdmin):
    """Admin interface for UnifiedSettings model"""
    list_display = ['id', 'notifications_enabled', 'updated_at']
    readonly_fields = ['id', 'updated_at']
    fieldsets = (
        ('WhatsApp Configuration', {
            'fields': ('whatsapp_numbers',)
        }),
        ('Notifications', {
            'fields': ('notifications_enabled', 'notification_templates')
        }),
        ('Metadata', {
            'fields': ('id', 'updated_at')
        }),
    )
    
    def has_add_permission(self, request):
        """Only allow one instance (singleton)"""
        return not UnifiedSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of singleton"""
        return False
