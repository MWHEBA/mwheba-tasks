"""
Views for the statuses app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from permissions import IsAdminOrReadOnly
from .models import TaskStatus
from .serializers import TaskStatusSerializer


# Default statuses to be used for reset
DEFAULT_STATUSES = [
    {'id': 'pending', 'label': 'قيد الانتظار', 'color': 'slate', 'icon': 'fa-regular fa-clock', 'order_index': 0, 'is_finished': False, 'is_default': True, 'allowed_next_statuses': ['in_design', 'on_hold', 'cancelled']},
    {'id': 'in_design', 'label': 'جاري التصميم', 'color': 'blue', 'icon': 'fa-solid fa-palette', 'order_index': 1, 'is_finished': False, 'allowed_next_statuses': ['awaiting_client_response', 'has_comments', 'on_hold']},
    {'id': 'has_comments', 'label': 'ملحوظات العميل', 'color': 'rose', 'icon': 'fa-regular fa-comments', 'order_index': 2, 'is_finished': False, 'allowed_next_statuses': ['designer_notes']},
    {'id': 'designer_notes', 'label': 'ملحوظات المصمم', 'color': 'amber', 'icon': 'fa-solid fa-pencil-alt', 'order_index': 3, 'is_finished': False, 'allowed_next_statuses': ['awaiting_client_response']},
    {'id': 'awaiting_client_response', 'label': 'في انتظار رد العميل', 'color': 'orange', 'icon': 'fa-solid fa-hourglass-half', 'order_index': 4, 'is_finished': False, 'allowed_next_statuses': ['has_comments', 'ready_for_montage', 'on_hold']},
    {'id': 'ready_for_montage', 'label': 'جاهز للمونتاج', 'color': 'cyan', 'icon': 'fa-solid fa-layer-group', 'order_index': 5, 'is_finished': False, 'allowed_next_statuses': ['montage_completed']},
    {'id': 'montage_completed', 'label': 'تم المونتاج', 'color': 'purple', 'icon': 'fa-solid fa-check-circle', 'order_index': 6, 'is_finished': False, 'allowed_next_statuses': ['ready_for_printing']},
    {'id': 'ready_for_printing', 'label': 'جاهز للطباعة', 'color': 'green', 'icon': 'fa-solid fa-box-open', 'order_index': 7, 'is_finished': False, 'allowed_next_statuses': ['in_printing']},
    {'id': 'in_printing', 'label': 'جاري الطباعة', 'color': 'teal', 'icon': 'fa-solid fa-print', 'order_index': 8, 'is_finished': False, 'allowed_next_statuses': ['ready_for_delivery']},
    {'id': 'ready_for_delivery', 'label': 'جاهز للتسليم', 'color': 'lime', 'icon': 'fa-solid fa-truck', 'order_index': 9, 'is_finished': False, 'allowed_next_statuses': ['delivered']},
    {'id': 'on_hold', 'label': 'معلق', 'color': 'slate', 'icon': 'fa-solid fa-pause-circle', 'order_index': 10, 'is_finished': False, 'allowed_next_statuses': []},
    {'id': 'delivered', 'label': 'تم التسليم', 'color': 'emerald', 'icon': 'fa-solid fa-flag-checkered', 'order_index': 11, 'is_finished': True, 'allowed_next_statuses': []},
    {'id': 'cancelled', 'label': 'ملغي', 'color': 'red', 'icon': 'fa-solid fa-ban', 'order_index': 12, 'is_finished': True, 'is_cancelled': True, 'allowed_next_statuses': []},
]


class TaskStatusViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TaskStatus model.
    Provides CRUD operations for task statuses.
    
    Permissions:
    - Admin: Full access (create, read, update, delete)
    - Other authenticated users: Read-only access
    """
    queryset = TaskStatus.objects.all()
    serializer_class = TaskStatusSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_value_regex = '[^/]+'
    
    def get_queryset(self):
        """
        Get queryset ordered by order_index.
        """
        return TaskStatus.objects.all().order_by('order_index')
    
    @action(detail=False, methods=['post'], url_path='reset-to-defaults')
    def reset_to_defaults(self, request):
        """
        POST /api/statuses/reset-to-defaults/
        Resets all statuses to default configuration.
        Preserves existing tasks' statuses by only updating/creating status definitions.
        """
        from tasks.models import Task
        from django.db import connection
        
        # Get all existing status IDs that are currently used by tasks
        used_status_ids = set(Task.objects.values_list('status_id', flat=True).distinct())
        
        # Get all default status IDs
        default_status_ids = {status['id'] for status in DEFAULT_STATUSES}
        
        # Find statuses that are used by tasks but not in defaults
        orphaned_status_ids = used_status_ids - default_status_ids
        
        # If there are orphaned statuses, update those tasks to pending
        default_status_id = 'pending'
        if orphaned_status_ids:
            Task.objects.filter(status_id__in=orphaned_status_ids).update(status_id=default_status_id)
        
        # Delete all existing statuses using raw SQL to bypass PROTECT
        with connection.cursor() as cursor:
            # Temporarily disable foreign key checks
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            cursor.execute("DELETE FROM task_statuses")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        
        # Create all default statuses
        for status_data in DEFAULT_STATUSES:
            TaskStatus.objects.create(**status_data)
        
        # Return the new statuses
        statuses = TaskStatus.objects.all().order_by('order_index')
        serializer = self.get_serializer(statuses, many=True)
        
        return Response({
            'message': 'تم إعادة تعيين الحالات بنجاح مع الحفاظ على حالات التاسكات الموجودة',
            'statuses': serializer.data
        }, status=status.HTTP_200_OK)
