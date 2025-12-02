"""
Tests for permissions and authorization
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from users.models import UserProfile
from clients.models import Client


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user():
    user = User.objects.create_user(username="admin", password="admin123")
    UserProfile.objects.create(user=user, role="admin")
    return user


@pytest.fixture
def designer_user():
    user = User.objects.create_user(username="designer", password="designer123")
    UserProfile.objects.create(user=user, role="designer")
    return user


@pytest.fixture
def print_manager_user():
    user = User.objects.create_user(username="printmgr", password="print123")
    UserProfile.objects.create(user=user, role="print_manager")
    return user


@pytest.mark.django_db
class TestAdminPermissions:
    """Tests for admin user permissions"""
    
    def test_admin_can_create_users(self, api_client, admin_user):
        """Admin can create new users"""
        api_client.force_authenticate(user=admin_user)
        
        data = {
            "username": "newuser",
            "email": "new@example.com",
            "password": "password123",
            "first_name": "New",
            "last_name": "User",
            "role": "designer"
        }
        
        response = api_client.post('/users/', data)
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_admin_can_delete_users(self, api_client, admin_user, designer_user):
        """Admin can delete users"""
        api_client.force_authenticate(user=admin_user)
        
        response = api_client.delete(f'/users/{designer_user.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
    
    def test_admin_can_manage_clients(self, api_client, admin_user):
        """Admin can manage clients"""
        api_client.force_authenticate(user=admin_user)
        
        data = {
            "name": "Test Client",
            "type": "New",
            "number": "C-001"
        }
        
        response = api_client.post('/clients/', data)
        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestDesignerPermissions:
    """Tests for designer user permissions"""
    
    def test_designer_cannot_create_users(self, api_client, designer_user):
        """Designer cannot create users"""
        api_client.force_authenticate(user=designer_user)
        
        data = {
            "username": "newuser",
            "email": "new@example.com",
            "password": "password123",
            "role": "designer"
        }
        
        response = api_client.post('/users/', data)
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]
    
    def test_designer_can_view_tasks(self, api_client, designer_user):
        """Designer can view tasks"""
        api_client.force_authenticate(user=designer_user)
        
        response = api_client.get('/tasks/')
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestPrintManagerPermissions:
    """Tests for print manager permissions"""
    
    def test_print_manager_can_view_tasks(self, api_client, print_manager_user):
        """Print manager can view tasks"""
        api_client.force_authenticate(user=print_manager_user)
        
        response = api_client.get('/tasks/')
        assert response.status_code == status.HTTP_200_OK
    
    def test_print_manager_cannot_create_users(self, api_client, print_manager_user):
        """Print manager cannot create users"""
        api_client.force_authenticate(user=print_manager_user)
        
        data = {
            "username": "newuser",
            "password": "password123",
            "role": "designer"
        }
        
        response = api_client.post('/users/', data)
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]


@pytest.mark.django_db
class TestUnauthenticatedAccess:
    """Tests for unauthenticated access"""
    
    def test_unauthenticated_cannot_access_tasks(self, api_client):
        """Unauthenticated users cannot access tasks"""
        response = api_client.get('/tasks/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_unauthenticated_cannot_access_clients(self, api_client):
        """Unauthenticated users cannot access clients"""
        response = api_client.get('/clients/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_unauthenticated_can_access_login(self, api_client):
        """Unauthenticated users can access login endpoint"""
        data = {
            "username": "test",
            "password": "test"
        }
        
        response = api_client.post('/auth/login/', data)
        # Should return 401 for invalid credentials, not 403
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
