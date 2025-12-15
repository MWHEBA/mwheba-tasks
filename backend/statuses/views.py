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
    {'id': 'in_design', 'label': 'جاري التصميم', 'color': 'blue', 'icon': 'fa-solid fa-palette', 'order_index': 1, 'is_finished': False, 'allowed_next_statuses': ['has_comments', 'awaiting_client_response', 'on_hold', 'cancelled']},
    {'id': 'has_comments', 'label': 'يوجد ملاحظات', 'color': 'rose', 'icon': 'fa-regular fa-comments', 'order_index': 2, 'is_finished': False, 'allowed_next_statuses': ['in_design', 'awaiting_client_response', 'on_hold', 'cancelled']},
    {'id': 'awaiting_client_response', 'label': 'في انتظار رد العميل', 'color': 'orange', 'icon': 'fa-solid fa-hourglass-half', 'order_index': 3, 'is_finished': False, 'allowed_next_statuses': ['in_design', 'has_comments', 'ready_for_montage', 'on_hold', 'cancelled']},
    {'id': 'ready_for_montage', 'label': 'جاهز للمونتاج', 'color': 'cyan', 'icon': 'fa-solid fa-layer-group', 'order_index': 4, 'is_finished': False, 'allowed_next_statuses': ['montage_completed', 'has_comments', 'on_hold', 'cancelled']},
    {'id': 'montage_completed', 'label': 'تم المونتاج', 'color': 'purple', 'icon': 'fa-solid fa-check-circle', 'order_index': 5, 'is_finished': False, 'allowed_next_statuses': ['ready_for_printing', 'has_comments', 'on_hold', 'cancelled']},
    {'id': 'ready_for_printing', 'label': 'جاهز للطباعة', 'color': 'green', 'icon': 'fa-solid fa-box-open', 'order_index': 6, 'is_finished': False, 'allowed_next_statuses': ['in_printing', 'on_hold', 'cancelled']},
    {'id': 'in_printing', 'label': 'جاري الطباعة', 'color': 'teal', 'icon': 'fa-solid fa-print', 'order_index': 7, 'is_finished': False, 'allowed_next_statuses': ['ready_for_delivery', 'on_hold', 'cancelled']},
    {'id': 'ready_for_delivery', 'label': 'جاهز للتسليم', 'color': 'lime', 'icon': 'fa-solid fa-truck', 'order_index': 8, 'is_finished': False, 'allowed_next_statuses': ['delivered', 'on_hold', 'cancelled']},
    {'id': 'on_hold', 'label': 'معلق', 'color': 'slate', 'icon': 'fa-solid fa-pause-circle', 'order_index': 9, 'is_finished': False, 'allowed_next_statuses': []},
    {'id': 'delivered', 'label': 'تم التسليم', 'color': 'emerald', 'icon': 'fa-solid fa-flag-checkered', 'order_index': 10, 'is_finished': True, 'allowed_next_statuses': []},
    {'id': 'cancelled', 'label': 'ملغي', 'color': 'red', 'icon': 'fa-solid fa-ban', 'order_index': 11, 'is_finished': True, 'is_cancelled': True, 'allowed_next_statuses': []},
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
        Updates existing tasks to use default status if their current status is deleted.
        """
        from tasks.models import Task
        from django.db import connection
        
        # Get default status ID
        default_status_id = 'pending'
        
        # First, create the default 'Pending' status if it doesn't exist
        pending_status, created = TaskStatus.objects.get_or_create(
            id=default_status_id,
            defaults={
                'label': 'قيد الانتظار',
                'color': 'slate',
                'icon': 'fa-regular fa-clock',
                'order_index': 0,
                'is_finished': False,
                'is_default': True,
                'allowed_next_statuses': ['in_design', 'on_hold', 'cancelled']
            }
        )
        
        # Update all tasks to use the Pending status
        Task.objects.all().update(status_id=default_status_id)
        
        # Delete all statuses except Pending using raw SQL to bypass PROTECT
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM task_statuses WHERE id != %s", [default_status_id])
        
        # Now create all default statuses (skip Pending if already exists)
        for status_data in DEFAULT_STATUSES:
            if status_data['id'] != default_status_id:
                TaskStatus.objects.create(**status_data)
            elif not created:
                # Update existing Pending status
                for key, value in status_data.items():
                    if key != 'id':
                        setattr(pending_status, key, value)
                pending_status.save()
        
        # Return the new statuses
        statuses = TaskStatus.objects.all().order_by('order_index')
        serializer = self.get_serializer(statuses, many=True)
        
        return Response({
            'message': 'تم إعادة تعيين الحالات بنجاح',
            'statuses': serializer.data
        }, status=status.HTTP_200_OK)
