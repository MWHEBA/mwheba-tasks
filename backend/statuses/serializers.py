"""
Serializers for the statuses app.
"""
from backend.serializers import CamelCaseSerializer
from .models import TaskStatus


class TaskStatusSerializer(CamelCaseSerializer):
    """
    Serializer for TaskStatus model.
    Converts between snake_case (database) and camelCase (frontend).
    Handles JSONField for allowed_next_statuses.
    """
    
    class Meta:
        model = TaskStatus
        fields = [
            'id',
            'label',
            'color',
            'icon',
            'order_index',
            'is_finished',
            'is_default',
            'is_cancelled',
            'allowed_next_statuses',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
