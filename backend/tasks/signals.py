"""
Signal handlers for task-related events.

This module contains signal handlers that trigger notifications when:
- Tasks are created
- Task status changes
- Comments are added or resolved
- Attachments are uploaded
"""

import logging
import uuid
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Task, Comment, Attachment
from notifications.service import NotificationService
from notifications.models import NotificationLog


logger = logging.getLogger(__name__)


# Track original is_resolved state for comments
_comment_original_states = {}


@receiver(pre_save, sender=Task)
def store_original_status(sender, instance, **kwargs):
    """
    Store the original status before saving to detect status changes.
    This runs before the save operation.
    """
    if instance.pk:
        try:
            original = Task.objects.get(pk=instance.pk)
            instance._original_status = original.status
        except Task.DoesNotExist:
            instance._original_status = None
    else:
        instance._original_status = None


@receiver(post_save, sender=Task)
def notify_task_created(sender, instance, created, **kwargs):
    """
    Send notification when a new task is created.
    
    This signal handler is triggered after a Task is saved.
    If it's a new task (created=True), it sends a notification
    to all configured WhatsApp numbers.
    
    Note: Subtasks are ignored - only parent tasks trigger notifications.
    
    Requirements: 3.1
    """
    if not created:
        return
    
    # Skip notifications for subtasks (only notify for parent tasks)
    if instance.parent:
        logger.debug(f"Skipping notification for subtask {instance.id} (parent: {instance.parent.id})")
        return
    
    try:
        # Prepare context for template rendering
        context = {
            'taskTitle': instance.title,
            'clientName': instance.client.name if instance.client else 'غير محدد',
            'clientCode': instance.client.number if instance.client else 'غير محدد',
            'status': instance.status.label if instance.status else 'غير محدد',
            'urgency': instance.urgency or 'Normal',
        }
        
        # Get notification settings
        whatsapp_numbers, notifications_enabled, custom_templates = NotificationService.get_settings()
        
        if not notifications_enabled:
            logger.info(f"Notifications disabled, skipping notification for task {instance.id}")
            return
        
        if not whatsapp_numbers:
            logger.warning(f"No WhatsApp numbers configured, skipping notification for task {instance.id}")
            return
        
        # Render message
        message = NotificationService.render_template('NEW_PROJECT', context, custom_templates)
        
        # Send to all recipients and log each attempt
        for recipient in whatsapp_numbers:
            # Support both 'phone' and 'number' keys for backward compatibility
            phone = recipient.get('phone', '') or recipient.get('number', '')
            api_key = recipient.get('apiKey', '')
            
            if not phone or not api_key:
                continue
            
            success = NotificationService.send_notification(phone, api_key, message)
            
            # Log the notification attempt
            log_id = str(uuid.uuid4())
            NotificationLog.objects.create(
                id=log_id,
                task=instance,
                recipient_number=phone,
                message=message,
                template_type='NEW_PROJECT',
                success=success,
                error_message=None if success else 'Failed to send notification'
            )
            
            logger.info(
                f"Notification logged for task {instance.id} to {phone}: "
                f"{'Success' if success else 'Failed'}"
            )
    
    except Exception as e:
        logger.error(f"Error sending task creation notification for task {instance.id}: {str(e)}")
        # Don't raise the exception - notification failure should not block task creation


