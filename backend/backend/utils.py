"""
Utility functions for the backend project.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.db import DatabaseError, OperationalError, IntegrityError
import logging
import traceback
import re

logger = logging.getLogger('backend')


def sanitize_error_message(message, is_production=False):
    """
    Sanitize error messages to prevent sensitive information leakage.
    
    In production mode, removes:
    - File paths
    - Database connection details
    - SQL queries
    - Internal variable values
    - Stack traces
    
    Requirements: 1.5, 3.2
    """
    if not is_production:
        return message
    
    # Convert to string if not already
    message = str(message)
    
    # Patterns to sanitize
    patterns = [
        # File paths (Unix and Windows)
        (r'/[a-zA-Z0-9_\-./]+\.py', '[FILE_PATH]'),
        (r'[A-Z]:\\[a-zA-Z0-9_\-\\./]+', '[FILE_PATH]'),
        (r'File "[^"]+",', 'File "[FILE_PATH]",'),
        
        # Database connection strings
        (r'mysql://[^@]+@[^/]+/[^\s]+', '[DATABASE_CONNECTION]'),
        (r'postgresql://[^@]+@[^/]+/[^\s]+', '[DATABASE_CONNECTION]'),
        (r'(host|server|database|db|user|username|password|pwd)[\s]*=[\s]*[^\s,;)]+', r'\1=[REDACTED]'),
        
        # SQL queries
        (r'SELECT\s+.+\s+FROM\s+', 'SELECT [QUERY] FROM '),
        (r'INSERT\s+INTO\s+.+\s+VALUES', 'INSERT INTO [TABLE] VALUES'),
        (r'UPDATE\s+.+\s+SET\s+', 'UPDATE [TABLE] SET '),
        (r'DELETE\s+FROM\s+', 'DELETE FROM [TABLE] '),
        
        # IP addresses (internal)
        (r'\b(?:10|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b', '[INTERNAL_IP]'),
        
        # Port numbers in connection strings
        (r':\d{4,5}/', ':[PORT]/'),
        
        # Environment variable values
        (r'(SECRET_KEY|API_KEY|TOKEN|PASSWORD)[\s]*=[\s]*[^\s,;)]+', r'\1=[REDACTED]'),
    ]
    
    sanitized = message
    for pattern, replacement in patterns:
        sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
    
    return sanitized


def get_safe_error_message(exc, is_production=False):
    """
    Get a safe error message for client response.
    
    In production:
    - Database errors return generic message
    - Other errors are sanitized
    
    In development:
    - Full error messages are returned
    
    Requirements: 1.5, 3.2
    """
    if not is_production:
        return str(exc)
    
    # Check if it's a database error
    if isinstance(exc, (DatabaseError, OperationalError, IntegrityError)):
        return 'حدث خطأ في قاعدة البيانات'
    
    # For other errors, sanitize the message
    return sanitize_error_message(str(exc), is_production=True)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for Django REST Framework.
    Logs all exceptions with full context and returns structured error responses.
    
    In production mode, sanitizes error messages to prevent sensitive data leakage.
    
    Requirements: 9.2, 7.3, 7.4, 1.5, 3.2
    """
    # Get request information for logging
    request = context.get('request')
    view = context.get('view')
    
    # Determine if we're in production
    is_production = not settings.DEBUG
    
    # Prepare logging context
    log_context = {
        'exception_type': type(exc).__name__,
        'exception_message': str(exc),
        'path': request.path if request else None,
        'method': request.method if request else None,
        'user': request.user.username if request and hasattr(request, 'user') and request.user.is_authenticated else 'anonymous',
        'ip_address': get_client_ip(request) if request else None,
        'view': view.__class__.__name__ if view else None,
    }
    
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Known DRF exception (validation, authentication, permission, etc.)
        # Log with full context and stack trace
        logger.error(
            f"API Error: {exc}",
            extra={
                **log_context,
                'status_code': response.status_code,
                'response_data': response.data,
                'stack_trace': traceback.format_exc(),
            },
            exc_info=True
        )
        
        # Get safe error message for client
        safe_message = get_safe_error_message(exc, is_production)
        
        # Return structured error response
        # For validation errors (400), keep field-specific messages
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            response.data = {
                'error': {
                    'message': 'خطأ في التحقق من البيانات',
                    'code': response.status_code,
                    'details': response.data
                }
            }
        else:
            # For other errors, use sanitized message
            response.data = {
                'error': {
                    'message': safe_message,
                    'code': response.status_code,
                    'details': {} if is_production else (response.data if isinstance(response.data, dict) else {})
                }
            }
    else:
        # Unexpected error (500) - not handled by DRF
        # Log with full context and stack trace
        logger.error(
            f"Unexpected Error: {exc}",
            extra={
                **log_context,
                'stack_trace': traceback.format_exc(),
            },
            exc_info=True
        )
        
        # Get safe error message for client
        safe_message = get_safe_error_message(exc, is_production)
        
        # Return error message to user
        # In production: sanitized/generic message
        # In development: full error message for debugging
        response = Response(
            {
                'error': {
                    'message': safe_message,
                    'code': 500,
                    'details': {}
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return response


def get_client_ip(request):
    """
    Extract client IP address from request.
    Handles proxy headers (X-Forwarded-For).
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_current_timestamp_ms() -> int:
    """
    Get current timestamp in milliseconds using Django timezone.
    This ensures consistent timezone handling across the application.
    
    Returns:
        int: Current timestamp in milliseconds
    """
    from django.utils import timezone
    return int(timezone.now().timestamp() * 1000)
