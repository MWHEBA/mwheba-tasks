from django.contrib import admin
from .models import Task, Attachment, Comment, ActivityLog


class AttachmentInline(admin.TabularInline):
    """Inline admin for Attachment"""
    model = Attachment
    extra = 0
    readonly_fields = ['id', 'name', 'type', 'size', 'created_at']
    fields = ['name', 'type', 'file', 'size', 'created_at']
    can_delete = True


class CommentInline(admin.StackedInline):
    """Inline admin for Comment"""
    model = Comment
    extra = 0
    readonly_fields = ['id', 'created_at']
    fields = ['text', 'parent_comment', 'is_resolved', 'created_at']
    can_delete = True


class ActivityLogInline(admin.TabularInline):
    """Inline admin for ActivityLog"""
    model = ActivityLog
    extra = 0
    readonly_fields = ['id', 'timestamp', 'type', 'description', 'details']
    fields = ['timestamp', 'type', 'description']
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        """Disable adding logs manually"""
        return False


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    """Admin interface for Task model"""
    list_display = ['title', 'client', 'status', 'urgency', 'is_vip', 'printing_type', 'deadline', 'created_at']
    list_filter = ['urgency', 'status', 'is_vip', 'printing_type', 'created_at']
    search_fields = ['title', 'description', 'client__name']
    readonly_fields = ['id', 'created_at']
    inlines = [AttachmentInline, CommentInline, ActivityLogInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'title', 'description', 'client', 'parent')
        }),
        ('Task Details', {
            'fields': ('urgency', 'status', 'printing_type', 'size', 'is_vip')
        }),
        ('Timeline', {
            'fields': ('deadline', 'created_at')
        }),
        ('Ordering', {
            'fields': ('order_index',)
        }),
    )
    
    ordering = ['order_index']
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        qs = super().get_queryset(request)
        return qs.select_related('client', 'status', 'parent')


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    """Admin interface for Attachment model"""
    list_display = ['name', 'task', 'type', 'size', 'created_at']
    list_filter = ['type', 'created_at']
    search_fields = ['name', 'task__title']
    readonly_fields = ['id', 'created_at']
    fieldsets = (
        ('Attachment Information', {
            'fields': ('id', 'task', 'name', 'type', 'file', 'size', 'created_at')
        }),
    )
    ordering = ['-created_at']


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """Admin interface for Comment model"""
    list_display = ['task', 'text_preview', 'parent_comment', 'is_resolved', 'created_at']
    list_filter = ['is_resolved', 'created_at']
    search_fields = ['text', 'task__title']
    readonly_fields = ['id', 'created_at']
    fieldsets = (
        ('Comment Information', {
            'fields': ('id', 'task', 'parent_comment', 'text', 'is_resolved', 'created_at')
        }),
    )
    ordering = ['-created_at']
    
    def text_preview(self, obj):
        """Show preview of comment text"""
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Text'


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    """Admin interface for ActivityLog model"""
    list_display = ['task', 'type', 'description_preview', 'timestamp']
    list_filter = ['type', 'timestamp']
    search_fields = ['description', 'task__title']
    readonly_fields = ['id', 'task', 'timestamp', 'type', 'description', 'details']
    fieldsets = (
        ('Activity Information', {
            'fields': ('id', 'task', 'type', 'description', 'details', 'timestamp')
        }),
    )
    ordering = ['-timestamp']
    
    def description_preview(self, obj):
        """Show preview of description"""
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    description_preview.short_description = 'Description'
    
    def has_add_permission(self, request):
        """Disable adding logs manually"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Disable editing logs"""
        return False
