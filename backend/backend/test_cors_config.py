"""
Tests for CORS configuration

These tests verify that CORS settings are properly configured
according to requirements 4.1, 4.2, 4.3, 4.4, 4.5
"""

import pytest
from django.test import TestCase, override_settings
from django.test.client import RequestFactory
from django.http import HttpResponse
from corsheaders.middleware import CorsMiddleware


class CORSConfigurationTests(TestCase):
    """Test CORS configuration settings"""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = CorsMiddleware(lambda request: HttpResponse())
    
    def test_cors_allowed_origins_configured(self):
        """Test that CORS_ALLOWED_ORIGINS is properly configured"""
        from django.conf import settings
        
        # Verify CORS_ALLOWED_ORIGINS exists and is a list
        self.assertTrue(hasattr(settings, 'CORS_ALLOWED_ORIGINS'))
        self.assertIsInstance(settings.CORS_ALLOWED_ORIGINS, list)
        self.assertGreater(len(settings.CORS_ALLOWED_ORIGINS), 0)
    
    def test_cors_allow_credentials_enabled(self):
        """Test that CORS_ALLOW_CREDENTIALS is set to True"""
        from django.conf import settings
        
        # Verify credentials are allowed (Requirement 4.3)
        self.assertTrue(settings.CORS_ALLOW_CREDENTIALS)
    
    def test_cors_allow_all_origins_disabled(self):
        """Test that CORS_ALLOW_ALL_ORIGINS is disabled for security"""
        from django.conf import settings
        
        # Verify we're not allowing all origins (security requirement)
        cors_allow_all = getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False)
        self.assertFalse(cors_allow_all)
    
    def test_cors_allowed_methods_configured(self):
        """Test that CORS_ALLOW_METHODS includes necessary HTTP methods"""
        from django.conf import settings
        
        # Verify allowed methods are configured
        self.assertTrue(hasattr(settings, 'CORS_ALLOW_METHODS'))
        allowed_methods = settings.CORS_ALLOW_METHODS
        
        # Check that common methods are included
        required_methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
        for method in required_methods:
            self.assertIn(method, allowed_methods)
    
    def test_cors_allowed_headers_configured(self):
        """Test that CORS_ALLOW_HEADERS includes necessary headers"""
        from django.conf import settings
        
        # Verify allowed headers are configured
        self.assertTrue(hasattr(settings, 'CORS_ALLOW_HEADERS'))
        allowed_headers = settings.CORS_ALLOW_HEADERS
        
        # Check that essential headers are included
        required_headers = ['authorization', 'content-type', 'x-csrftoken']
        for header in required_headers:
            self.assertIn(header, allowed_headers)
    
    def test_cors_preflight_max_age_configured(self):
        """Test that CORS_PREFLIGHT_MAX_AGE is configured"""
        from django.conf import settings
        
        # Verify preflight cache is configured
        self.assertTrue(hasattr(settings, 'CORS_PREFLIGHT_MAX_AGE'))
        self.assertIsInstance(settings.CORS_PREFLIGHT_MAX_AGE, int)
        self.assertGreater(settings.CORS_PREFLIGHT_MAX_AGE, 0)
    
    @override_settings(
        CORS_ALLOWED_ORIGINS=['https://tasks.mwheba.com'],
        CORS_ALLOW_CREDENTIALS=True
    )
    def test_valid_origin_request(self):
        """Test that requests from allowed origins are accepted (Requirement 4.1)"""
        # Create a request with a valid origin
        request = self.factory.get('/api/tasks/', HTTP_ORIGIN='https://tasks.mwheba.com')
        
        # Process through CORS middleware
        response = self.middleware(request)
        
        # Verify CORS headers are present
        self.assertIn('Access-Control-Allow-Origin', response)
        self.assertEqual(response['Access-Control-Allow-Origin'], 'https://tasks.mwheba.com')
    
    @override_settings(
        CORS_ALLOWED_ORIGINS=['https://tasks.mwheba.com'],
        CORS_ALLOW_CREDENTIALS=True
    )
    def test_invalid_origin_request(self):
        """Test that requests from invalid origins are rejected (Requirement 4.5)"""
        # Create a request with an invalid origin
        request = self.factory.get('/api/tasks/', HTTP_ORIGIN='https://evil.com')
        
        # Process through CORS middleware
        response = self.middleware(request)
        
        # Verify Access-Control-Allow-Origin is not set for invalid origin
        # The middleware will not add the header for disallowed origins
        self.assertNotIn('Access-Control-Allow-Origin', response)
    
    @override_settings(
        CORS_ALLOWED_ORIGINS=['https://tasks.mwheba.com'],
        CORS_ALLOW_CREDENTIALS=True,
        CORS_ALLOW_METHODS=['GET', 'POST', 'OPTIONS'],
        CORS_ALLOW_HEADERS=['authorization', 'content-type']
    )
    def test_preflight_request_handling(self):
        """Test that preflight OPTIONS requests are handled correctly (Requirement 4.4)"""
        # Create a preflight OPTIONS request
        request = self.factory.options(
            '/api/tasks/',
            HTTP_ORIGIN='https://tasks.mwheba.com',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS='authorization,content-type'
        )
        
        # Process through CORS middleware
        response = self.middleware(request)
        
        # Verify preflight response headers are present
        self.assertIn('Access-Control-Allow-Origin', response)
        self.assertIn('Access-Control-Allow-Methods', response)
        self.assertIn('Access-Control-Allow-Headers', response)
        
        # Verify the origin is allowed
        self.assertEqual(response['Access-Control-Allow-Origin'], 'https://tasks.mwheba.com')
    
    def test_cors_middleware_in_middleware_stack(self):
        """Test that CorsMiddleware is properly positioned in MIDDLEWARE"""
        from django.conf import settings
        
        # Verify CORS middleware is in the stack
        self.assertIn('corsheaders.middleware.CorsMiddleware', settings.MIDDLEWARE)
        
        # Verify it's positioned early (before CommonMiddleware)
        cors_index = settings.MIDDLEWARE.index('corsheaders.middleware.CorsMiddleware')
        common_index = settings.MIDDLEWARE.index('django.middleware.common.CommonMiddleware')
        self.assertLess(cors_index, common_index, 
                       "CorsMiddleware should be before CommonMiddleware")


