"""
Test error response sanitization functionality.
Tests Requirements 1.5 and 3.2
"""
import pytest
from django.test import override_settings
from django.db import DatabaseError
from backend.utils import sanitize_error_message, get_safe_error_message


class TestErrorSanitization:
    """Test error message sanitization in production mode"""
    
    def test_sanitize_file_paths_unix(self):
        """Test that Unix file paths are sanitized in production"""
        message = "Error in /home/user/project/backend/models.py at line 42"
        sanitized = sanitize_error_message(message, is_production=True)
        assert '/home/user/project/backend/models.py' not in sanitized
        assert '[FILE_PATH]' in sanitized
    
    def test_sanitize_file_paths_windows(self):
        """Test that Windows file paths are sanitized in production"""
        message = "Error in C:\\Users\\Admin\\project\\backend\\models.py"
        sanitized = sanitize_error_message(message, is_production=True)
        assert 'C:\\Users\\Admin\\project\\backend\\models.py' not in sanitized
        assert '[FILE_PATH]' in sanitized
    
    def test_sanitize_database_connection_mysql(self):
        """Test that MySQL connection strings are sanitized"""
        message = "Connection failed: mysql://user:pass@localhost:3306/mydb"
        sanitized = sanitize_error_message(message, is_production=True)
        assert 'user:pass' not in sanitized
        assert '[DATABASE_CONNECTION]' in sanitized
    
    def test_sanitize_database_connection_postgresql(self):
        """Test that PostgreSQL connection strings are sanitized"""
        message = "Connection failed: postgresql://admin:secret@db.example.com/production"
        sanitized = sanitize_error_message(message, is_production=True)
        assert 'admin:secret' not in sanitized
        assert '[DATABASE_CONNECTION]' in sanitized
    
    def test_sanitize_sql_queries(self):
        """Test that SQL queries are sanitized"""
        message = "Error executing: SELECT * FROM users WHERE password='secret'"
        sanitized = sanitize_error_message(message, is_production=True)
        assert "SELECT * FROM users" not in sanitized
        assert 'SELECT [QUERY] FROM' in sanitized
    
    def test_sanitize_environment_variables(self):
        """Test that environment variable values are sanitized"""
        message = "Config error: SECRET_KEY=django-insecure-abc123xyz"
        sanitized = sanitize_error_message(message, is_production=True)
        assert 'django-insecure-abc123xyz' not in sanitized
        assert 'SECRET_KEY=[REDACTED]' in sanitized
    
    def test_no_sanitization_in_development(self):
        """Test that messages are not sanitized in development mode"""
        message = "Error in /home/user/project/backend/models.py"
        sanitized = sanitize_error_message(message, is_production=False)
        assert sanitized == message
    
    def test_database_error_generic_message_production(self):
        """Test that database errors return generic message in production"""
        exc = DatabaseError("Connection to database 'mydb' failed at host 'localhost'")
        safe_message = get_safe_error_message(exc, is_production=True)
        assert 'mydb' not in safe_message
        assert 'localhost' not in safe_message
        assert safe_message == 'حدث خطأ في قاعدة البيانات'
    
    def test_database_error_full_message_development(self):
        """Test that database errors return full message in development"""
        exc = DatabaseError("Connection to database 'mydb' failed at host 'localhost'")
        safe_message = get_safe_error_message(exc, is_production=False)
        assert 'mydb' in safe_message
        assert 'localhost' in safe_message
    
    def test_non_database_error_sanitized_production(self):
        """Test that non-database errors are sanitized in production"""
        exc = ValueError("Invalid value in /home/user/config.py")
        safe_message = get_safe_error_message(exc, is_production=True)
        assert '/home/user/config.py' not in safe_message
        assert '[FILE_PATH]' in safe_message
