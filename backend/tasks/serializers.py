"""
Serializers for the tasks app.
"""
import bleach
from rest_framework import serializers as drf_serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from backend.serializers import CamelCaseSerializer
from validators import validate_future_date, validate_file_size, validate_file_type
from clients.serializers import ClientSerializer
from .models import Attachment, Comment, ActivityLog, Task


class AttachmentSerializer(CamelCaseSerializer):
    """
    Serializer for Attachment model.
    Converts between snake_case (database) and camelCase (frontend).
    Includes validation for file size and type.
    """
    url = drf_serializers.SerializerMethodField()
    
    class Meta:
        model = Attachment
        fields = [
            'id',
            'task',
            'name',
            'type',
            'file',
            'url',
            'size',
            'created_at',
        ]
        read_only_fields = ['created_at', 'url']
    
    def get_url(self, obj):
        """Get the full URL for the file"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def validate_file(self, value):
        """
        Validate uploaded file for size and type.
        
        Validates:
        - File size (max 10MB)
        - File MIME type (JPEG, PNG, PDF, DOCX only)
        - File extension matches MIME type
        
        Args:
            value: The uploaded file object
            
        Returns:
            The validated file object
            
        Raises:
            ValidationError: If file size or type validation fails
        """
        try:
            validate_file_size(value)
            validate_file_type(value)
        except DjangoValidationError as e:
            raise drf_serializers.ValidationError(str(e))
        
        return value
    
    def validate(self, attrs):
        """
        Validate the entire attachment data.
        
        Ensures that file size matches the actual uploaded file size.
        """
        file_obj = attrs.get('file')
        if file_obj:
            # Ensure size field matches actual file size
            attrs['size'] = file_obj.size
            
            # Ensure type field matches actual content type
            attrs['type'] = file_obj.content_type or 'application/octet-stream'
            
            # Ensure name field matches actual file name
            if not attrs.get('name'):
                attrs['name'] = file_obj.name
        
        return attrs


class CommentSerializer(CamelCaseSerializer):
    """
    Serializer for Comment model.
    Converts between snake_case (database) and camelCase (frontend).
    Supports recursive serialization for nested replies.
    Includes HTML sanitization to prevent XSS attacks.
    """
    # Recursive field for replies - will be populated with nested comments
    replies = drf_serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = [
            'id',
            'task',
            'parent_comment',
            'text',
            'is_resolved',
            'created_at',
            'replies',
        ]
    
    def get_replies(self, obj):
        """
        Get all replies for this comment.
        Recursively serializes nested comments.
        """
        if obj.replies.exists():
            # Recursively serialize replies
            return CommentSerializer(obj.replies.all(), many=True, context=self.context).data
        return []
    
    def validate_text(self, value):
        """
        Sanitize HTML content in comment text to prevent XSS attacks.
        
        This removes all HTML tags and script content, keeping only plain text.
        This is a security measure to prevent malicious code injection.
        
        Args:
            value: The comment text (may contain HTML)
            
        Returns:
            Sanitized plain text
        """
        if not value:
            return value
        
        # Sanitize HTML - strip all tags and attributes
        # This prevents XSS attacks by removing any HTML/JavaScript
        sanitized = bleach.clean(
            value,
            tags=[],  # Don't allow any HTML tags
            attributes={},  # Don't allow any attributes
            strip=True  # Strip tags instead of escaping them
        )
        
        return sanitized


class ActivityLogSerializer(CamelCaseSerializer):
    """
    Serializer for ActivityLog model.
    Converts between snake_case (database) and camelCase (frontend).
    Handles JSONField for details.
    """
    
    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'task',
            'timestamp',
            'type',
            'description',
            'details',
        ]


class TaskSerializer(CamelCaseSerializer):
    """
    Serializer for Task model.
    Converts between snake_case (database) and camelCase (frontend).
    Includes nested serializers for related data.
    """
    # Nested serializers for read operations
    client = ClientSerializer(read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    comments = drf_serializers.SerializerMethodField()
    activity_logs = ActivityLogSerializer(many=True, read_only=True)
    
    def get_comments(self, obj):
        """
        Get only top-level comments (no parent).
        Replies are nested within their parent comments.
        """
        top_level_comments = obj.comments.filter(parent_comment__isnull=True)
        return CommentSerializer(top_level_comments, many=True, context=self.context).data
    
    # Add parent_id as a read field to return the parent ID in responses
    parent_id_read = drf_serializers.SerializerMethodField()
    
    def get_parent_id_read(self, obj):
        """Return parent ID if exists, otherwise None"""
        return obj.parent.id if obj.parent else None
    
    # Write-only fields for foreign keys using PrimaryKeyRelatedField
    from statuses.models import TaskStatus
    from clients.models import Client as ClientModel
    
    client_id = drf_serializers.PrimaryKeyRelatedField(
        queryset=ClientModel.objects.all(),
        source='client',
        write_only=True,
        required=False
    )
    status_id = drf_serializers.PrimaryKeyRelatedField(
        queryset=TaskStatus.objects.all(),
        source='status',
        write_only=True,
        required=False
    )
    parent_id = drf_serializers.PrimaryKeyRelatedField(
        queryset=Task.objects.all(),
        source='parent',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    # Nested data for write operations
    attachments_data = AttachmentSerializer(many=True, write_only=True, required=False)
    comments_data = CommentSerializer(many=True, write_only=True, required=False)
    activity_logs_data = ActivityLogSerializer(many=True, write_only=True, required=False)
    
    def to_internal_value(self, data):
        """
        Override to handle backward compatibility.
        If 'status', 'client', or 'parent' are sent as strings (IDs),
        convert them to 'statusId', 'clientId', 'parentId'.
        """
        # First convert camelCase to snake_case
        data = self.convert_to_snake_case(data)
        
        # Handle backward compatibility: status -> status_id
        if 'status' in data and isinstance(data['status'], str):
            data['status_id'] = data.pop('status')
        
        # Handle backward compatibility: client -> client_id
        if 'client' in data:
            client_value = data.pop('client')
            if isinstance(client_value, str):
                data['client_id'] = client_value
            elif isinstance(client_value, dict) and 'id' in client_value:
                data['client_id'] = client_value['id']
        
        # Handle backward compatibility: parent -> parent_id
        if 'parent' in data:
            parent_value = data.pop('parent')
            if isinstance(parent_value, str):
                data['parent_id'] = parent_value
            elif parent_value is None:
                data['parent_id'] = None
            elif isinstance(parent_value, dict) and 'id' in parent_value:
                data['parent_id'] = parent_value['id']
        
        return super().to_internal_value(data)
    
    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'urgency',
            'status',
            'status_id',
            'client',
            'client_id',
            'parent',
            'parent_id',
            'parent_id_read',
            'order_index',
            'printing_type',
            'size',
            'is_vip',
            'deadline',
            'created_at',
            'attachments',
            'attachments_data',
            'comments',
            'comments_data',
            'activity_logs',
            'activity_logs_data',
        ]
        extra_kwargs = {
            'status': {'read_only': True, 'required': False},
            'client': {'read_only': True, 'required': False},
            'title': {'max_length': 200, 'required': True, 'allow_blank': False},
        }
    
    def validate_title(self, value):
        """
        Validate task title.
        
        Requirements:
        - Must not be empty (after stripping whitespace)
        - Must not exceed 200 characters
        
        Args:
            value: The title string
            
        Returns:
            The validated title
            
        Raises:
            ValidationError: If title is empty or too long
        """
        if not value or not value.strip():
            raise drf_serializers.ValidationError('Title cannot be empty')
        
        if len(value) > 200:
            raise drf_serializers.ValidationError(
                f'Title cannot exceed 200 characters (current: {len(value)})'
            )
        
        return value.strip()
    
    def validate_deadline(self, value):
        """
        Validate task deadline.
        
        Requirements:
        - Must be in the future (if provided)
        - Expected format: Unix timestamp in milliseconds
        
        Args:
            value: Unix timestamp in milliseconds (or None)
            
        Returns:
            The validated deadline
            
        Raises:
            ValidationError: If deadline is in the past
        """
        if value is not None:
            try:
                validate_future_date(value)
            except DjangoValidationError as e:
                raise drf_serializers.ValidationError(str(e))
        
        return value
    
    def to_representation(self, instance):
        """Override to add parentId field in response and fix activityLogs -> activityLog"""
        data = super().to_representation(instance)
        # Remove parent object and parent_id_read, add parentId instead
        data.pop('parent', None)
        parent_id = data.pop('parentIdRead', None)
        if parent_id:
            data['parentId'] = parent_id
        
        # Fix activityLogs -> activityLog (frontend expects singular)
        if 'activityLogs' in data:
            data['activityLog'] = data.pop('activityLogs')
        
        return data
    

    
    def create(self, validated_data):
        """
        Create a new task with nested data.
        Handles attachments, comments, and activity logs.
        Automatically creates a TASK_CREATED activity log entry.
        """
        import uuid
        from django.utils import timezone
        
        # Extract nested data
        attachments_data = validated_data.pop('attachments_data', [])
        comments_data = validated_data.pop('comments_data', [])
        activity_logs_data = validated_data.pop('activity_logs_data', [])
        
        # Set created_at if not provided (use current time in milliseconds)
        if 'created_at' not in validated_data:
            from backend.utils import get_current_timestamp_ms
            validated_data['created_at'] = get_current_timestamp_ms()
        
        # Create the task
        task = Task.objects.create(**validated_data)
        
        # Create nested attachments
        for attachment_data in attachments_data:
            attachment_data['task'] = task
            Attachment.objects.create(**attachment_data)
        
        # Create nested comments
        for comment_data in comments_data:
            comment_data['task'] = task
            Comment.objects.create(**comment_data)
        
        # Create nested activity logs
        for activity_log_data in activity_logs_data:
            activity_log_data['task'] = task
            ActivityLog.objects.create(**activity_log_data)
        
        # Automatically create TASK_CREATED activity log entry
        from backend.utils import get_current_timestamp_ms
        ActivityLog.objects.create(
            id=str(uuid.uuid4()),
            task=task,
            timestamp=get_current_timestamp_ms(),
            type='taskCreated',
            description=f'تم إنشاء المهمة: {task.title}',
            details={
                'taskId': task.id,
                'title': task.title,
                'urgency': task.urgency,
            }
        )
        
        return task
    
    def update(self, instance, validated_data):
        """
        Update a task with nested data.
        Handles attachments, comments, and activity logs.
        """
        # Extract nested data
        attachments_data = validated_data.pop('attachments_data', [])
        comments_data = validated_data.pop('comments_data', [])
        activity_logs_data = validated_data.pop('activity_logs_data', [])
        
        # Update task fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Create new nested attachments (append to existing)
        for attachment_data in attachments_data:
            attachment_data['task'] = instance
            Attachment.objects.create(**attachment_data)
        
        # Create new nested comments (append to existing)
        for comment_data in comments_data:
            comment_data['task'] = instance
            Comment.objects.create(**comment_data)
        
        # Create new nested activity logs (append to existing)
        for activity_log_data in activity_logs_data:
            activity_log_data['task'] = instance
            ActivityLog.objects.create(**activity_log_data)
        
        return instance
