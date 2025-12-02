"""
Integration tests for custom exception handler with Django REST Framework.
Tests Requirements 1.5 and 3.2
"""
import pytest
from django.test import override_settings
from django.db import DatabaseError
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from backend.utils import custom_exception_handler


class TestView(APIView):
    """Test view for exception handler testing"""
    
    def get(self, request):
        error_type = request.query_params.get('error_type')
        
        if error_type == 'database':
            raise DatabaseError("Connection to database 'production_db' at host '192.168.1.100' failed")
        elif error_type == 'file_path':
            raise ValueError("Error in /home/user/project/backend/models.py at line 42")
        elif error_type == 'sql':
            raise DatabaseError("Error executing: SELECT * FROM users WHERE id=1")
        
        return Response({'status': 'ok'})


@pytest.mark.django_db
class TestExceptionHandlerIntegration:
    """Test custom exception handler integration"""
    
    def setup_method(self):
        """Setup test request factory"""
        self.factory = APIRequestFactory()
        self.view = TestView.as_view()
    
    @override_settings(DEBUG=False)
    def test_database_error_production_sanitized(self):
        """Test that database errors are sanitized in production"""
        request = self.factory.get('/test/?error_type=database')
        
        try:
            response = self.view(request)
        except DatabaseError as exc:
            context = {'request': request, 'view': TestView()}
            response = custom_exception_handler(exc, context)
        
        # Check response structure
        assert response.status_code == 500
        assert 'error' in response.data
        
        # Check that sensitive data is not in response
        error_message = str(response.data['error']['message'])
        assert 'production_db' not in error_message
        assert '192.168.1.100' not in error_message
        assert 'حدث خطأ في قاعدة البيانات' in error_message
    
    @override_settings(DEBUG=True)
    def test_database_error_development_full_message(self):
        """Test that database errors show full message in development"""
        request = self.factory.get('/test/?error_type=database')
        
        try:
            response = self.view(request)
        except DatabaseError as exc:
            context = {'request': request, 'view': TestView()}
            response = custom_exception_handler(exc, context)
        
        # In development, full error message should be present
        error_message = str(response.data['error']['message'])
        assert 'production_db' in error_message or 'database' in error_message.lower()
    
    @override_settings(DEBUG=False)
    def test_file_path_error_production_sanitized(self):
        """Test that file paths are sanitized in production"""
        request = self.factory.get('/test/?error_type=file_path')
        
        try:
            response = self.view(request)
        except ValueError as exc:
            context = {'request': request, 'view': TestView()}
            response = custom_exception_handler(exc, context)
        
        # Check that file path is sanitized
        error_message = str(response.data['error']['message'])
        assert '/home/user/project/backend/models.py' not in error_message
        assert '[FILE_PATH]' in error_message
    
    @override_settings(DEBUG=False)
    def test_sql_query_error_production_sanitized(self):
        """Test that SQL queries are sanitized in production"""
        request = self.factory.get('/test/?error_type=sql')
        
        try:
            response = self.view(request)
        except DatabaseError as exc:
            context = {'request': request, 'view': TestView()}
            response = custom_exception_handler(exc, context)
        
        # Check that SQL query details are not exposed
        error_message = str(response.data['error']['message'])
        # Should show generic database error message
        assert 'حدث خطأ في قاعدة البيانات' in error_message
