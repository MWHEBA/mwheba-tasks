"""
Pytest configuration for Django backend tests
"""
import pytest
from django.core.management import call_command
from django.db import connection


@pytest.fixture(scope='session')
def django_db_setup(django_db_setup, django_db_blocker):
    """
    Custom database setup for tests.
    All models are now managed=True, so Django migrations handle table creation.
    This fixture is kept for any additional test setup if needed.
    """
    # No need to manually create tables anymore since models are managed=True
    # Django migrations will handle table creation
    pass
