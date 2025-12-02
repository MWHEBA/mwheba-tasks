"""
Logging Filters for Sensitive Data Sanitization

This module provides custom logging filters that detect and redact sensitive
information from log messages before they are written to log files.

The SensitiveDataFilter identifies patterns commonly associated with sensitive
data (passwords, tokens, API keys, etc.) and replaces them with [REDACTED].

Usage:
    Add this filter to logging handlers in Django settings:
    
    'filters': {
        'sanitize': {
            '()': 'backend.logging_filters.SensitiveDataFilter',
        },
    },
    'handlers': {
        'file': {
            'filters': ['sanitize'],
            ...
        },
    }
"""

import re
import logging
from typing import Pattern, List, Tuple


class SensitiveDataFilter(logging.Filter):
    """
    Logging filter that sanitizes sensitive data from log records.
    
    This filter scans log messages and replaces sensitive patterns with [REDACTED].
    It handles various formats of sensitive data including:
    - Passwords in various formats
    - API keys and tokens
    - Authorization headers
    - Database credentials
    - Secret keys
    - Credit card numbers
    - Email addresses in sensitive contexts
    """
    
    # Sensitive field names that should be redacted
    SENSITIVE_KEYS = [
        'password', 'passwd', 'pwd', 'secret', 'token', 'api_key', 'apikey',
        'access_token', 'refresh_token', 'auth_token', 'authorization',
        'secret_key', 'private_key', 'db_password', 'database_password',
        'mysql_password', 'postgres_password', 'redis_password',
        'jwt', 'session_id', 'sessionid', 'csrf_token', 'csrftoken',
        'credit_card', 'card_number', 'cvv', 'ssn', 'social_security',
    ]
    
    def __init__(self, name: str = ''):
        """Initialize the filter with compiled regex patterns."""
        super().__init__(name)
        self.patterns: List[Tuple[Pattern, str]] = self._compile_patterns()
    
    def _compile_patterns(self) -> List[Tuple[Pattern, str]]:
        """
        Compile regex patterns for detecting sensitive data.
        
        Returns:
            List of tuples containing (compiled_pattern, replacement_string)
        """
        patterns = []
        
        # Pattern 1: Key-value pairs with sensitive keys (JSON, dict, query params)
        # Matches: "password": "value", 'password': 'value', password=value, password: value
        for key in self.SENSITIVE_KEYS:
            # JSON/dict format: "key": "value" or 'key': 'value'
            pattern = rf'''(['"]?{key}['"]?\s*[:=]\s*)(['"][^'"]*['"]|[^\s,}}]+)'''
            patterns.append((
                re.compile(pattern, re.IGNORECASE),
                r'\1[REDACTED]'
            ))
        
        # Pattern 2: JWT tokens (three base64 segments separated by dots)
        # Must come before Authorization header pattern to catch JWT tokens first
        # Matches: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
        patterns.append((
            re.compile(r'\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b'),
            '[REDACTED_JWT]'
        ))
        
        # Pattern 3: Authorization header
        # Matches: Authorization: Bearer token, Authorization: Token token
        patterns.append((
            re.compile(r'(Authorization\s*:\s*(?:Bearer|Token)\s+)[\w\-\.=]+', re.IGNORECASE),
            r'\1[REDACTED]'
        ))
        
        # Pattern 4: Basic auth in URLs
        # Matches: http://user:pass@host or https://user:pass@host
        patterns.append((
            re.compile(r'(https?://[^:]+:)[^@]+(@)', re.IGNORECASE),
            r'\1[REDACTED]\2'
        ))
        
        # Pattern 5: API keys (common formats)
        # Matches: sk_live_..., pk_test_..., AIza..., etc.
        patterns.append((
            re.compile(r'\b(sk|pk)_(live|test)_[A-Za-z0-9]{20,}\b'),
            '[REDACTED_API_KEY]'
        ))
        patterns.append((
            re.compile(r'\bAIza[A-Za-z0-9_-]{35}\b'),
            '[REDACTED_API_KEY]'
        ))
        
        # Pattern 6: Credit card numbers (basic pattern)
        # Matches: 4111-1111-1111-1111 or 4111111111111111
        patterns.append((
            re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'),
            '[REDACTED_CARD]'
        ))
        
        # Pattern 7: Database connection strings
        # Matches: mysql://user:pass@host, postgresql://user:pass@host
        patterns.append((
            re.compile(r'((?:mysql|postgresql|postgres|mongodb)://[^:]+:)[^@]+(@)', re.IGNORECASE),
            r'\1[REDACTED]\2'
        ))
        
        # Pattern 8: Generic secrets in environment variable format
        # Matches: SECRET_KEY=value, API_KEY=value
        patterns.append((
            re.compile(r'([A-Z_]*(?:SECRET|KEY|TOKEN|PASSWORD)[A-Z_]*\s*=\s*)([^\s]+)', re.IGNORECASE),
            r'\1[REDACTED]'
        ))
        
        # Pattern 9: Session IDs and cookies
        # Matches: sessionid=..., session_id=...
        patterns.append((
            re.compile(r'(session(?:_)?id\s*=\s*)([^\s;,]+)', re.IGNORECASE),
            r'\1[REDACTED]'
        ))
        
        # Pattern 10: Email addresses in password reset contexts
        # Only redact emails when they appear near password-related terms
        patterns.append((
            re.compile(r'((?:password|reset|token).*?)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', re.IGNORECASE),
            r'\1[REDACTED_EMAIL]'
        ))
        
        return patterns
    
    def filter(self, record: logging.LogRecord) -> bool:
        """
        Filter a log record by sanitizing sensitive data.
        
        Args:
            record: The log record to filter
            
        Returns:
            True to allow the record to be logged (always returns True)
        """
        # Sanitize the main message
        if hasattr(record, 'msg') and isinstance(record.msg, str):
            record.msg = self._sanitize(record.msg)
        
        # Sanitize arguments if they exist
        if hasattr(record, 'args') and record.args:
            try:
                if isinstance(record.args, dict):
                    record.args = {
                        key: self._sanitize(str(value)) if isinstance(value, str) else value
                        for key, value in record.args.items()
                    }
                elif isinstance(record.args, (tuple, list)):
                    sanitized_args = []
                    for arg in record.args:
                        if isinstance(arg, str):
                            sanitized_args.append(self._sanitize(arg))
                        else:
                            sanitized_args.append(arg)
                    record.args = tuple(sanitized_args)
            except Exception:
                # If sanitization of args fails, leave them as is
                pass
        
        # Sanitize exc_text if present (exception text)
        if hasattr(record, 'exc_text') and record.exc_text:
            record.exc_text = self._sanitize(record.exc_text)
        
        # Sanitize pathname to avoid leaking sensitive file paths in production
        # Only keep the relative path from the project root
        if hasattr(record, 'pathname'):
            # Keep only the last 3 path components for context
            path_parts = record.pathname.split('/')
            if len(path_parts) > 3:
                record.pathname = '/'.join(['...'] + path_parts[-3:])
        
        return True
    
    def _sanitize(self, text: str) -> str:
        """
        Apply all sanitization patterns to the given text.
        
        Args:
            text: The text to sanitize
            
        Returns:
            Sanitized text with sensitive data replaced
        """
        if not text:
            return text
        
        sanitized = text
        
        # Apply all patterns
        for pattern, replacement in self.patterns:
            sanitized = pattern.sub(replacement, sanitized)
        
        return sanitized


class ProductionOnlyFilter(logging.Filter):
    """
    Filter that only allows log records in production environments.
    
    This can be used to ensure certain logs only appear in production,
    or to apply different filtering rules based on environment.
    """
    
    def __init__(self, name: str = ''):
        """Initialize the filter."""
        super().__init__(name)
        # Import here to avoid circular imports
        from django.conf import settings
        self.is_production = not settings.DEBUG
    
    def filter(self, record: logging.LogRecord) -> bool:
        """
        Filter records based on production environment.
        
        Args:
            record: The log record to filter
            
        Returns:
            True if in production, False otherwise
        """
        return self.is_production


class DevelopmentOnlyFilter(logging.Filter):
    """
    Filter that only allows log records in development environments.
    
    Useful for verbose debugging logs that should not appear in production.
    """
    
    def __init__(self, name: str = ''):
        """Initialize the filter."""
        super().__init__(name)
        # Import here to avoid circular imports
        from django.conf import settings
        self.is_development = settings.DEBUG
    
    def filter(self, record: logging.LogRecord) -> bool:
        """
        Filter records based on development environment.
        
        Args:
            record: The log record to filter
            
        Returns:
            True if in development, False otherwise
        """
        return self.is_development
