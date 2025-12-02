"""
Views for the tasks app.
"""
import uuid
import time
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from statuses.models import TaskStatus
from permissions import CanCreateTask, CanDeleteTask
from backend.utils import get_current_timestamp_ms
from .models import Task, Comment, ActivityLog
from .serializers import TaskSerializer, CommentSerializer


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Task model.
    Provides CRUD operations for tasks with nested data.
    Uses select_related and prefetch_related for optimized queries.
    
    Permissions:
    - Admin and Designer: Can create and edit tasks
    - Print Manager: Can view and update status, but cannot create
    - Only Admin: Can delete tasks
    """
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [CanCreateTask, CanDeleteTask]
    
    def get_queryset(self):
        """
        Get queryset with optimized queries using select_related and prefetch_related.
        This reduces the number of database queries when fetching related data.
        """
        return Task.objects.select_related(
            'client',
            'status',
            'parent'
        ).prefetch_related(
            'attachments',
            'comments__replies',
            'activity_logs'
        ).order_by('order_index')
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        POST /api/tasks/:id/update_status
        
        Update task status and create activity log entry.
        
        Request body:
        {
            "statusId": "new-status-id"
        }
        """
        task = self.get_object()
        
        # Get new status ID from request
        new_status_id = request.data.get('statusId') or request.data.get('status_id')
        
        if not new_status_id:
            return Response(
                {'error': 'Status ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the new status
        try:
            new_status = TaskStatus.objects.get(id=new_status_id)
        except TaskStatus.DoesNotExist:
            return Response(
                {'error': f'Status with id {new_status_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Store old status for activity log
        old_status = task.status
        
        # Update task status
        task.status = new_status
        task.save()
        
        # Create activity log entry
        ActivityLog.objects.create(
            id=str(uuid.uuid4()),
            task=task,
            timestamp=get_current_timestamp_ms(),
            type='statusChange',
            description=f'تم تغيير الحالة من "{old_status.label}" إلى "{new_status.label}"',
            details={
                'oldStatus': old_status.id,
                'oldStatusLabel': old_status.label,
                'newStatus': new_status.id,
                'newStatusLabel': new_status.label
            }
        )
        
        # Serialize and return the updated task
        serializer = self.get_serializer(task)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='comments')
    def add_comment(self, request, pk=None):
        """
        POST /api/tasks/:id/comments
        
        Add a comment to a task.
        Automatically changes task status to "Has Comments" if available.
        Creates an activity log entry for the comment.
        """
        task = self.get_object()
        
        # Get comment data from request
        text = request.data.get('text')
        parent_comment_id = request.data.get('parentCommentId') or request.data.get('parent_comment_id')
        
        if not text:
            return Response(
                {'error': 'Comment text is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the comment
        comment = Comment.objects.create(
            id=str(uuid.uuid4()),
            task=task,
            parent_comment_id=parent_comment_id,
            text=text,
            is_resolved=False,
            created_at=get_current_timestamp_ms()
        )
        
        # Create activity log entry
        ActivityLog.objects.create(
            id=str(uuid.uuid4()),
            task=task,
            timestamp=get_current_timestamp_ms(),
            type='commentAdded',
            description=f'تم إضافة تعليق',
            details={
                'commentId': comment.id,
                'commentText': text[:100]  # First 100 characters
            }
        )
        
        # Change status to "Has Comments" if available
        try:
            has_comments_status = TaskStatus.objects.get(id='has-comments')
            if task.status != has_comments_status:
                task.status = has_comments_status
                task.save()
        except TaskStatus.DoesNotExist:
            # "Has Comments" status doesn't exist, skip status change
            pass
        
        # Serialize and return the comment
        serializer = CommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], url_path='add_reply')
    def add_reply(self, request, pk=None):
        """
        POST /api/tasks/:id/add_reply
        
        Add a reply to an existing comment.
        Changes task status to "Has Comments" if available.
        """
        task = self.get_object()
        
        # Get reply data from request
        text = request.data.get('text')
        parent_comment_id = request.data.get('parentCommentId') or request.data.get('parent_comment_id')
        
        if not text or not parent_comment_id:
            return Response(
                {'error': 'Reply text and parent comment ID are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify parent comment exists and belongs to this task
        try:
            parent_comment = Comment.objects.get(id=parent_comment_id, task=task)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Parent comment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create the reply
        reply = Comment.objects.create(
            id=str(uuid.uuid4()),
            task=task,
            parent_comment_id=parent_comment_id,
            text=text,
            is_resolved=False,
            created_at=get_current_timestamp_ms()
        )
        
        # Create activity log entry
        ActivityLog.objects.create(
            id=str(uuid.uuid4()),
            task=task,
            timestamp=get_current_timestamp_ms(),
            type='replyAdded',
            description=f'تم إضافة رد على تعليق',
            details={
                'replyId': reply.id,
                'parentCommentId': parent_comment_id,
                'commentText': text[:100]
            }
        )
        
        # Change status to "Has Comments" if available
        try:
            has_comments_status = TaskStatus.objects.get(id='has-comments')
            if task.status != has_comments_status:
                task.status = has_comments_status
                task.save()
        except TaskStatus.DoesNotExist:
            pass
        
        # Serialize and return the reply
        serializer = CommentSerializer(reply)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], url_path='add_attachment')
    def add_attachment(self, request, pk=None):
        """
        POST /api/tasks/:id/add_attachment
        
        Add an attachment to a task.
        Accepts multipart/form-data with file upload.
        
        Request body (multipart/form-data):
        - file: the actual file
        - id: attachment ID (optional, will be generated if not provided)
        
        Validates:
        - File size (max 10MB)
        - File type (JPEG, PNG, PDF, DOCX only)
        - MIME type validation
        """
        task = self.get_object()
        
        # Get file from request
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {'error': 'File is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or generate attachment ID
        attachment_id = request.data.get('id', str(uuid.uuid4()))
        
        # Prepare data for serializer validation
        attachment_data = {
            'id': attachment_id,
            'task': task.id,
            'name': uploaded_file.name,
            'type': uploaded_file.content_type or 'application/octet-stream',
            'file': uploaded_file,
            'size': uploaded_file.size
        }
        
        # Use serializer for validation
        from .serializers import AttachmentSerializer
        serializer = AttachmentSerializer(data=attachment_data, context={'request': request})
        
        # Validate the data (this will run validate_file which checks size and type)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save the attachment (storage path is handled by the model's upload_to)
        attachment = serializer.save()
        
        # Create activity log entry
        ActivityLog.objects.create(
            id=str(uuid.uuid4()),
            task=task,
            timestamp=get_current_timestamp_ms(),
            type='attachmentAdded',
            description='تم إضافة مرفق',
            details={
                'attachmentId': attachment.id,
                'attachmentName': uploaded_file.name,
                'attachmentType': uploaded_file.content_type,
                'attachmentSize': uploaded_file.size
            }
        )
        
        # Return the serialized attachment
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['delete'], url_path='delete_attachment/(?P<attachment_id>[^/.]+)')
    def delete_attachment(self, request, pk=None, attachment_id=None):
        """
        DELETE /api/tasks/:id/delete_attachment/:attachment_id
        
        Delete an attachment from a task.
        This is a hard delete - the file will be removed from disk.
        """
        task = self.get_object()
        
        # Get the attachment
        from .models import Attachment
        try:
            attachment = Attachment.objects.get(id=attachment_id, task=task)
        except Attachment.DoesNotExist:
            return Response(
                {'error': 'Attachment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Store info before deletion
        attachment_name = attachment.name
        attachment_type = attachment.type
        
        # Delete the file from disk
        if attachment.file:
            attachment.file.delete(save=False)
        
        # Delete the attachment record
        attachment.delete()
        
        # Create activity log entry
        ActivityLog.objects.create(
            id=str(uuid.uuid4()),
            task=task,
            timestamp=get_current_timestamp_ms(),
            type='attachmentDeleted',
            description='تم حذف مرفق',
            details={
                'attachmentId': attachment_id,
                'attachmentName': attachment_name,
                'attachmentType': attachment_type
            }
        )
        
        return Response({'message': 'Attachment deleted successfully'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='add_activity')
    def add_activity(self, request, pk=None):
        """
        POST /api/tasks/:id/add_activity
        
        Add an activity log entry to a task.
        
        Request body:
        {
            "type": "CUSTOM_ACTION",
            "description": "Description of the activity",
            "details": {...}  // Optional JSON object
        }
        """
        task = self.get_object()
        
        # Get activity data from request
        activity_type = request.data.get('type')
        description = request.data.get('description')
        details = request.data.get('details')
        
        if not activity_type or not description:
            return Response(
                {'error': 'Activity type and description are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create activity log entry
        activity_log = ActivityLog.objects.create(
            id=str(uuid.uuid4()),
            task=task,
            timestamp=get_current_timestamp_ms(),
            type=activity_type,
            description=description,
            details=details
        )
        
        # Serialize and return the activity log
        from .serializers import ActivityLogSerializer
        serializer = ActivityLogSerializer(activity_log)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """
        GET /api/tasks/:id/progress
        
        Calculate and return the progress of a task based on its subtasks.
        Returns the number of completed subtasks, total subtasks, and percentage.
        """
        task = self.get_object()
        
        # Get all subtasks
        subtasks = task.subtasks.all()
        total = subtasks.count()
        
        if total == 0:
            # No subtasks, return 0% progress
            return Response({
                'completed': 0,
                'total': 0,
                'percentage': 0
            })
        
        # Count completed subtasks (tasks with is_finished status)
        completed = subtasks.filter(status__is_finished=True).count()
        
        # Calculate percentage
        percentage = round((completed / total) * 100, 2)
        
        return Response({
            'completed': completed,
            'total': total,
            'percentage': percentage
        })
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """
        GET /api/tasks/overdue
        
        Get all overdue tasks.
        Returns tasks where deadline < now and status.is_finished = False.
        """
        # Get current timestamp in milliseconds
        now = get_current_timestamp_ms()
        
        # Filter tasks that are overdue and not finished
        overdue_tasks = Task.objects.select_related(
            'client',
            'status',
            'parent'
        ).prefetch_related(
            'attachments',
            'comments__replies',
            'activity_logs'
        ).filter(
            deadline__lt=now,
            status__is_finished=False
        ).order_by('deadline')
        
        # Serialize and return the tasks
        serializer = self.get_serializer(overdue_tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def urgent(self, request):
        """
        GET /api/tasks/urgent
        
        Get all urgent tasks.
        Returns tasks where urgency is 'Critical' or 'Urgent'.
        """
        # Filter tasks with Critical or Urgent urgency
        urgent_tasks = Task.objects.select_related(
            'client',
            'status',
            'parent'
        ).prefetch_related(
            'attachments',
            'comments__replies',
            'activity_logs'
        ).filter(
            urgency__in=['Critical', 'Urgent']
        ).order_by('order_index')
        
        # Serialize and return the tasks
        serializer = self.get_serializer(urgent_tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        POST /api/tasks/reorder
        
        Reorder tasks by updating their order_index.
        Expects a list of task IDs in the desired order.
        
        Request body:
        {
            "taskIds": ["task-1", "task-2", "task-3", ...]
        }
        """
        task_ids = request.data.get('taskIds') or request.data.get('task_ids')
        
        if not task_ids or not isinstance(task_ids, list):
            return Response(
                {'error': 'taskIds array is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update order_index for each task
        for index, task_id in enumerate(task_ids):
            try:
                task = Task.objects.get(id=task_id)
                task.order_index = index
                task.save()
            except Task.DoesNotExist:
                return Response(
                    {'error': f'Task with id {task_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response({
            'message': 'Tasks reordered successfully',
            'count': len(task_ids)
        })



class CommentUpdateView(generics.UpdateAPIView):
    """
    PUT /api/comments/:id/
    
    Update a comment, particularly for resolving comments.
    When all comments on a task are resolved, automatically changes
    the task status to "Editing Completed" if available.
    """
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    
    def update(self, request, *args, **kwargs):
        """
        Update a comment and check if all comments are resolved.
        """
        comment = self.get_object()
        task = comment.task
        
        # Update the comment
        response = super().update(request, *args, **kwargs)
        
        # Check if this comment was just resolved
        is_resolved = request.data.get('isResolved') or request.data.get('is_resolved')
        
        if is_resolved:
            # Create activity log entry
            ActivityLog.objects.create(
                id=str(uuid.uuid4()),
                task=task,
                timestamp=get_current_timestamp_ms(),
                type='commentResolved',
                description=f'تم حل تعليق',
                details={
                    'commentId': comment.id,
                }
            )
            
            # Check if all comments are now resolved
            all_comments = task.comments.all()
            all_resolved = all(c.is_resolved for c in all_comments)
            
            if all_resolved and all_comments.exists():
                # Try to change status to "Editing Completed"
                try:
                    editing_completed_status = TaskStatus.objects.get(id='editing-completed')
                    if task.status != editing_completed_status:
                        task.status = editing_completed_status
                        task.save()
                        
                        # Create activity log for status change
                        ActivityLog.objects.create(
                            id=str(uuid.uuid4()),
                            task=task,
                            timestamp=get_current_timestamp_ms(),
                            type='statusChange',
                            description=f'تم تغيير الحالة إلى: {editing_completed_status.label}',
                            details={
                                'newStatus': editing_completed_status.id,
                                'reason': 'all_comments_resolved'
                            }
                        )
                except TaskStatus.DoesNotExist:
                    # "Editing Completed" status doesn't exist, skip status change
                    pass
        
        return response
