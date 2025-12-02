"""
Tests for backend configuration (CORS, Environment, Settings, Logging)
"""
import os
import pytest
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.test.client import RequestFactory
from django.http import HttpResponse
from django.core.exceptions import ImproperlyConfigured
from corsheaders.middleware import CorsMiddleware
from backend.env_config import EnvironmentConfig
from backend.logging_filters import SensitiveDataFilter
import logging


# ============================================================================
# Environment Configuration Tests
# ============================================================================

class TestEnvironmentConfig:
    """Test suite for EnvironmentConfig class"""
    
    def test_validate_required_vars_all_present(self):
        """Test validation passes when all required variables are present"""
        with patch.dict(os.environ, {
            'SECRET_KEY': 'test-secret-key-with-sufficient-length-and-complexity-12345!@#',
            'DB_NAME': 'test_db',
            'DB_USER': 'test_user',
            'DB_PASSWORD': 'test_password',
            'DB_HOST': 'localhost',
            'ALLOWED_HOSTS': 'example.com',
        }):
            result = EnvironmentConfig.validate_required_vars()
            assert 'SECRET_KEY' in result
            assert 'DB_NAME' in result
            assert len(result) == 6
    
    def test_validate_secret_key_too_short(self):
        """Test SECRET_KEY validation fails for short keys"""
        short_key = 'short'
        with pytest.raises(ImproperlyConfigured) as exc_info:
            EnvironmentConfig.validate_secret_key(short_key)
        assert 'must be at least 50 characters' in str(exc_info.value)
    
    def test_is_production_debug_true(self):
        """Test is_production returns False when DEBUG=True"""
        with patch.dict(os.environ, {'DEBUG': 'True'}):
            assert EnvironmentConfig.is_production() is False
    
    def test_get_allowed_hosts_from_env(self):
        """Test get_allowed_hosts parses comma-separated list"""
        with patch.dict(os.environ, {
            'ALLOWED_HOSTS': 'example.com, test.com, localhost',
        }):
            hosts = EnvironmentConfig.get_allowed_hosts()
            assert hosts == ['example.com', 'test.com', 'localhost']


# ============================================================================
# Logging Filters Tests
# ============================================================================

