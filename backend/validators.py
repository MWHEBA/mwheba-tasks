"""
Custom validators for the MWHEBA Tasks system.
Provides validation functions for various input types.
"""
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


def validate_whatsapp_number(value):
    """
    Validate WhatsApp number format.
    
    WhatsApp numbers should be in international format without special characters.
    Expected format: 10-15 digits only.
    
    Args:
        value: The phone number string to validate
        
    Raises:
        ValidationError: If the number doesn't match the expected format
        
    Examples:
        Valid: "1234567890", "123456789012345"
        Invalid: "123", "12345678901234567", "123-456-7890", "+1234567890"
    """
    if not value:
        raise ValidationError(_('WhatsApp number cannot be empty'))
    
    # Remove any whitespace
    value = str(value).strip()
    
    # Check if it contains only digits
    if not value.isdigit():
        raise ValidationError(
            _('WhatsApp number must contain only digits (no spaces, dashes, or special characters)')
        )
    
    # Check length (10-15 digits as per international phone number standards)
    if len(value) < 10 or len(value) > 15:
        raise ValidationError(
            _('WhatsApp number must be between 10 and 15 digits')
        )


def validate_file_size(value):
    """
    Validate file size (maximum 10MB).
    
    Args:
        value: The uploaded file object
        
    Raises:
        ValidationError: If the file size exceeds 10MB
    """
    max_size = 10 * 1024 * 1024  # 10MB in bytes
    
    if value.size > max_size:
        raise ValidationError(
            _('File size cannot exceed 10MB. Current size: %(size).2f MB') % {
                'size': value.size / (1024 * 1024)
            }
        )


def validate_file_type(value):
    """
    Validate file type against allowed types.
    
    Allowed types:
    - Images: JPEG, PNG
    - Documents: PDF, DOCX
    
    Validates both MIME type and file extension for security.
    
    Args:
        value: The uploaded file object
        
    Raises:
        ValidationError: If the file type is not in the allowed list
    """
    import os
    
    allowed_types = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
    ]
    
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.pdf', '.docx']
    
    # Get the content type from the file
    content_type = getattr(value, 'content_type', None)
    
    if not content_type:
        raise ValidationError(_('Unable to determine file type'))
    
    # Validate MIME type
    if content_type not in allowed_types:
        raise ValidationError(
            _('File type "%(type)s" is not allowed. Allowed types: JPEG, PNG, PDF, DOCX') % {
                'type': content_type
            }
        )
    
    # Validate file extension
    file_name = getattr(value, 'name', '')
    if file_name:
        file_ext = os.path.splitext(file_name)[1].lower()
        if file_ext not in allowed_extensions:
            raise ValidationError(
                _('File extension "%(ext)s" is not allowed. Allowed extensions: .jpg, .jpeg, .png, .pdf, .docx') % {
                    'ext': file_ext
                }
            )


def validate_future_date(value):
    """
    Validate that a date/timestamp is in the future.
    
    Expects a Unix timestamp in milliseconds (as used in the frontend).
    
    Args:
        value: Unix timestamp in milliseconds
        
    Raises:
        ValidationError: If the timestamp is in the past
    """
    import time
    
    if value is None:
        # Allow null values (deadline is optional)
        return
    
    # Convert to integer if it's a string
    try:
        timestamp_ms = int(value)
    except (ValueError, TypeError):
        raise ValidationError(_('Invalid timestamp format'))
    
    # Get current time in milliseconds
    from backend.utils import get_current_timestamp_ms
    current_time_ms = get_current_timestamp_ms()
    
    # Check if the timestamp is in the future
    if timestamp_ms <= current_time_ms:
        raise ValidationError(
            _('Deadline must be in the future')
        )
