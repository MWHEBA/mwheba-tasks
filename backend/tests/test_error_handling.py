"""
Tests for error handling and sanitization
"""
import pytest
from django.test import override_settings
from django.db import DatabaseError
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView
from rest_framework.response import Response
from backend.utils import custom_exception_handler, sanitize_error_message, get_safe_error_message


class TestView(APIView):
    """Test view for exception handler testing"""
    
    def get(self, request):
        error_type = request.query_params.get('error_type')
        
        if error_type == 'database':
            raise DatabaseError("Connection to database 'production_db' at host '192.168.1.100' failed")
        elif error_type == 'file_path':
            raise ValueError("Error in /home/user/project/backend/models.py at line 42")
        
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
        
        assert response.status_code == 500
        assert 'error' in response.data
        
        error_message = str(response.data['error']['message'])
        assert 'production_db' not in error_message
        assert '192.168.1.100' not in error_message


class TestErrorSanitization:
    """Test error message sanitization in production mode"""
    
    def test_sanitize_file_paths_unix(self):
        """Test that Unix file paths are sanitized in production"""
        message = "Error in /home/user/project/backend/models.py at line 42"
        sanitized = sanitize_error_message(message, is_production=True)
        assert '/home/user/project/backend/models.py' not in sanitized
        assert '[FILE_PATH]' in sanitized
    
    def test_sanitize_database_connection_mysql(self):
        """Test that MySQL connection strings are sanitized"""
        message = "Connection failed: mysql://user:pass@localhost:3306/mydb"
        sanitized = sanitize_error_message(message, is_production=True)
        assert 'user:pass' not in sanitized
        assert '[DATABASE_CONNECTION]' in sanitized
    
    def test_no_sanitization_in_development(self):
        """Test that messages are not sanitized in development mode"""
        message = "Error in /home/user/project/backend/models.py"
        sanitized = sanitize_error_message(message, is_production=False)
        assert sanitized == message
