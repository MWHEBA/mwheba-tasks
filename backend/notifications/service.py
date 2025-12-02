"""
Notification Service for sending WhatsApp notifications via CallMeBot API.

This service handles sending notifications to WhatsApp numbers, rendering
notification templates with placeholders, and logging notification attempts.
"""

import logging
import time
import requests
from typing import List, Dict, Optional
from django.conf import settings


logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service for sending WhatsApp notifications via CallMeBot API.
    
    This service provides methods for:
    - Sending notifications to single recipients
    - Sending notifications to multiple recipients (groups)
    - Rendering notification templates with context placeholders
    - Smart filtering based on user roles and actions
    - Error handling and retry logic
    """
    
    # CallMeBot API endpoint
    CALLMEBOT_API_URL = "https://api.callmebot.com/whatsapp.php"
    
    # Role-based notification preferences
    # Defines which notification types each role should receive
    ROLE_NOTIFICATION_PREFERENCES = {
        'designer': [
            'NEW_PROJECT',
            'NEW_SUBTASK',
            'STATUS_CHANGE',  # Only designer-relevant statuses (see ROLE_RELEVANT_STATUSES)
            'COMMENT_ADDED',
            'REPLY_ADDED',
            'COMMENT_RESOLVED',
            'ATTACHMENT_ADDED',
        ],
        'print_manager': [
            'STATUS_CHANGE',  # Only printing-related statuses (see ROLE_RELEVANT_STATUSES)
            'SUBTASK_UPDATE',
            'SUBTASK_SPECS_UPDATE',
            'COMMENT_ADDED',
            'ATTACHMENT_ADDED',
        ],
        'admin': [
            'NEW_PROJECT',
            'NEW_SUBTASK',
            'STATUS_CHANGE',  # Only admin-relevant statuses (see ROLE_RELEVANT_STATUSES)
            'COMMENT_ADDED',
            'SUBTASK_UPDATE',
            'ATTACHMENT_ADDED',
        ],
    }
    
    # Status changes relevant to each role
    # Designer: Only statuses that require their action or affect their work
    # Print Manager: Only printing/production-related statuses
    # Admin: Only final/critical statuses for business tracking
    ROLE_RELEVANT_STATUSES = {
        'designer': [
            'Has Comments',       # ⚠️ Needs to make edits (CRITICAL)
            'Awaiting Materials', # ⏸️ Waiting for materials from client
            'On Hold',            # ⏸️ Project paused
            'Cancelled',          # ❌ Project cancelled
        ],
        'print_manager': [
            'Design Completed',   # ✅ Design ready - can start montage
            'Ready for Montage',  # 🎬 Ready to start montage
            'In Montage',         # 🎬 Montage in progress
            'Montage Completed',  # ✅ Montage done - ready for printing
            'In Printing',        # 🖨️ Printing in progress
            'Ready for Delivery', # 📦 Ready to deliver
        ],
        'admin': [
            'Ready for Delivery', # 📦 Coordinate delivery with client
            'Delivered',          # ✅ For invoicing and payment
            'Cancelled',          # ❌ Financial tracking
            'On Hold',            # ⏸️ Project tracking
        ],
    }
    
    # Default notification templates
    # Keys match Frontend NotificationTemplateType enum
    DEFAULT_TEMPLATES = {
        'NEW_PROJECT': '🆕 *مشروع جديد*\n\n📌 المشروع: {taskTitle}\n👤 العميل: {clientName}\n🔢 كود العميل: {clientCode}\n📊 الحالة: {status}\n⚡ الأولوية: {urgency}',
        'NEW_SUBTASK': '➕ *بند جديد*\n\n📋 البند: {taskTitle}\n👤 العميل: {clientName}\n🔢 كود العميل: {clientCode}\n📊 الحالة: {status}',
        'SUBTASK_UPDATE': '✏️ *تعديل بند*\n\n📋 البند: {taskTitle}\n👤 العميل: {clientName}\n🔢 كود العميل: {clientCode}\n📏 المقاس: {size}\n🖨️ نوع الطباعة: {printingType}',
        'SUBTASK_SPECS_UPDATE': '⚙️ *تعديل مواصفات*\n\n📋 البند: {taskTitle}\n👤 العميل: {clientName}\n🔢 كود العميل: {clientCode}\n📏 المقاس: {size}\n🖨️ نوع الطباعة: {printingType}',
        'STATUS_CHANGE': '🔄 *تحديث الحالة*\n\n📋 البند: {taskTitle}\n👤 العميل: {clientName}\n🔢 كود العميل: {clientCode}\n✅ {statusMessage}\n📊 الحالة السابقة: {oldStatus}\n📊 الحالة الجديدة: {newStatus}',
        'COMMENT_ADDED': '💬 *ملاحظة جديدة*\n\n📋 {taskLabel}: {taskTitle}\n👤 العميل: {clientName}\n🔢 كود العميل: {clientCode}\n📝 الملاحظة: {commentText}\n🔢 عدد الملاحظات: {commentCount}',
        'REPLY_ADDED': '↩️ *رد جديد*\n\n📋 {taskLabel}: {taskTitle}\n👤 العميل: {clientName}\n🔢 كود العميل: {clientCode}\n💬 الرد: {commentText}',
        'COMMENT_RESOLVED': '✅ *تم حل الملاحظة*\n\n📋 {taskLabel}: {taskTitle}\n👤 العميل: {clientName}\n🔢 كود العميل: {clientCode}\n🎉 تم حل الملاحظة بنجاح',
        'ATTACHMENT_ADDED': '📎 *مرفقات جديدة*\n\n📋 {taskLabel}: {taskTitle}\n👤 العميل: {clientName}\n🔢 كود العميل: {clientCode}\n📁 عدد المرفقات: {attachmentCount}\n📄 الملفات: {attachmentNames}',
    }
    
    # Required placeholders for each template type
    REQUIRED_PLACEHOLDERS = {
        'NEW_PROJECT': ['taskTitle', 'clientName', 'clientCode', 'status', 'urgency'],
        'NEW_SUBTASK': ['taskTitle', 'clientName', 'clientCode', 'status'],
        'SUBTASK_UPDATE': ['taskTitle', 'clientName', 'clientCode', 'size', 'printingType'],
        'SUBTASK_SPECS_UPDATE': ['taskTitle', 'clientName', 'clientCode', 'size', 'printingType'],
        'STATUS_CHANGE': ['taskTitle', 'clientName', 'clientCode', 'statusMessage', 'oldStatus', 'newStatus'],
        'COMMENT_ADDED': ['taskTitle', 'clientName', 'clientCode', 'taskLabel', 'commentText', 'commentCount'],
        'REPLY_ADDED': ['taskTitle', 'clientName', 'clientCode', 'taskLabel', 'commentText'],
        'COMMENT_RESOLVED': ['taskTitle', 'clientName', 'clientCode', 'taskLabel'],
        'ATTACHMENT_ADDED': ['taskTitle', 'clientName', 'clientCode', 'taskLabel', 'attachmentCount', 'attachmentNames'],
    }
    
    @staticmethod
    def send_notification(phone_number: str, api_key: str, message: str, retry_count: int = 2, template_type: str = None) -> bool:
        """
        Send notification to a single WhatsApp number.
        
        Args:
            phone_number: WhatsApp phone number (international format without +)
            api_key: CallMeBot API key for the phone number
            message: Message text to send
            retry_count: Number of retry attempts on failure (default: 2)
            template_type: Type of notification template (for logging)
            
        Returns:
            bool: True if notification sent successfully, False otherwise
            
        Requirements: 9.3
        """
        if not phone_number or not api_key or not message:
            logger.error(
                "Missing required parameters for notification",
                extra={
                    'recipient': phone_number,
                    'template_type': template_type,
                    'success': False,
                    'error': 'Missing required parameters'
                }
            )
            return False
        
        # Prepare request parameters
        params = {
            'phone': phone_number,
            'apikey': api_key,
            'text': message
        }
        
        # Attempt to send with retries
        for attempt in range(retry_count + 1):
            try:
                logger.info(
                    f"Attempting to send notification",
                    extra={
                        'recipient': phone_number,
                        'template_type': template_type,
                        'attempt': attempt + 1,
                        'max_attempts': retry_count + 1,
                        'message_length': len(message)
                    }
                )
                
                response = requests.get(
                    NotificationService.CALLMEBOT_API_URL,
                    params=params,
                    timeout=10
                )
                
                if response.status_code == 200:
                    # Log successful notification with all details
                    logger.info(
                        "Notification sent successfully",
                        extra={
                            'recipient': phone_number,
                            'template_type': template_type,
                            'success': True,
                            'attempt': attempt + 1,
                            'status_code': response.status_code
                        }
                    )
                    return True
                else:
                    # Log failed attempt with details
                    logger.warning(
                        f"Failed to send notification",
                        extra={
                            'recipient': phone_number,
                            'template_type': template_type,
                            'success': False,
                            'attempt': attempt + 1,
                            'status_code': response.status_code,
                            'response_text': response.text[:200]  # Limit response text
                        }
                    )
                    
            except requests.exceptions.Timeout:
                logger.error(
                    "Timeout sending notification",
                    extra={
                        'recipient': phone_number,
                        'template_type': template_type,
                        'success': False,
                        'attempt': attempt + 1,
                        'error': 'Request timeout'
                    }
                )
            except requests.exceptions.RequestException as e:
                logger.error(
                    "Request error sending notification",
                    extra={
                        'recipient': phone_number,
                        'template_type': template_type,
                        'success': False,
                        'attempt': attempt + 1,
                        'error': str(e)
                    }
                )
            except Exception as e:
                logger.error(
                    "Unexpected error sending notification",
                    extra={
                        'recipient': phone_number,
                        'template_type': template_type,
                        'success': False,
                        'attempt': attempt + 1,
                        'error': str(e)
                    },
                    exc_info=True
                )
            
            # Wait before retry (exponential backoff)
            if attempt < retry_count:
                wait_time = 2 ** attempt  # 1s, 2s, 4s...
                logger.info(f"Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
        
        # Log final failure after all retries
        logger.error(
            "Failed to send notification after all retries",
            extra={
                'recipient': phone_number,
                'template_type': template_type,
                'success': False,
                'total_attempts': retry_count + 1
            }
        )
        return False
    
    @staticmethod
    def send_to_groups(groups: List[Dict[str, str]], message: str, template_type: str = None) -> Dict[str, bool]:
        """
        Send notification to multiple WhatsApp numbers.
        
        Args:
            groups: List of dicts with 'phone' and 'apiKey' keys
            message: Message text to send
            template_type: Type of notification template (for logging)
            
        Returns:
            dict: Dictionary mapping phone numbers to success status
            
        Requirements: 9.3
        """
        if not groups or not message:
            logger.warning(
                "No groups or message provided for notification",
                extra={
                    'template_type': template_type,
                    'groups_count': len(groups) if groups else 0
                }
            )
            return {}
        
        logger.info(
            "Starting batch notification send",
            extra={
                'template_type': template_type,
                'recipient_count': len(groups),
                'message_length': len(message)
            }
        )
        
        results = {}
        
        for group in groups:
            # Support both 'phone' and 'number' keys for backward compatibility
            phone = group.get('phone', '') or group.get('number', '')
            api_key = group.get('apiKey', '')
            
            if not phone or not api_key:
                logger.warning(
                    "Skipping group with missing phone or apiKey",
                    extra={
                        'template_type': template_type,
                        'phone': phone,
                        'has_api_key': bool(api_key)
                    }
                )
                results[phone] = False
                continue
            
            success = NotificationService.send_notification(phone, api_key, message, template_type=template_type)
            results[phone] = success
        
        # Log summary with detailed statistics
        successful = sum(1 for success in results.values() if success)
        failed = len(results) - successful
        total = len(results)
        
        logger.info(
            "Batch notification send completed",
            extra={
                'template_type': template_type,
                'total_recipients': total,
                'successful': successful,
                'failed': failed,
                'success_rate': f"{(successful/total*100):.1f}%" if total > 0 else "0%"
            }
        )
        
        return results
    
    @staticmethod
    def render_template(template_type: str, context: Dict[str, any], custom_templates: Optional[Dict[str, str]] = None) -> str:
        """
        Render notification message from template with context placeholders.
        
        Args:
            template_type: Type of template (task_created, status_changed, etc.)
            context: Dictionary of placeholder values
            custom_templates: Optional custom templates to use instead of defaults
            
        Returns:
            str: Rendered message with placeholders replaced
            
        Raises:
            ValueError: If template type is invalid or required placeholders are missing
        """
        # Get template (custom or default)
        templates = custom_templates if custom_templates else NotificationService.DEFAULT_TEMPLATES
        
        if template_type not in templates:
            raise ValueError(f"Invalid template type: {template_type}")
        
        template = templates[template_type]
        
        # Validate required placeholders
        required = NotificationService.REQUIRED_PLACEHOLDERS.get(template_type, [])
        missing = [key for key in required if key not in context]
        
        if missing:
            raise ValueError(f"Missing required placeholders for {template_type}: {', '.join(missing)}")
        
        # Render template
        try:
            message = template.format(**context)
            return message
        except KeyError as e:
            raise ValueError(f"Template contains undefined placeholder: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error rendering template: {str(e)}")
    
    @staticmethod
    def validate_template(template: str, template_type: str) -> bool:
        """
        Validate that a template contains all required placeholders.
        
        Args:
            template: Template string to validate
            template_type: Type of template (task_created, status_changed, etc.)
            
        Returns:
            bool: True if template is valid, False otherwise
        """
        if template_type not in NotificationService.REQUIRED_PLACEHOLDERS:
            logger.warning(f"Unknown template type: {template_type}")
            return False
        
        required = NotificationService.REQUIRED_PLACEHOLDERS[template_type]
        
        # Check if all required placeholders are present
        for placeholder in required:
            if f'{{{placeholder}}}' not in template:
                logger.error(f"Template missing required placeholder: {placeholder}")
                return False
        
        return True
    
    @staticmethod
    def get_settings():
        """
        Get notification settings from UnifiedSettings model.
        
        Returns:
            tuple: (whatsapp_numbers, notifications_enabled, notification_templates)
        """
        try:
            from settings.models import UnifiedSettings
            
            settings_obj = UnifiedSettings.objects.filter(id=1).first()
            
            if not settings_obj:
                logger.warning("No UnifiedSettings found, using defaults")
                return [], False, None
            
            return (
                settings_obj.whatsapp_numbers or [],
                settings_obj.notifications_enabled,
                settings_obj.notification_templates
            )
        except Exception as e:
            logger.error(f"Error fetching notification settings: {str(e)}")
            return [], False, None
    
    @staticmethod
    def should_send_to_role(template_type: str, role: str, context: Dict[str, any] = None) -> bool:
        """
        Determine if a notification should be sent to a specific role.
        
        Args:
            template_type: Type of notification template
            role: User role (designer, print_manager, admin)
            context: Optional context data for additional filtering
            
        Returns:
            bool: True if notification should be sent to this role
        """
        # Check if this template type is relevant to the role
        if template_type not in NotificationService.ROLE_NOTIFICATION_PREFERENCES.get(role, []):
            return False
        
        # Additional filtering for STATUS_CHANGE notifications
        if template_type == 'STATUS_CHANGE' and context:
            new_status = context.get('newStatus', '')
            relevant_statuses = NotificationService.ROLE_RELEVANT_STATUSES.get(role, [])
            
            # For designers and print_managers, only send if status is relevant
            if role in ['designer', 'print_manager']:
                return new_status in relevant_statuses
            
            # Admins get all status changes
            return True
        
        return True
    
    @staticmethod
    def should_exclude_action_creator(recipient: Dict[str, str], context: Dict[str, any]) -> bool:
        """
        Check if recipient should be excluded because they created the action.
        
        Args:
            recipient: Recipient dict with phone, apiKey, role, and optional userId
            context: Context data with optional created_by_user_id or created_by_phone
            
        Returns:
            bool: True if recipient should be excluded (they created the action)
        """
        # Check if context has creator information
        created_by_user_id = context.get('created_by_user_id')
        created_by_phone = context.get('created_by_phone')
        
        # If no creator info, don't exclude anyone
        if not created_by_user_id and not created_by_phone:
            return False
        
        # Check if recipient matches creator by user ID
        recipient_user_id = recipient.get('userId')
        if created_by_user_id and recipient_user_id:
            if str(created_by_user_id) == str(recipient_user_id):
                logger.debug(
                    "Excluding action creator by user ID",
                    extra={
                        'user_id': recipient_user_id,
                        'phone': recipient.get('phone', '')
                    }
                )
                return True
        
        # Check if recipient matches creator by phone number
        recipient_phone = recipient.get('phone', '').replace(' ', '').replace('+', '')
        if created_by_phone:
            creator_phone = str(created_by_phone).replace(' ', '').replace('+', '')
            if recipient_phone == creator_phone:
                logger.debug(
                    "Excluding action creator by phone",
                    extra={
                        'phone': recipient_phone
                    }
                )
                return True
        
        return False
    
    @staticmethod
    def check_user_preferences(recipient: Dict[str, str], template_type: str, context: Dict[str, any] = None) -> bool:
        """
        Check if user has enabled this notification type in their preferences.
        Supports both general notifications and status-specific notifications.
        
        Args:
            recipient: Recipient dict with optional 'preferences' key
            template_type: Type of notification template
            context: Optional context with status information
            
        Returns:
            bool: True if user wants to receive this notification type
        """
        # Get user preferences (if any)
        preferences = recipient.get('preferences', {})
        
        # If no preferences set, default to True (send all notifications)
        if not preferences or not isinstance(preferences, dict):
            return True
        
        # For STATUS_CHANGE notifications, check status-specific preference
        if template_type == 'STATUS_CHANGE' and context:
            new_status = context.get('newStatus')
            if new_status:
                # Check for status-specific preference: STATUS_{statusId}
                status_key = f'STATUS_{new_status}'
                if status_key in preferences:
                    return preferences.get(status_key, True)
                
                # Fallback to general STATUS_CHANGE preference
                return preferences.get('STATUS_CHANGE', True)
        
        # Check if this template type is enabled in preferences
        # Default to True if not specified
        return preferences.get(template_type, True)
    
    @staticmethod
    def filter_recipients_by_role(template_type: str, recipients: List[Dict[str, str]], context: Dict[str, any] = None) -> List[Dict[str, str]]:
        """
        Filter recipients based on their roles, preferences, and action creator.
        
        Args:
            template_type: Type of notification template
            recipients: List of recipient dicts with 'phone', 'apiKey', 'role', and optional 'userId', 'preferences'
            context: Optional context data for filtering (includes created_by info)
            
        Returns:
            List of filtered recipients who should receive this notification
        """
        filtered = []
        context = context or {}
        
        for recipient in recipients:
            role = recipient.get('role', 'admin')  # Default to admin if no role
            
            # Check 1: Role-based filtering
            if not NotificationService.should_send_to_role(template_type, role, context):
                logger.debug(
                    f"Excluding recipient - role not relevant",
                    extra={
                        'template_type': template_type,
                        'role': role,
                        'phone': recipient.get('phone', '')
                    }
                )
                continue
            
            # Check 2: Don't send to action creator
            if NotificationService.should_exclude_action_creator(recipient, context):
                logger.debug(
                    f"Excluding recipient - action creator",
                    extra={
                        'template_type': template_type,
                        'phone': recipient.get('phone', '')
                    }
                )
                continue
            
            # Check 3: User preferences (including status-specific)
            if not NotificationService.check_user_preferences(recipient, template_type, context):
                logger.debug(
                    f"Excluding recipient - disabled in preferences",
                    extra={
                        'template_type': template_type,
                        'phone': recipient.get('phone', ''),
                        'status': context.get('newStatus') if template_type == 'STATUS_CHANGE' else None
                    }
                )
                continue
            
            # All checks passed - include recipient
            filtered.append(recipient)
            logger.debug(
                f"Including recipient",
                extra={
                    'template_type': template_type,
                    'role': role,
                    'phone': recipient.get('phone', '')
                }
            )
        
        return filtered
    
    @staticmethod
    def send_task_notification(template_type: str, context: Dict[str, any]) -> bool:
        """
        Send a task-related notification to all configured WhatsApp numbers.
        
        This is a convenience method that:
        1. Checks if notifications are enabled
        2. Gets WhatsApp numbers from settings
        3. Renders the template
        4. Sends to all recipients
        5. Logs the results
        
        Args:
            template_type: Type of notification template
            context: Context data for template rendering
            
        Returns:
            bool: True if at least one notification was sent successfully
            
        Requirements: 9.3
        """
        logger.info(
            "Starting task notification process",
            extra={
                'template_type': template_type,
                'context_keys': list(context.keys())
            }
        )
        
        # Get settings
        whatsapp_numbers, notifications_enabled, custom_templates = NotificationService.get_settings()
        
        # Check if notifications are enabled
        if not notifications_enabled:
            logger.info(
                "Notifications are disabled, skipping",
                extra={
                    'template_type': template_type,
                    'success': False,
                    'reason': 'notifications_disabled'
                }
            )
            return False
        
        # Check if there are recipients
        if not whatsapp_numbers:
            logger.warning(
                "No WhatsApp numbers configured, skipping notification",
                extra={
                    'template_type': template_type,
                    'success': False,
                    'reason': 'no_recipients'
                }
            )
            return False
        
        try:
            # Filter recipients based on roles and notification preferences
            filtered_recipients = NotificationService.filter_recipients_by_role(
                template_type, 
                whatsapp_numbers, 
                context
            )
            
            if not filtered_recipients:
                logger.info(
                    "No recipients after role filtering",
                    extra={
                        'template_type': template_type,
                        'original_count': len(whatsapp_numbers),
                        'filtered_count': 0
                    }
                )
                return False
            
            logger.info(
                "Recipients filtered by role",
                extra={
                    'template_type': template_type,
                    'original_count': len(whatsapp_numbers),
                    'filtered_count': len(filtered_recipients)
                }
            )
            
            # Render message
            message = NotificationService.render_template(template_type, context, custom_templates)
            
            logger.info(
                "Template rendered successfully",
                extra={
                    'template_type': template_type,
                    'message_length': len(message),
                    'recipient_count': len(filtered_recipients)
                }
            )
            
            # Send to filtered recipients
            results = NotificationService.send_to_groups(filtered_recipients, message, template_type)
            
            # Determine overall success
            success = any(results.values())
            
            # Log final result
            logger.info(
                "Task notification process completed",
                extra={
                    'template_type': template_type,
                    'success': success,
                    'total_recipients': len(results),
                    'successful_sends': sum(1 for v in results.values() if v)
                }
            )
            
            return success
            
        except ValueError as e:
            logger.error(
                "Error rendering notification template",
                extra={
                    'template_type': template_type,
                    'success': False,
                    'error': str(e)
                }
            )
            return False
        except Exception as e:
            logger.error(
                "Unexpected error sending task notification",
                extra={
                    'template_type': template_type,
                    'success': False,
                    'error': str(e)
                },
                exc_info=True
            )
            return False
