"""
Environment Configuration Validation Module

This module provides centralized validation and loading of environment variables
for production deployment. It ensures all required variables are present and
validates security-critical settings like SECRET_KEY.
"""

import os
import re
from typing import Dict, List, Optional
from django.core.exceptions import ImproperlyConfigured


class EnvironmentConfig:
    """
    Validates and loads environment variables for production deployment.
    
    This class provides static methods to:
    - Validate required environment variables are present
    - Validate SECRET_KEY meets security requirements
    - Detect production vs development environment
    - Get validated configuration values
    """
    
    # Required environment variables for production
    REQUIRED_VARS = [
        'SECRET_KEY',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'DB_HOST',
        'ALLOWED_HOSTS',
    ]
    
    # Weak/default SECRET_KEY patterns to reject
    WEAK_SECRET_PATTERNS = [
        'django-insecure',
        'your-secret-key',
        'change-this',
        'change-in-production',
        'secret',
        'password',
        '12345',
    ]
    
    # Minimum SECRET_KEY length for production
    MIN_SECRET_KEY_LENGTH = 50
    
    @staticmethod
    def validate_required_vars() -> Dict[str, str]:
        """
        Validates that all required environment variables are present and non-empty.
        
        Returns:
            Dict[str, str]: Dictionary of validated environment variables
            
        Raises:
            ImproperlyConfigured: If any required variable is missing or empty
        """
        missing_vars = []
        empty_vars = []
        env_vars = {}
        
        for var_name in EnvironmentConfig.REQUIRED_VARS:
            value = os.getenv(var_name)
            
            if value is None:
                missing_vars.append(var_name)
            elif not value.strip():
                empty_vars.append(var_name)
            else:
                env_vars[var_name] = value
        
        errors = []
        if missing_vars:
            errors.append(f"Missing required environment variables: {', '.join(missing_vars)}")
        if empty_vars:
            errors.append(f"Empty required environment variables: {', '.join(empty_vars)}")
        
        if errors:
            raise ImproperlyConfigured(
                "Environment configuration validation failed:\n" + "\n".join(errors)
            )
        
        return env_vars
    
    @staticmethod
    def validate_secret_key(secret_key: str) -> bool:
        """
        Validates that SECRET_KEY meets security requirements for production.
        
        Requirements:
        - Minimum length of 50 characters
        - Contains mixed alphanumeric and special characters
        - Does not match weak/default patterns
        
        Args:
            secret_key: The SECRET_KEY value to validate
            
        Returns:
            bool: True if valid, False otherwise
            
        Raises:
            ImproperlyConfigured: If SECRET_KEY fails validation with detailed reason
        """
        if not secret_key:
            raise ImproperlyConfigured("SECRET_KEY cannot be empty")
        
        # Check minimum length
        if len(secret_key) < EnvironmentConfig.MIN_SECRET_KEY_LENGTH:
            raise ImproperlyConfigured(
                f"SECRET_KEY must be at least {EnvironmentConfig.MIN_SECRET_KEY_LENGTH} "
                f"characters long (current length: {len(secret_key)})"
            )
        
        # Check for weak/default patterns
        secret_key_lower = secret_key.lower()
        for pattern in EnvironmentConfig.WEAK_SECRET_PATTERNS:
            if pattern in secret_key_lower:
                raise ImproperlyConfigured(
                    f"SECRET_KEY contains weak/default pattern: '{pattern}'. "
                    "Please generate a strong, random SECRET_KEY for production."
                )
        
        # Check for character diversity (alphanumeric + special chars)
        has_alpha = bool(re.search(r'[a-zA-Z]', secret_key))
        has_digit = bool(re.search(r'\d', secret_key))
        has_special = bool(re.search(r'[^a-zA-Z0-9]', secret_key))
        
        if not (has_alpha and (has_digit or has_special)):
            raise ImproperlyConfigured(
                "SECRET_KEY must contain a mix of letters and either digits or special characters. "
                "Please generate a strong, random SECRET_KEY for production."
            )
        
        return True
    
    @staticmethod
    def get_secret_key() -> str:
        """
        Returns validated SECRET_KEY from environment.
        
        Returns:
            str: Validated SECRET_KEY
            
        Raises:
            ImproperlyConfigured: If SECRET_KEY is missing or invalid
        """
        secret_key = os.getenv('SECRET_KEY')
        
        if not secret_key:
            raise ImproperlyConfigured(
                "SECRET_KEY environment variable is not set. "
                "Please set a strong, random SECRET_KEY in your .env file."
            )
        
        # Validate in production mode
        if EnvironmentConfig.is_production():
            EnvironmentConfig.validate_secret_key(secret_key)
        
        return secret_key
    
    @staticmethod
    def is_production() -> bool:
        """
        Determines if the application is running in production mode.
        
        Production is detected when:
        - DEBUG environment variable is explicitly set to 'False' or '0'
        - Or DEBUG is not set (defaults to production)
        
        Returns:
            bool: True if production mode, False if development mode
        """
        debug_value = os.getenv('DEBUG', 'False').strip()
        
        # Consider production if DEBUG is False, 0, or not set
        # Only development if explicitly set to True or 1
        return debug_value.lower() not in ('true', '1', 'yes')
    
    @staticmethod
    def get_allowed_hosts() -> List[str]:
        """
        Returns validated ALLOWED_HOSTS list from environment.
        
        Returns:
            List[str]: List of allowed host domains
            
        Raises:
            ImproperlyConfigured: If ALLOWED_HOSTS is missing or empty in production
        """
        allowed_hosts_str = os.getenv('ALLOWED_HOSTS', '')
        
        if not allowed_hosts_str.strip():
            if EnvironmentConfig.is_production():
                raise ImproperlyConfigured(
                    "ALLOWED_HOSTS must be set in production. "
                    "Please specify allowed domains in your .env file."
                )
            # Default for development
            return ['localhost', '127.0.0.1']
        
        # Split by comma and strip whitespace
        allowed_hosts = [host.strip() for host in allowed_hosts_str.split(',')]
        
        # Remove empty strings
        allowed_hosts = [host for host in allowed_hosts if host]
        
        if not allowed_hosts and EnvironmentConfig.is_production():
            raise ImproperlyConfigured(
                "ALLOWED_HOSTS cannot be empty in production. "
                "Please specify allowed domains in your .env file."
            )
        
        return allowed_hosts
    
    @staticmethod
    def validate_production_config() -> Dict[str, any]:
        """
        Performs comprehensive validation of production configuration.
        
        This method should be called during application startup in production
        to ensure all configuration is valid before the application starts serving requests.
        
        Returns:
            Dict[str, any]: Dictionary containing validation results and config values
            
        Raises:
            ImproperlyConfigured: If any validation check fails
        """
        if not EnvironmentConfig.is_production():
            return {
                'is_production': False,
                'message': 'Running in development mode - skipping production validation'
            }
        
        # Validate all required environment variables
        env_vars = EnvironmentConfig.validate_required_vars()
        
        # Validate SECRET_KEY
        secret_key = EnvironmentConfig.get_secret_key()
        
        # Validate ALLOWED_HOSTS
        allowed_hosts = EnvironmentConfig.get_allowed_hosts()
        
        # Check DEBUG is False
        debug_value = os.getenv('DEBUG', 'False')
        if debug_value.lower() in ('true', '1', 'yes'):
            raise ImproperlyConfigured(
                "DEBUG must be set to False in production. "
                "Current value: DEBUG={}".format(debug_value)
            )
        
        return {
            'is_production': True,
            'message': 'Production configuration validated successfully',
            'secret_key_length': len(secret_key),
            'allowed_hosts': allowed_hosts,
            'required_vars_present': list(env_vars.keys()),
        }
