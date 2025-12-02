from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin interface for Product model"""
    list_display = ['name', 'is_vip', 'created_at']
    list_filter = ['is_vip', 'created_at']
    search_fields = ['name']
    readonly_fields = ['id', 'created_at']
    fieldsets = (
        ('Product Information', {
            'fields': ('id', 'name', 'is_vip', 'created_at')
        }),
    )
    ordering = ['name']
