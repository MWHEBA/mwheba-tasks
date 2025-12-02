"""
Unit tests for environment configuration validation module.
"""

import os
import pytest
from unittest.mock import patch
from django.core.exceptions import ImproperlyConfigured
from backend.env_config import EnvironmentConfig


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
    
    def test_validate_required_vars_missing(self):
        """Test validation fails when required variables are missing"""
        with patch.dict(os.environ, {
            'SECRET_KEY': 'test-key',
            'DB_NAME': 'test_db',
            # Missing DB_USER, DB_PASSWORD, DB_HOST, ALLOWED_HOSTS
        }, clear=True):
            with pytest.raises(ImproperlyConfigured) as exc_info:
                EnvironmentConfig.validate_required_vars()
            assert 'Missing required environment variables' in str(exc_info.value)
    
    def test_validate_required_vars_empty(self):
        """Test validation fails when required variables are empty"""
        with patch.dict(os.environ, {
            'SECRET_KEY': 'test-secret-key-with-sufficient-length-and-complexity-12345!@#',
            'DB_NAME': '',  # Empty
            'DB_USER': 'test_user',
            'DB_PASSWORD': 'test_password',
            'DB_HOST': 'localhost',
            'ALLOWED_HOSTS': 'example.com',
        }):
            with pytest.raises(ImproperlyConfigured) as exc_info:
                EnvironmentConfig.validate_required_vars()
            assert 'Empty required environment variables' in str(exc_info.value)
    
    def test_validate_secret_key_too_short(self):
        """Test SECRET_KEY validation fails for short keys"""
        short_key = 'short'
        with pytest.raises(ImproperlyConfigured) as exc_info:
            EnvironmentConfig.validate_secret_key(short_key)
        assert 'must be at least 50 characters' in str(exc_info.value)
    
    def test_validate_secret_key_weak_pattern(self):
        """Test SECRET_KEY validation fails for weak patterns"""
        weak_key = 'django-insecure-' + 'x' * 50
        with pytest.raises(ImproperlyConfigured) as exc_info:
            EnvironmentConfig.validate_secret_key(weak_key)
        assert 'weak/default pattern' in str(exc_info.value)
    
    def test_validate_secret_key_no_diversity(self):
        """Test SECRET_KEY validation fails without character diversity"""
        no_diversity_key = 'a' * 60  # Only letters
        with pytest.raises(ImproperlyConfigured) as exc_info:
            EnvironmentConfig.validate_secret_key(no_diversity_key)
        assert 'mix of letters' in str(exc_info.value)
    
    def test_validate_secret_key_valid(self):
        """Test SECRET_KEY validation passes for strong keys"""
        strong_key = 'my-very-strong-production-key-with-numbers-123-and-special-chars!@#$%'
        assert EnvironmentConfig.validate_secret_key(strong_key) is True
    
    def test_get_secret_key_missing(self):
        """Test get_secret_key fails when SECRET_KEY not set"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ImproperlyConfigured) as exc_info:
                EnvironmentConfig.get_secret_key()
            assert 'SECRET_KEY environment variable is not set' in str(exc_info.value)
    
    def test_get_secret_key_development(self):
        """Test get_secret_key returns key in development without strict validation"""
        with patch.dict(os.environ, {
            'SECRET_KEY': 'short-dev-key',
            'DEBUG': 'True',
        }):
            # Should not raise in development mode
            key = EnvironmentConfig.get_secret_key()
            assert key == 'short-dev-key'
    
    def test_get_secret_key_production(self):
        """Test get_secret_key validates key in production"""
        with patch.dict(os.environ, {
            'SECRET_KEY': 'short',
            'DEBUG': 'False',
        }):
            with pytest.raises(ImproperlyConfigured):
                EnvironmentConfig.get_secret_key()
    
    def test_is_production_debug_true(self):
        """Test is_production returns False when DEBUG=True"""
        with patch.dict(os.environ, {'DEBUG': 'True'}):
            assert EnvironmentConfig.is_production() is False
    
    def test_is_production_debug_false(self):
        """Test is_production returns True when DEBUG=False"""
        with patch.dict(os.environ, {'DEBUG': 'False'}):
            assert EnvironmentConfig.is_production() is True
    
    def test_is_production_debug_not_set(self):
        """Test is_production returns True when DEBUG not set (defaults to production)"""
        with patch.dict(os.environ, {}, clear=True):
            assert EnvironmentConfig.is_production() is True
    
    def test_is_production_debug_variations(self):
        """Test is_production handles various DEBUG values"""
        # Development values
        for debug_val in ['True', 'true', '1', 'yes', 'YES']:
            with patch.dict(os.environ, {'DEBUG': debug_val}):
                assert EnvironmentConfig.is_production() is False, f"Failed for DEBUG={debug_val}"
        
        # Production values
        for debug_val in ['False', 'false', '0', 'no', 'NO', '']:
            with patch.dict(os.environ, {'DEBUG': debug_val}):
                assert EnvironmentConfig.is_production() is True, f"Failed for DEBUG={debug_val}"
    
    def test_get_allowed_hosts_from_env(self):
        """Test get_allowed_hosts parses comma-separated list"""
        with patch.dict(os.environ, {
            'ALLOWED_HOSTS': 'example.com, test.com, localhost',
        }):
            hosts = EnvironmentConfig.get_allowed_hosts()
            assert hosts == ['example.com', 'test.com', 'localhost']
    
    def test_get_allowed_hosts_empty_production(self):
        """Test get_allowed_hosts fails when empty in production"""
        with patch.dict(os.environ, {
            'ALLOWED_HOSTS': '',
            'DEBUG': 'False',
        }):
            with pytest.raises(ImproperlyConfigured) as exc_info:
                EnvironmentConfig.get_allowed_hosts()
            assert 'ALLOWED_HOSTS must be set in production' in str(exc_info.value)
    
    def test_get_allowed_hosts_empty_development(self):
        """Test get_allowed_hosts returns defaults in development"""
        with patch.dict(os.environ, {
            'ALLOWED_HOSTS': '',
            'DEBUG': 'True',
        }):
            hosts = EnvironmentConfig.get_allowed_hosts()
            assert 'localhost' in hosts
            assert '127.0.0.1' in hosts
    
    def test_validate_production_config_development(self):
        """Test validate_production_config skips validation in development"""
        with patch.dict(os.environ, {'DEBUG': 'True'}):
            result = EnvironmentConfig.validate_production_config()
            assert result['is_production'] is False
            assert 'development mode' in result['message']
    
    def test_validate_production_config_success(self):
        """Test validate_production_config passes with valid production config"""
        with patch.dict(os.environ, {
            'DEBUG': 'False',
            'SECRET_KEY': 'my-very-strong-production-key-with-numbers-123-and-special-chars!@#',
            'DB_NAME': 'prod_db',
            'DB_USER': 'prod_user',
            'DB_PASSWORD': 'prod_password',
            'DB_HOST': 'db.example.com',
            'ALLOWED_HOSTS': 'example.com,www.example.com',
        }):
            result = EnvironmentConfig.validate_production_config()
            assert result['is_production'] is True
            assert 'validated successfully' in result['message']
            assert len(result['allowed_hosts']) == 2
    
    def test_validate_production_config_debug_true_fails(self):
        """Test validate_production_config fails when DEBUG=True in production check"""
        with patch.dict(os.environ, {
            'DEBUG': 'True',
            'SECRET_KEY': 'my-very-strong-production-key-with-numbers-123-and-special-chars!@#',
            'DB_NAME': 'prod_db',
            'DB_USER': 'prod_user',
            'DB_PASSWORD': 'prod_password',
            'DB_HOST': 'db.example.com',
            'ALLOWED_HOSTS': 'example.com',
        }):
            # Should skip validation in development
            result = EnvironmentConfig.validate_production_config()
            assert result['is_production'] is False
