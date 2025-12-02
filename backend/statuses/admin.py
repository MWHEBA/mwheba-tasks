from django.contrib import admin
from .models import TaskStatus


@admin.register(TaskStatus)
class TaskStatusAdmin(admin.ModelAdmin):
    """Admin interface for TaskStatus model"""
    list_display = ['label', 'color', 'icon', 'order_index', 'is_default', 'is_finished', 'is_cancelled']
    list_filter = ['is_default', 'is_finished', 'is_cancelled']
    search_fields = ['label']
    readonly_fields = ['id', 'created_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'label', 'color', 'icon', 'order_index')
        }),
        ('Status Flags', {
            'fields': ('is_default', 'is_finished', 'is_cancelled')
        }),
        ('Workflow', {
            'fields': ('allowed_next_statuses',)
        }),
        ('Metadata', {
            'fields': ('created_at',)
        }),
    )
    ordering = ['order_index']
