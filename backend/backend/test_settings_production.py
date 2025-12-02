"""
Tests for production settings module

This test file validates that the production settings module
loads correctly and enforces production requirements.
"""

import os
import sys
import pytest
from pathlib import Path
from unittest.mock import patch
from django.core.exceptions import ImproperlyConfigured


# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))


class TestProductionSettings:
    """Test production settings configuration"""
    
    def test_production_settings_imports(self):
        """Test that production settings module can be imported"""
        # Set required environment variables for import
        os.environ['DEBUG'] = 'False'
        os.environ['SECRET_KEY'] = 'django-production-key-abc123def456ghi789jkl012mno345pqr678stu901vwx!@#$%^&*()'  # Strong key
        os.environ['ALLOWED_HOSTS'] = 'tasks.mwheba.com'
        os.environ['DB_NAME'] = 'test_db'
        os.environ['DB_USER'] = 'test_user'
        os.environ['DB_PASSWORD'] = 'test_pass'
        os.environ['DB_HOST'] = 'localhost'
        os.environ['CORS_ALLOWED_ORIGINS'] = 'https://tasks.mwheba.com'
        
        # Import should succeed
        try:
            import backend.settings_production as settings
            assert settings.DEBUG is False
            assert settings.SECRET_KEY is not None
            assert len(settings.ALLOWED_HOSTS) > 0
        except Exception as e:
            pytest.fail(f"Failed to import production settings: {e}")
    
    def test_debug_is_false(self):
        """Test that DEBUG is False in production settings"""
        os.environ['DEBUG'] = 'False'
        os.environ['SECRET_KEY'] = 'django-production-key-abc123def456ghi789jkl012mno345pqr678stu901vwx!@#$%^&*()'
        os.environ['ALLOWED_HOSTS'] = 'tasks.mwheba.com'
        os.environ['DB_NAME'] = 'test_db'
        os.environ['DB_USER'] = 'test_user'
        os.environ['DB_PASSWORD'] = 'test_pass'
        os.environ['DB_HOST'] = 'localhost'
        os.environ['CORS_ALLOWED_ORIGINS'] = 'https://tasks.mwheba.com'
        
        import backend.settings_production as settings
        assert settings.DEBUG is False, "DEBUG must be False in production"
    
    def test_cors_excludes_dev_urls(self):
        """Test that CORS configuration excludes development URLs"""
        os.environ['DEBUG'] = 'False'
        os.environ['SECRET_KEY'] = 'django-production-key-abc123def456ghi789jkl012mno345pqr678stu901vwx!@#$%^&*()'
        os.environ['ALLOWED_HOSTS'] = 'tasks.mwheba.com'
        os.environ['DB_NAME'] = 'test_db'
        os.environ['DB_USER'] = 'test_user'
        os.environ['DB_PASSWORD'] = 'test_pass'
        os.environ['DB_HOST'] = 'localhost'
        os.environ['CORS_ALLOWED_ORIGINS'] = 'http://localhost:5173,https://tasks.mwheba.com'
        
        import backend.settings_production as settings
        
        # Check that localhost URLs are filtered out
        for origin in settings.CORS_ALLOWED_ORIGINS:
            assert 'localhost' not in origin, f"Development URL found in CORS origins: {origin}"
            assert '127.0.0.1' not in origin, f"Development URL found in CORS origins: {origin}"
            assert ':5173' not in origin, f"Development URL found in CORS origins: {origin}"
    
    def test_database_connection_pooling(self):
        """Test that database connection pooling is configured"""
        os.environ['DEBUG'] = 'False'
        os.environ['SECRET_KEY'] = 'django-production-key-abc123def456ghi789jkl012mno345pqr678stu901vwx!@#$%^&*()'
        os.environ['ALLOWED_HOSTS'] = 'tasks.mwheba.com'
        os.environ['DB_NAME'] = 'test_db'
        os.environ['DB_USER'] = 'test_user'
        os.environ['DB_PASSWORD'] = 'test_pass'
        os.environ['DB_HOST'] = 'localhost'
        os.environ['CORS_ALLOWED_ORIGINS'] = 'https://tasks.mwheba.com'
        
        import backend.settings_production as settings
        
        # Check connection pooling settings
        assert 'CONN_MAX_AGE' in settings.DATABASES['default']
        assert settings.DATABASES['default']['CONN_MAX_AGE'] > 0
        assert settings.DATABASES['default']['ATOMIC_REQUESTS'] is True
    
    def test_logging_uses_json_format(self):
        """Test that production logging uses JSON format"""
        os.environ['DEBUG'] = 'False'
        os.environ['SECRET_KEY'] = 'django-production-key-abc123def456ghi789jkl012mno345pqr678stu901vwx!@#$%^&*()'
        os.environ['ALLOWED_HOSTS'] = 'tasks.mwheba.com'
        os.environ['DB_NAME'] = 'test_db'
        os.environ['DB_USER'] = 'test_user'
        os.environ['DB_PASSWORD'] = 'test_pass'
        os.environ['DB_HOST'] = 'localhost'
        os.environ['CORS_ALLOWED_ORIGINS'] = 'https://tasks.mwheba.com'
        
        import backend.settings_production as settings
        
        # Check JSON formatter is configured
        assert 'json' in settings.LOGGING['formatters']
        assert 'JsonFormatter' in settings.LOGGING['formatters']['json']['()']
        
        # Check handlers use JSON formatter
        assert settings.LOGGING['handlers']['file']['formatter'] == 'json'
        assert settings.LOGGING['handlers']['error_file']['formatter'] == 'json'
    
    def test_security_settings(self):
        """Test that security settings are properly configured"""
        os.environ['DEBUG'] = 'False'
        os.environ['SECRET_KEY'] = 'django-production-key-abc123def456ghi789jkl012mno345pqr678stu901vwx!@#$%^&*()'
        os.environ['ALLOWED_HOSTS'] = 'tasks.mwheba.com'
        os.environ['DB_NAME'] = 'test_db'
        os.environ['DB_USER'] = 'test_user'
        os.environ['DB_PASSWORD'] = 'test_pass'
        os.environ['DB_HOST'] = 'localhost'
        os.environ['CORS_ALLOWED_ORIGINS'] = 'https://tasks.mwheba.com'
        
        import backend.settings_production as settings
        
        # Check security settings
        assert settings.SESSION_COOKIE_SECURE is True
        assert settings.CSRF_COOKIE_SECURE is True
        assert settings.SECURE_BROWSER_XSS_FILTER is True
        assert settings.SECURE_CONTENT_TYPE_NOSNIFF is True
        assert settings.X_FRAME_OPTIONS == 'SAMEORIGIN'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
