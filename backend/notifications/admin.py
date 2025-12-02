from django.contrib import admin
from .models import NotificationLog


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    """Admin interface for NotificationLog model"""
    list_display = ['id', 'task', 'recipient_number', 'template_type', 'sent_at', 'success']
    list_filter = ['success', 'template_type', 'sent_at']
    search_fields = ['task__title', 'recipient_number', 'message']
    readonly_fields = ['id', 'task', 'recipient_number', 'message', 'template_type', 'sent_at', 'success', 'error_message']
    
    def has_add_permission(self, request):
        """Disable adding logs manually"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Disable editing logs"""
        return False