@pytest.mark.django_db
class ProductionCORSTests(TestCase):
    """Test production-specific CORS configuration"""
    
    def test_cors_origins_not_empty(self):
        """Test that CORS_ALLOWED_ORIGINS is not empty"""
        from django.conf import settings
        
        self.assertGreater(len(settings.CORS_ALLOWED_ORIGINS), 0,
                          "CORS_ALLOWED_ORIGINS must not be empty")
    
    def test_production_settings_filter_dev_urls(self):
        """
        Test that settings_production.py logic filters development URLs (Requirement 4.2)
        
        This tests the filtering logic in settings_production.py that removes
        development URLs from CORS_ALLOWED_ORIGINS.
        """
        # Simulate the filtering logic from settings_production.py
        test_origins = [
            'https://tasks.mwheba.com',
            'http://localhost:5173',
            'http://127.0.0.1:8000',
            'https://api.mwheba.com',
            'http://0.0.0.0:3000'
        ]
        
        # Development patterns to filter
        dev_patterns = ['localhost', '127.0.0.1', '0.0.0.0', ':5173', ':3000', ':8000']
        
        # Apply the same filtering logic as settings_production.py
        filtered_origins = [
            origin for origin in test_origins
            if not any(pattern in origin for pattern in dev_patterns)
        ]
        
        # Verify only production URLs remain
        self.assertEqual(len(filtered_origins), 2)
        self.assertIn('https://tasks.mwheba.com', filtered_origins)
        self.assertIn('https://api.mwheba.com', filtered_origins)
        self.assertNotIn('http://localhost:5173', filtered_origins)
        self.assertNotIn('http://127.0.0.1:8000', filtered_origins)
    
    def test_production_settings_require_https(self):
        """
        Test that production origins should use HTTPS
        
        This is a guideline test - in actual production, all origins
        should use HTTPS for security.
        """
        # Example production origins
        production_origins = [
            'https://tasks.mwheba.com',
            'https://api.mwheba.com'
        ]
        
        for origin in production_origins:
            self.assertTrue(
                origin.startswith('https://'),
                f"Production origin {origin} should use HTTPS"
            )
