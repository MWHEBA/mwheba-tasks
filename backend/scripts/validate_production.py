#!/usr/bin/env python
"""
Production Configuration Validation Script

This script validates that the Django application is properly configured
for production deployment on cPanel. It checks:
- DEBUG is set to False
- SECRET_KEY is strong and secure
- ALLOWED_HOSTS includes production domain
- Database connectivity
- All required environment variables are present

Usage:
    python backend/scripts/validate_production.py
    
Exit codes:
    0 - All validations passed
    1 - One or more validations failed
"""

import os
import sys
import django
from pathlib import Path
from typing import Dict, List, Tuple
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    """Represents the result of a validation check"""
    passed: bool
    message: str
    details: List[str] = field(default_factory=list)
    
    def __str__(self) -> str:
        status = "[PASS]" if self.passed else "[FAIL]"
        result = f"{status}: {self.message}"
        if self.details:
            for detail in self.details:
                result += f"\n  - {detail}"
        return result


class ProductionValidator:
    """
    Validates production configuration for Django application.
    
    This class performs comprehensive validation of:
    - Environment variables
    - Security settings (DEBUG, SECRET_KEY)
    - Network configuration (ALLOWED_HOSTS, CORS)
    - Database connectivity
    - File system configuration
    """
    
    def __init__(self):
        """Initialize the validator and set up Django environment"""
        self.results: List[ValidationResult] = []
        self.setup_django()
    
    def setup_django(self):
        """Set up Django environment for validation"""
        # Add backend directory to Python path
        backend_dir = Path(__file__).resolve().parent.parent
        sys.path.insert(0, str(backend_dir))
        
        # Set Django settings module
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
        
        # Setup Django
        django.setup()
    
    def validate_environment(self) -> ValidationResult:
        """
        Validates that all required environment variables are present.
        
        Checks for:
        - SECRET_KEY
        - DB_NAME
        - DB_USER
        - DB_PASSWORD
        - DB_HOST
        - ALLOWED_HOSTS
        
        Returns:
            ValidationResult: Result of environment variable validation
        """
        from backend.env_config import EnvironmentConfig
        
        required_vars = EnvironmentConfig.REQUIRED_VARS
        missing_vars = []
        empty_vars = []
        present_vars = []
        
        for var_name in required_vars:
            value = os.getenv(var_name)
            
            if value is None:
                missing_vars.append(var_name)
            elif not value.strip():
                empty_vars.append(var_name)
            else:
                present_vars.append(var_name)
        
        details = []
        passed = True
        
        if missing_vars:
            passed = False
            details.append(f"Missing variables: {', '.join(missing_vars)}")
        
        if empty_vars:
            passed = False
            details.append(f"Empty variables: {', '.join(empty_vars)}")
        
        if present_vars:
            details.append(f"Present variables: {', '.join(present_vars)}")
        
        message = "Environment variables validation"
        if passed:
            message += f" - All {len(required_vars)} required variables present"
        else:
            message += f" - {len(missing_vars) + len(empty_vars)} variables missing or empty"
        
        return ValidationResult(passed=passed, message=message, details=details)
    
    def validate_debug_setting(self) -> ValidationResult:
        """
        Validates that DEBUG is set to False in production.
        
        Returns:
            ValidationResult: Result of DEBUG validation
        """
        from django.conf import settings
        
        debug_value = settings.DEBUG
        passed = debug_value is False
        
        details = [f"DEBUG = {debug_value}"]
        
        if not passed:
            details.append("WARNING: DEBUG must be False in production!")
            details.append("Set DEBUG=False in your .env file")
        
        message = "DEBUG setting validation"
        return ValidationResult(passed=passed, message=message, details=details)
    
    def validate_secret_key(self) -> ValidationResult:
        """
        Validates that SECRET_KEY is strong and not a default value.
        
        Checks:
        - Minimum length of 50 characters
        - Not a default/weak pattern
        - Contains mixed characters
        
        Returns:
            ValidationResult: Result of SECRET_KEY validation
        """
        from django.conf import settings
        from backend.env_config import EnvironmentConfig
        
        secret_key = settings.SECRET_KEY
        details = []
        passed = True
        
        # Check length
        key_length = len(secret_key)
        details.append(f"SECRET_KEY length: {key_length} characters")
        
        if key_length < EnvironmentConfig.MIN_SECRET_KEY_LENGTH:
            passed = False
            details.append(
                f"ERROR: SECRET_KEY must be at least "
                f"{EnvironmentConfig.MIN_SECRET_KEY_LENGTH} characters"
            )
        
        # Check for weak patterns
        secret_key_lower = secret_key.lower()
        weak_patterns_found = []
        
        for pattern in EnvironmentConfig.WEAK_SECRET_PATTERNS:
            if pattern in secret_key_lower:
                weak_patterns_found.append(pattern)
        
        if weak_patterns_found:
            passed = False
            details.append(
                f"ERROR: SECRET_KEY contains weak patterns: {', '.join(weak_patterns_found)}"
            )
            details.append("Generate a strong random key using: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'")
        
        # Check character diversity
        import re
        has_alpha = bool(re.search(r'[a-zA-Z]', secret_key))
        has_digit = bool(re.search(r'\d', secret_key))
        has_special = bool(re.search(r'[^a-zA-Z0-9]', secret_key))
        
        if not (has_alpha and (has_digit or has_special)):
            passed = False
            details.append("ERROR: SECRET_KEY must contain mixed alphanumeric and special characters")
        else:
            details.append("Character diversity: [OK]")
        
        message = "SECRET_KEY validation"
        return ValidationResult(passed=passed, message=message, details=details)
    
    def validate_allowed_hosts(self) -> ValidationResult:
        """
        Validates that ALLOWED_HOSTS includes the production domain.
        
        Returns:
            ValidationResult: Result of ALLOWED_HOSTS validation
        """
        from django.conf import settings
        
        allowed_hosts = settings.ALLOWED_HOSTS
        details = []
        passed = True
        
        if not allowed_hosts:
            passed = False
            details.append("ERROR: ALLOWED_HOSTS is empty")
            details.append("Set ALLOWED_HOSTS in your .env file (e.g., ALLOWED_HOSTS=tasks.mwheba.com)")
        else:
            details.append(f"Configured hosts: {', '.join(allowed_hosts)}")
            
            # Check for development-only hosts
            dev_hosts = ['localhost', '127.0.0.1', '*']
            only_dev_hosts = all(host in dev_hosts for host in allowed_hosts)
            
            if only_dev_hosts:
                passed = False
                details.append("WARNING: Only development hosts configured")
                details.append("Add production domain to ALLOWED_HOSTS")
            
            # Check for wildcard (security risk)
            if '*' in allowed_hosts:
                passed = False
                details.append("ERROR: Wildcard '*' in ALLOWED_HOSTS is a security risk")
                details.append("Specify exact production domains instead")
        
        message = "ALLOWED_HOSTS validation"
        return ValidationResult(passed=passed, message=message, details=details)
    
    def validate_database(self) -> ValidationResult:
        """
        Tests database connectivity and validates configuration.
        
        Returns:
            ValidationResult: Result of database validation
        """
        from django.db import connection
        from django.conf import settings
        
        details = []
        passed = True
        
        # Get database configuration
        db_config = settings.DATABASES['default']
        db_engine = db_config['ENGINE']
        db_name = db_config['NAME']
        db_host = db_config['HOST']
        db_user = db_config['USER']
        
        details.append(f"Database engine: {db_engine}")
        details.append(f"Database name: {db_name}")
        details.append(f"Database host: {db_host}")
        details.append(f"Database user: {db_user}")
        
        # Test connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                
                if result and result[0] == 1:
                    details.append("[OK] Database connection successful")
                    
                    # Get database version
                    if 'mysql' in db_engine.lower():
                        cursor.execute("SELECT VERSION()")
                        version = cursor.fetchone()[0]
                        details.append(f"MySQL version: {version}")
                else:
                    passed = False
                    details.append("ERROR: Database query returned unexpected result")
        
        except Exception as e:
            passed = False
            details.append(f"ERROR: Database connection failed: {str(e)}")
            details.append("Check database credentials in .env file")
            details.append("Ensure database server is running and accessible")
        
        message = "Database connectivity validation"
        return ValidationResult(passed=passed, message=message, details=details)
    
    def validate_cors_configuration(self) -> ValidationResult:
        """
        Validates CORS configuration for production.
        
        Returns:
            ValidationResult: Result of CORS validation
        """
        from django.conf import settings
        
        details = []
        passed = True
        
        # Check CORS_ALLOWED_ORIGINS
        cors_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        
        if not cors_origins:
            passed = False
            details.append("ERROR: CORS_ALLOWED_ORIGINS is empty")
            details.append("Set CORS_ALLOWED_ORIGINS in your .env file")
        else:
            details.append(f"Allowed origins: {', '.join(cors_origins)}")
            
            # Check for development URLs
            dev_patterns = ['localhost', '127.0.0.1', '0.0.0.0', ':5173', ':3000', ':8000']
            dev_origins = [
                origin for origin in cors_origins
                if any(pattern in origin for pattern in dev_patterns)
            ]
            
            if dev_origins:
                passed = False
                details.append(f"WARNING: Development URLs in CORS origins: {', '.join(dev_origins)}")
                details.append("Remove development URLs from production CORS_ALLOWED_ORIGINS")
        
        # Check CORS_ALLOW_ALL_ORIGINS
        allow_all = getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False)
        if allow_all:
            passed = False
            details.append("ERROR: CORS_ALLOW_ALL_ORIGINS is True (security risk)")
            details.append("Set CORS_ALLOW_ALL_ORIGINS=False")
        else:
            details.append("CORS_ALLOW_ALL_ORIGINS: False [OK]")
        
        # Check CORS_ALLOW_CREDENTIALS
        allow_credentials = getattr(settings, 'CORS_ALLOW_CREDENTIALS', False)
        details.append(f"CORS_ALLOW_CREDENTIALS: {allow_credentials}")
        
        message = "CORS configuration validation"
        return ValidationResult(passed=passed, message=message, details=details)
    
    def validate_static_files(self) -> ValidationResult:
        """
        Validates static files configuration.
        
        Returns:
            ValidationResult: Result of static files validation
        """
        from django.conf import settings
        
        details = []
        passed = True
        
        # Check STATIC_ROOT
        static_root = settings.STATIC_ROOT
        if static_root:
            details.append(f"STATIC_ROOT: {static_root}")
            
            if Path(static_root).exists():
                details.append("[OK] STATIC_ROOT directory exists")
                
                # Check if collectstatic has been run
                static_files = list(Path(static_root).rglob('*'))
                if static_files:
                    details.append(f"Static files collected: {len(static_files)} files")
                else:
                    passed = False
                    details.append("WARNING: STATIC_ROOT is empty")
                    details.append("Run: python manage.py collectstatic")
            else:
                passed = False
                details.append("ERROR: STATIC_ROOT directory does not exist")
                details.append("Run: python manage.py collectstatic")
        else:
            passed = False
            details.append("ERROR: STATIC_ROOT is not configured")
        
        # Check MEDIA_ROOT
        media_root = settings.MEDIA_ROOT
        if media_root:
            details.append(f"MEDIA_ROOT: {media_root}")
            
            if Path(media_root).exists():
                details.append("[OK] MEDIA_ROOT directory exists")
            else:
                # Create media directory if it doesn't exist
                Path(media_root).mkdir(parents=True, exist_ok=True)
                details.append("Created MEDIA_ROOT directory")
        else:
            passed = False
            details.append("ERROR: MEDIA_ROOT is not configured")
        
        message = "Static and media files validation"
        return ValidationResult(passed=passed, message=message, details=details)
    
    def validate_logging(self) -> ValidationResult:
        """
        Validates logging configuration.
        
        Returns:
            ValidationResult: Result of logging validation
        """
        from django.conf import settings
        
        details = []
        passed = True
        
        logging_config = settings.LOGGING
        
        # Check if logging is configured
        if not logging_config:
            passed = False
            details.append("ERROR: LOGGING is not configured")
            return ValidationResult(passed=passed, message="Logging validation", details=details)
        
        # Check handlers
        handlers = logging_config.get('handlers', {})
        
        if 'error_file' in handlers:
            error_handler = handlers['error_file']
            error_log_file = error_handler.get('filename')
            
            if error_log_file:
                details.append(f"Error log file: {error_log_file}")
                
                # Check if log directory exists
                log_dir = Path(error_log_file).parent
                if log_dir.exists():
                    details.append("[OK] Log directory exists")
                else:
                    log_dir.mkdir(parents=True, exist_ok=True)
                    details.append("Created log directory")
            else:
                passed = False
                details.append("ERROR: Error log file not configured")
        else:
            passed = False
            details.append("ERROR: error_file handler not configured")
        
        # Check for sensitive data filter
        filters = logging_config.get('filters', {})
        if 'sanitize' in filters:
            details.append("[OK] Sensitive data filter configured")
        else:
            passed = False
            details.append("WARNING: Sensitive data filter not configured")
        
        message = "Logging configuration validation"
        return ValidationResult(passed=passed, message=message, details=details)
    
    def validate_security_settings(self) -> ValidationResult:
        """
        Validates security-related settings.
        
        Returns:
            ValidationResult: Result of security validation
        """
        from django.conf import settings
        
        details = []
        passed = True
        
        # Check security middleware
        middleware = settings.MIDDLEWARE
        security_middleware = 'django.middleware.security.SecurityMiddleware'
        
        if security_middleware in middleware:
            details.append("[OK] SecurityMiddleware enabled")
        else:
            passed = False
            details.append("ERROR: SecurityMiddleware not enabled")
        
        # Check CSRF middleware
        csrf_middleware = 'django.middleware.csrf.CsrfViewMiddleware'
        if csrf_middleware in middleware:
            details.append("[OK] CsrfViewMiddleware enabled")
        else:
            passed = False
            details.append("ERROR: CsrfViewMiddleware not enabled")
        
        # Check session cookie security
        session_cookie_secure = getattr(settings, 'SESSION_COOKIE_SECURE', False)
        if session_cookie_secure:
            details.append("[OK] SESSION_COOKIE_SECURE enabled")
        else:
            details.append("WARNING: SESSION_COOKIE_SECURE not enabled (recommended for HTTPS)")
        
        # Check CSRF cookie security
        csrf_cookie_secure = getattr(settings, 'CSRF_COOKIE_SECURE', False)
        if csrf_cookie_secure:
            details.append("[OK] CSRF_COOKIE_SECURE enabled")
        else:
            details.append("WARNING: CSRF_COOKIE_SECURE not enabled (recommended for HTTPS)")
        
        # Check X-Frame-Options
        x_frame_options = getattr(settings, 'X_FRAME_OPTIONS', None)
        if x_frame_options:
            details.append(f"[OK] X_FRAME_OPTIONS: {x_frame_options}")
        else:
            passed = False
            details.append("WARNING: X_FRAME_OPTIONS not set")
        
        message = "Security settings validation"
        return ValidationResult(passed=passed, message=message, details=details)
    
    def run_all_validations(self) -> bool:
        """
        Runs all validation checks and prints results.
        
        Returns:
            bool: True if all validations passed, False otherwise
        """
        print("=" * 70)
        print("Production Configuration Validation")
        print("=" * 70)
        print()
        
        # Run all validations
        validations = [
            ("Environment Variables", self.validate_environment),
            ("DEBUG Setting", self.validate_debug_setting),
            ("SECRET_KEY", self.validate_secret_key),
            ("ALLOWED_HOSTS", self.validate_allowed_hosts),
            ("Database Connectivity", self.validate_database),
            ("CORS Configuration", self.validate_cors_configuration),
            ("Static Files", self.validate_static_files),
            ("Logging", self.validate_logging),
            ("Security Settings", self.validate_security_settings),
        ]
        
        all_passed = True
        
        for name, validation_func in validations:
            print(f"Validating {name}...")
            try:
                result = validation_func()
                self.results.append(result)
                print(result)
                print()
                
                if not result.passed:
                    all_passed = False
            
            except Exception as e:
                error_result = ValidationResult(
                    passed=False,
                    message=f"{name} validation failed with exception",
                    details=[str(e)]
                )
                self.results.append(error_result)
                print(error_result)
                print()
                all_passed = False
        
        # Print summary
        print("=" * 70)
        print("Validation Summary")
        print("=" * 70)
        
        passed_count = sum(1 for r in self.results if r.passed)
        failed_count = len(self.results) - passed_count
        
        print(f"Total checks: {len(self.results)}")
        print(f"Passed: {passed_count}")
        print(f"Failed: {failed_count}")
        print()
        
        if all_passed:
            print("[SUCCESS] All validations passed! Production configuration is ready.")
        else:
            print("[WARNING] Some validations failed. Please fix the issues above before deploying.")
        
        print("=" * 70)
        
        return all_passed


def main():
    """Main entry point for the validation script"""
    try:
        validator = ProductionValidator()
        all_passed = validator.run_all_validations()
        
        # Exit with appropriate code
        sys.exit(0 if all_passed else 1)
    
    except Exception as e:
        print(f"Fatal error during validation: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
