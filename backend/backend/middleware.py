"""
Custom middleware for logging and request tracking.
"""

import logging
import time
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('backend')


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log all API requests and responses.
    Logs timestamp, endpoint, method, user, IP address, and response status.
    """
    
    def process_request(self, request):
        """Log incoming request details"""
        request._start_time = time.time()
        
        # Get client IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        
        # Log request
        logger.info(
            'API Request',
            extra={
                'method': request.method,
                'path': request.path,
                'user': request.user.username if request.user.is_authenticated else 'anonymous',
                'user_id': request.user.id if request.user.is_authenticated else None,
                'ip_address': ip,
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            }
        )
        
        return None
    
    def process_response(self, request, response):
        """Log response details"""
        # Calculate request duration
        if hasattr(request, '_start_time'):
            duration = time.time() - request._start_time
        else:
            duration = 0
        
        # Get client IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        
        # Log response
        logger.info(
            'API Response',
            extra={
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'user': request.user.username if request.user.is_authenticated else 'anonymous',
                'user_id': request.user.id if request.user.is_authenticated else None,
                'ip_address': ip,
                'duration_seconds': round(duration, 3),
            }
        )
        
        return response
    
    def process_exception(self, request, exception):
        """Log exceptions that occur during request processing"""
        # Get client IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        
        logger.error(
            f'Exception during request: {str(exception)}',
            extra={
                'method': request.method,
                'path': request.path,
                'user': request.user.username if request.user.is_authenticated else 'anonymous',
                'user_id': request.user.id if request.user.is_authenticated else None,
                'ip_address': ip,
                'exception_type': type(exception).__name__,
            },
            exc_info=True
        )
        
        return None