@receiver(post_save, sender=Task)
def notify_status_changed(sender, instance, created, **kwargs):
    """
    Send notification when a task status changes.
    
    This signal handler is triggered after a Task is saved.
    If the status has changed (not a new task), it sends a notification
    to all configured WhatsApp numbers.
    
    Note: Subtasks are ignored - only parent tasks trigger notifications.
    
    Requirements: 3.2
    """
    # Skip if this is a new task
    if created:
        return
    
    # Skip notifications for subtasks (only notify for parent tasks)
    if instance.parent:
        logger.debug(f"Skipping status change notification for subtask {instance.id} (parent: {instance.parent.id})")
        return
    
    # Check if status actually changed
    original_status = getattr(instance, '_original_status', None)
    if not original_status or original_status.id == instance.status.id:
        return
    
    try:
        # Prepare context for template rendering
        context = {
            'taskTitle': instance.title,
            'clientName': instance.client.name if instance.client else 'غير محدد',
            'clientCode': instance.client.number if instance.client else 'غير محدد',
            'statusMessage': 'تم تحديث الحالة',
            'oldStatus': original_status.label if original_status else 'غير محدد',
            'newStatus': instance.status.label if instance.status else 'غير محدد',
        }
        
        # Get notification settings
        whatsapp_numbers, notifications_enabled, custom_templates = NotificationService.get_settings()
        
        if not notifications_enabled:
            logger.info(f"Notifications disabled, skipping status change notification for task {instance.id}")
            return
        
        if not whatsapp_numbers:
            logger.warning(f"No WhatsApp numbers configured, skipping status change notification for task {instance.id}")
            return
        
        # Render message
        message = NotificationService.render_template('STATUS_CHANGE', context, custom_templates)
        
        # Send to all recipients and log each attempt
        for recipient in whatsapp_numbers:
            # Support both 'phone' and 'number' keys for backward compatibility
            phone = recipient.get('phone', '') or recipient.get('number', '')
            api_key = recipient.get('apiKey', '')
            
            if not phone or not api_key:
                continue
            
            success = NotificationService.send_notification(phone, api_key, message)
            
            # Log the notification attempt
            log_id = str(uuid.uuid4())
            NotificationLog.objects.create(
                id=log_id,
                task=instance,
                recipient_number=phone,
                message=message,
                template_type='STATUS_CHANGE',
                success=success,
                error_message=None if success else 'Failed to send notification'
            )
            
            logger.info(
                f"Status change notification logged for task {instance.id} to {phone}: "
                f"{'Success' if success else 'Failed'}"
            )
    
    except Exception as e:
        logger.error(f"Error sending status change notification for task {instance.id}: {str(e)}")
        # Don't raise the exception - notification failure should not block status update



@receiver(pre_save, sender=Comment)
def store_original_comment_state(sender, instance, **kwargs):
    """
    Store the original is_resolved state before saving to detect resolution changes.
    This runs before the save operation.
    """
    if instance.pk:
        try:
            original = Comment.objects.get(pk=instance.pk)
            _comment_original_states[instance.pk] = original.is_resolved
        except Comment.DoesNotExist:
            _comment_original_states[instance.pk] = None
    else:
        _comment_original_states[instance.pk] = None


@receiver(post_save, sender=Comment)
def notify_comment_added(sender, instance, created, **kwargs):
    """
    Send notification when a new comment is added to a task.
    
    This signal handler is triggered after a Comment is saved.
    If it's a new comment (created=True), it sends a notification
    to all configured WhatsApp numbers.
    
    Requirements: 3.3
    """
    if not created:
        return
    
    try:
        # Prepare context for template rendering
        task = instance.task
        context = {
            'taskLabel': 'البند' if task.parent else 'المشروع',
            'taskTitle': task.title if task else 'غير محدد',
            'clientName': task.client.name if task and task.client else 'غير محدد',
            'clientCode': task.client.number if task and task.client else 'غير محدد',
            'commentText': instance.text[:100] + ('...' if len(instance.text) > 100 else ''),
            'commentCount': Comment.objects.filter(task=task).count() if task else 0,
        }
        
        # Get notification settings
        whatsapp_numbers, notifications_enabled, custom_templates = NotificationService.get_settings()
        
        if not notifications_enabled:
            logger.info(f"Notifications disabled, skipping notification for comment {instance.id}")
            return
        
        if not whatsapp_numbers:
            logger.warning(f"No WhatsApp numbers configured, skipping notification for comment {instance.id}")
            return
        
        # Render message
        message = NotificationService.render_template('COMMENT_ADDED', context, custom_templates)
        
        # Send to all recipients and log each attempt
        for recipient in whatsapp_numbers:
            # Support both 'phone' and 'number' keys for backward compatibility
            phone = recipient.get('phone', '') or recipient.get('number', '')
            api_key = recipient.get('apiKey', '')
            
            if not phone or not api_key:
                continue
            
            success = NotificationService.send_notification(phone, api_key, message)
            
            # Log the notification attempt
            log_id = str(uuid.uuid4())
            NotificationLog.objects.create(
                id=log_id,
                task=instance.task,
                recipient_number=phone,
                message=message,
                template_type='COMMENT_ADDED',
                success=success,
                error_message=None if success else 'Failed to send notification'
            )
            
            logger.info(
                f"Comment notification logged for task {instance.task.id} to {phone}: "
                f"{'Success' if success else 'Failed'}"
            )
    
    except Exception as e:
        logger.error(f"Error sending comment notification for comment {instance.id}: {str(e)}")
        # Don't raise the exception - notification failure should not block comment creation


