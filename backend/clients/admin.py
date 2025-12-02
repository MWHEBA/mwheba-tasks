from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    """Admin interface for Client model"""
    list_display = ['name', 'type', 'number', 'created_at']
    list_filter = ['type', 'created_at']
    search_fields = ['name', 'number', 'notes']
    readonly_fields = ['id', 'created_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'type', 'number')
        }),
        ('Additional Details', {
            'fields': ('notes', 'created_at')
        }),
    )
    ordering = ['name']
