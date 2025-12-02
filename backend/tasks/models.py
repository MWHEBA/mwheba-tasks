from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class Attachment(models.Model):
    """Model representing a file attachment for a task"""
    id = models.CharField(max_length=50, primary_key=True)
    task = models.ForeignKey('Task', on_delete=models.CASCADE, related_name='attachments', db_column='task_id')
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=100)
    file = models.FileField(upload_to='attachments/%Y/%m/%d/')
    size = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'attachments'
        managed = True
    
    def __str__(self):
        return self.name


class Comment(models.Model):
    """Model representing a comment on a task"""
    id = models.CharField(max_length=50, primary_key=True)
    task = models.ForeignKey('Task', on_delete=models.CASCADE, related_name='comments', db_column='task_id')
    parent_comment = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='replies',
        db_column='parent_comment_id'
    )
    text = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.BigIntegerField()
    
    class Meta:
        db_table = 'comments'
        managed = True
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment on {self.task.title}"


class ActivityLog(models.Model):
    """Model representing an activity log entry for a task"""
    id = models.CharField(max_length=50, primary_key=True)
    task = models.ForeignKey('Task', on_delete=models.CASCADE, related_name='activity_logs', db_column='task_id')
    timestamp = models.BigIntegerField()
    type = models.CharField(max_length=50)
    description = models.TextField()
    details = models.JSONField(null=True, blank=True)
    
    class Meta:
        db_table = 'activity_logs'
        managed = True
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.type} - {self.task.title}"


class Task(models.Model):
    """Model representing a task in the printing management system"""
    URGENCY_CHOICES = [
        ('Critical', 'Critical'),
        ('Urgent', 'Urgent'),
        ('Normal', 'Normal'),
    ]
    
    PRINTING_TYPE_CHOICES = [
        ('Offset', 'Offset'),
        ('Digital', 'Digital'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES)
    status = models.ForeignKey('statuses.TaskStatus', on_delete=models.PROTECT, db_column='status', to_field='id')
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, db_column='client_id')
    parent = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='subtasks',
        db_column='parent_id'
    )
    order_index = models.IntegerField()
    printing_type = models.CharField(max_length=20, choices=PRINTING_TYPE_CHOICES, blank=True, null=True)
    size = models.CharField(max_length=100, blank=True, null=True)
    is_vip = models.BooleanField(default=False)
    deadline = models.BigIntegerField(null=True, blank=True)
    created_at = models.BigIntegerField()
    
    class Meta:
        db_table = 'tasks'
        managed = True
        ordering = ['order_index']
        indexes = [
            models.Index(fields=['client_id'], name='idx_task_client'),
            models.Index(fields=['status'], name='idx_task_status'),
            models.Index(fields=['parent_id'], name='idx_task_parent'),
            models.Index(fields=['deadline'], name='idx_task_deadline'),
            models.Index(fields=['urgency'], name='idx_task_urgency'),
            models.Index(fields=['order_index'], name='idx_task_order'),
        ]
    
    def __str__(self):
        return self.title



@receiver(post_save, sender=Task)
def update_parent_status_on_subtask_change(sender, instance, created, **kwargs):
    """
    Signal handler to update parent task status when a subtask status changes.
    
    When a subtask's status changes, the parent task's status should be updated
    to reflect the earliest (lowest order_index) status among all its subtasks.
    
    Special handling for "Has Comments" status - it should not be overridden
    by subtask status changes.
    """
    # Only process if this is a subtask (has a parent) and not a new creation
    if not created and instance.parent:
        parent = instance.parent
        
        # Get all subtasks of the parent
        subtasks = parent.subtasks.all()
        
        if subtasks.exists():
            # Get the status with the lowest order_index among all subtasks
            # This represents the "earliest" status in the workflow
            earliest_status = None
            min_order_index = float('inf')
            
            for subtask in subtasks:
                if subtask.status.order_index < min_order_index:
                    min_order_index = subtask.status.order_index
                    earliest_status = subtask.status
            
            # Check if parent has "Has Comments" status
            # If so, don't override it unless all subtasks are further along
            if earliest_status and parent.status.id != 'has-comments':
                # Update parent status to the earliest subtask status
                if parent.status != earliest_status:
                    parent.status = earliest_status
                    parent.save()
