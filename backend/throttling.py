"""
Custom throttle classes for rate limiting.
"""
from rest_framework.throttling import SimpleRateThrottle, AnonRateThrottle, UserRateThrottle
import logging

logger = logging.getLogger(__name__)


class LoggingThrottleMixin:
    """
    Mixin to add logging to throttle classes.
    Logs rate limit violations with client IP and endpoint information.
    """
    
    def throttle_failure(self):
        """
        Called when a request is throttled.
        Logs the violation before returning False.
        """
        # Get request from the throttle instance
        request = getattr(self, 'request', None)
        if request:
            client_ip = self.get_ident(request)
            endpoint = request.path
            user = getattr(request, 'user', None)
            user_info = user.username if user and user.is_authenticated else 'anonymous'
            
            logger.warning(
                f'Rate limit exceeded',
                extra={
                    'client_ip': client_ip,
                    'endpoint': endpoint,
                    'user': user_info,
                    'throttle_scope': getattr(self, 'scope', 'unknown'),
                    'rate': getattr(self, 'rate', 'unknown')
                }
            )
        
        return super().throttle_failure()


class LoginThrottle(LoggingThrottleMixin, SimpleRateThrottle):
    """
    Stricter rate limit for login attempts to prevent brute force attacks.
    Limits login attempts to 10 per minute per IP address.
    """
    scope = 'login'
    
    def get_cache_key(self, request, view):
        """
        Generate cache key based on client IP address.
        """
        # Store request for logging
        self.request = request
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }


class LoggingAnonRateThrottle(LoggingThrottleMixin, AnonRateThrottle):
    """
    Anonymous user rate throttle with logging.
    """
    
    def allow_request(self, request, view):
        """
        Override to store request for logging.
        """
        self.request = request
        return super().allow_request(request, view)


class LoggingUserRateThrottle(LoggingThrottleMixin, UserRateThrottle):
    """
    Authenticated user rate throttle with logging.
    """
    
    def allow_request(self, request, view):
        """
        Override to store request for logging.
        """
        self.request = request
        return super().allow_request(request, view)
