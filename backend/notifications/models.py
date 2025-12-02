"""
Models for the notifications app.

This module contains the NotificationLog model for tracking all notification
attempts, successes, and failures.
"""

from django.db import models


class NotificationLog(models.Model):
    """
    Model for logging notification attempts and results.
    
    This model tracks all notification attempts including:
    - Which task triggered the notification
    - Recipient phone number
    - Message content
    - Template type used
    - Success/failure status
    - Error messages if failed
    """
    
    id = models.CharField(max_length=50, primary_key=True)
    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='notifications',
        db_column='task_id'
    )
    recipient_number = models.CharField(max_length=20)
    message = models.TextField()
    template_type = models.CharField(max_length=50)
    sent_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'notification_logs'
        managed = True
        ordering = ['-sent_at']
    
    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{self.template_type} to {self.recipient_number} - {status}"
