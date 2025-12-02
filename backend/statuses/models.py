from django.db import models
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class TaskStatus(models.Model):
    """Model representing task status in the workflow"""
    id = models.CharField(max_length=50, primary_key=True, default=generate_uuid)
    label = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=20)
    icon = models.CharField(max_length=50)
    order_index = models.IntegerField()
    is_finished = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)
    is_cancelled = models.BooleanField(default=False)
    allowed_next_statuses = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'task_statuses'
        managed = True
        ordering = ['order_index']
    
    def __str__(self):
        return self.label