@receiver(post_save, sender=Comment)
def notify_comment_resolved(sender, instance, created, **kwargs):
    """
    Send notification when a comment is resolved.
    
    This signal handler is triggered after a Comment is saved.
    If the is_resolved status changed from False to True, it sends a notification
    to all configured WhatsApp numbers.
    
    Requirements: 3.4
    """
    # Skip if this is a new comment
    if created:
        return
    
    # Check if comment was just resolved
    original_resolved = _comment_original_states.get(instance.pk, None)
    if original_resolved is None or original_resolved == instance.is_resolved:
        return
    
    # Only notify if comment was just resolved (False -> True)
    if not instance.is_resolved:
        return
    
    try:
        # Prepare context for template rendering
        context = {
            'taskTitle': instance.task.title if instance.task else 'غير محدد',
            'commentText': instance.text[:100] + ('...' if len(instance.text) > 100 else ''),
        }
        
        # Get notification settings
        whatsapp_numbers, notifications_enabled, custom_templates = NotificationService.get_settings()
        
        if not notifications_enabled:
            logger.info(f"Notifications disabled, skipping resolution notification for comment {instance.id}")
            return
        
        if not whatsapp_numbers:
            logger.warning(f"No WhatsApp numbers configured, skipping resolution notification for comment {instance.id}")
            return
        
        # Render message
        message = NotificationService.render_template('COMMENT_RESOLVED', context, custom_templates)
        
        # Send to all recipients and log each attempt
        for recipient in whatsapp_numbers:
            # Support both 'phone' and 'number' keys for backward compatibility
            phone = recipient.get('phone', '') or recipient.get('number', '')
            api_key = recipient.get('apiKey', '')
            
            if not phone or not api_key:
                continue
            
            success = NotificationService.send_notification(phone, api_key, message)
            
            # Log the notification attempt
            log_id = str(uuid.uuid4())
            NotificationLog.objects.create(
                id=log_id,
                task=instance.task,
                recipient_number=phone,
                message=message,
                template_type='commentResolved',
                success=success,
                error_message=None if success else 'Failed to send notification'
            )
            
            logger.info(
                f"Comment resolution notification logged for task {instance.task.id} to {phone}: "
                f"{'Success' if success else 'Failed'}"
            )
    
    except Exception as e:
        logger.error(f"Error sending comment resolution notification for comment {instance.id}: {str(e)}")
        # Don't raise the exception - notification failure should not block comment resolution
    finally:
        # Clean up the stored state
        if instance.pk in _comment_original_states:
            del _comment_original_states[instance.pk]



@receiver(post_save, sender=Attachment)
def notify_attachment_added(sender, instance, created, **kwargs):
    """
    Send notification when a new attachment is added to a task.
    
    This signal handler is triggered after an Attachment is saved.
    If it's a new attachment (created=True), it sends a notification
    to all configured WhatsApp numbers.
    
    Requirements: 3.5
    """
    if not created:
        return
    
    try:
        # Format file size
        file_size = instance.size
        if file_size < 1024:
            size_str = f"{file_size} بايت"
        elif file_size < 1024 * 1024:
            size_str = f"{file_size / 1024:.1f} كيلوبايت"
        else:
            size_str = f"{file_size / (1024 * 1024):.1f} ميجابايت"
        
        # Prepare context for template rendering
        context = {
            'taskTitle': instance.task.title if instance.task else 'غير محدد',
            'fileName': instance.name,
            'fileSize': size_str,
        }
        
        # Get notification settings
        whatsapp_numbers, notifications_enabled, custom_templates = NotificationService.get_settings()
        
        if not notifications_enabled:
            logger.info(f"Notifications disabled, skipping notification for attachment {instance.id}")
            return
        
        if not whatsapp_numbers:
            logger.warning(f"No WhatsApp numbers configured, skipping notification for attachment {instance.id}")
            return
        
        # Render message
        message = NotificationService.render_template('ATTACHMENT_ADDED', context, custom_templates)
        
        # Send to all recipients and log each attempt
        for recipient in whatsapp_numbers:
            # Support both 'phone' and 'number' keys for backward compatibility
            phone = recipient.get('phone', '') or recipient.get('number', '')
            api_key = recipient.get('apiKey', '')
            
            if not phone or not api_key:
                continue
            
            success = NotificationService.send_notification(phone, api_key, message)
            
            # Log the notification attempt
            log_id = str(uuid.uuid4())
            NotificationLog.objects.create(
                id=log_id,
                task=instance.task,
                recipient_number=phone,
                message=message,
                template_type='attachmentAdded',
                success=success,
                error_message=None if success else 'Failed to send notification'
            )
            
            logger.info(
                f"Attachment notification logged for task {instance.task.id} to {phone}: "
                f"{'Success' if success else 'Failed'}"
            )
    
    except Exception as e:
        logger.error(f"Error sending attachment notification for attachment {instance.id}: {str(e)}")
        # Don't raise the exception - notification failure should not block attachment upload
