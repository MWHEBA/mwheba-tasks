"""
Utility functions for the backend.
"""
from django.utils import timezone


def get_current_timestamp_ms() -> int:
    """
    Get current timestamp in milliseconds using Django timezone.
    This ensures consistent timezone handling across the application.
    
    Returns:
        int: Current timestamp in milliseconds
    """
    return int(timezone.now().timestamp() * 1000)