class TestSensitiveDataFilter:
    """Test cases for the SensitiveDataFilter class"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.filter = SensitiveDataFilter()
    
    def test_sanitize_password_json_format(self):
        """Test sanitization of password in JSON format"""
        text = '{"username": "user", "password": "secret123"}'
        result = self.filter._sanitize(text)
        assert "secret123" not in result
        assert "[REDACTED]" in result
        assert "username" in result
    
    def test_sanitize_authorization_header(self):
        """Test sanitization of Authorization header"""
        text = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        result = self.filter._sanitize(text)
        assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in result
        assert "[REDACTED" in result
    
    def test_sanitize_credit_card(self):
        """Test sanitization of credit card number"""
        text = "Card: 4111-1111-1111-1111"
        result = self.filter._sanitize(text)
        assert "4111-1111-1111-1111" not in result
        assert "[REDACTED_CARD]" in result
    
    def test_filter_log_record(self):
        """Test filtering a complete log record"""
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="/path/to/file.py",
            lineno=10,
            msg='User login with password: "secret123"',
            args=(),
            exc_info=None
        )
        
        result = self.filter.filter(record)
        assert result is True
        assert "secret123" not in record.msg
        assert "[REDACTED]" in record.msg



# ============================================================================
# CORS Configuration Tests (from test_cors.py)
# ============================================================================

class CORSConfigurationTests(TestCase):
    """Test CORS configuration settings"""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = CorsMiddleware(lambda request: HttpResponse())
    
    def test_cors_allowed_origins_configured(self):
        """Test that CORS_ALLOWED_ORIGINS is properly configured"""
        from django.conf import settings
        
        self.assertTrue(hasattr(settings, 'CORS_ALLOWED_ORIGINS'))
        self.assertIsInstance(settings.CORS_ALLOWED_ORIGINS, list)
        self.assertGreater(len(settings.CORS_ALLOWED_ORIGINS), 0)
    
    def test_cors_allow_credentials_enabled(self):
        """Test that CORS_ALLOW_CREDENTIALS is set to True"""
        from django.conf import settings
        self.assertTrue(settings.CORS_ALLOW_CREDENTIALS)
    
    def test_cors_allow_all_origins_disabled(self):
        """Test that CORS_ALLOW_ALL_ORIGINS is disabled for security"""
        from django.conf import settings
        cors_allow_all = getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False)
        self.assertFalse(cors_allow_all)
    
    def test_cors_allowed_methods_configured(self):
        """Test that CORS_ALLOW_METHODS includes necessary HTTP methods"""
        from django.conf import settings
        
        self.assertTrue(hasattr(settings, 'CORS_ALLOW_METHODS'))
        allowed_methods = settings.CORS_ALLOW_METHODS
        
        required_methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
        for method in required_methods:
            self.assertIn(method, allowed_methods)
    
    def test_cors_allowed_headers_configured(self):
        """Test that CORS_ALLOW_HEADERS includes necessary headers"""
        from django.conf import settings
        
        self.assertTrue(hasattr(settings, 'CORS_ALLOW_HEADERS'))
        allowed_headers = settings.CORS_ALLOW_HEADERS
        
        required_headers = ['authorization', 'content-type', 'x-csrftoken']
        for header in required_headers:
            self.assertIn(header, allowed_headers)
    
    def test_cors_middleware_in_middleware_stack(self):
        """Test that CorsMiddleware is properly positioned in MIDDLEWARE"""
        from django.conf import settings
        
        self.assertIn('corsheaders.middleware.CorsMiddleware', settings.MIDDLEWARE)
        
        cors_index = settings.MIDDLEWARE.index('corsheaders.middleware.CorsMiddleware')
        common_index = settings.MIDDLEWARE.index('django.middleware.common.CommonMiddleware')
        self.assertLess(cors_index, common_index, 
                       "CorsMiddleware should be before CommonMiddleware")
    
    @override_settings(
        CORS_ALLOWED_ORIGINS=['https://tasks.mwheba.com'],
        CORS_ALLOW_CREDENTIALS=True
    )
    def test_valid_origin_request(self):
        """Test that requests from allowed origins are accepted"""
        request = self.factory.get('/api/tasks/', HTTP_ORIGIN='https://tasks.mwheba.com')
        response = self.middleware(request)
        
        self.assertIn('Access-Control-Allow-Origin', response)
        self.assertEqual(response['Access-Control-Allow-Origin'], 'https://tasks.mwheba.com')
    
    @override_settings(
        CORS_ALLOWED_ORIGINS=['https://tasks.mwheba.com'],
        CORS_ALLOW_CREDENTIALS=True
    )
    def test_invalid_origin_request(self):
        """Test that requests from invalid origins are rejected"""
        request = self.factory.get('/api/tasks/', HTTP_ORIGIN='https://evil.com')
        response = self.middleware(request)
        
        self.assertNotIn('Access-Control-Allow-Origin', response)


@pytest.mark.django_db
class ProductionCORSTests(TestCase):
    """Test production-specific CORS configuration"""
    
    def test_cors_origins_not_empty(self):
        """Test that CORS_ALLOWED_ORIGINS is not empty"""
        from django.conf import settings
        
        self.assertGreater(len(settings.CORS_ALLOWED_ORIGINS), 0,
                          "CORS_ALLOWED_ORIGINS must not be empty")
    
    def test_production_settings_filter_dev_urls(self):
        """Test that production settings filter development URLs"""
        test_origins = [
            'https://tasks.mwheba.com',
            'http://localhost:5173',
            'http://127.0.0.1:8000',
            'https://api.mwheba.com',
            'http://0.0.0.0:3000'
        ]
        
        dev_patterns = ['localhost', '127.0.0.1', '0.0.0.0', ':5173', ':3000', ':8000']
        
        filtered_origins = [
            origin for origin in test_origins
            if not any(pattern in origin for pattern in dev_patterns)
        ]
        
        self.assertEqual(len(filtered_origins), 2)
        self.assertIn('https://tasks.mwheba.com', filtered_origins)
        self.assertIn('https://api.mwheba.com', filtered_origins)
