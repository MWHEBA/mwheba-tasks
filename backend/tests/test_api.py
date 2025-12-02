"""
API endpoint tests
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from clients.models import Client
from tasks.models import Task
from statuses.models import TaskStatus
from users.models import UserProfile


@pytest.fixture
def api_client():
    """Create API client"""
    return APIClient()


@pytest.fixture
def admin_user():
    """Create admin user"""
    user = User.objects.create_user(
        username="admin",
        email="admin@example.com",
        password="admin123"
    )
    UserProfile.objects.create(user=user, role="admin")
    return user


@pytest.fixture
def designer_user():
    """Create designer user"""
    user = User.objects.create_user(
        username="designer",
        email="designer@example.com",
        password="designer123"
    )
    UserProfile.objects.create(user=user, role="designer")
    return user


@pytest.mark.django_db
class TestClientAPI:
    """Tests for Client API endpoints"""
    
    def test_list_clients(self, api_client, admin_user):
        """Test listing clients"""
        api_client.force_authenticate(user=admin_user)
        
        Client.objects.create(name="Client 1", type="New", number="C-001")
        Client.objects.create(name="Client 2", type="Existing", number="C-002")
        
        response = api_client.get('/clients/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 2
    
    def test_create_client(self, api_client, admin_user):
        """Test creating a client"""
        api_client.force_authenticate(user=admin_user)
        
        data = {
            "name": "New Client",
            "type": "New",
            "number": "C-003",
            "notes": "Test notes"
        }
        
        response = api_client.post('/clients/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Client.objects.filter(name="New Client").exists()
    
    def test_update_client(self, api_client, admin_user):
        """Test updating a client"""
        api_client.force_authenticate(user=admin_user)
        
        client = Client.objects.create(
            name="Old Name",
            type="New",
            number="C-004"
        )
        
        data = {
            "name": "Updated Name",
            "type": "Existing",
            "number": "C-004"
        }
        
        response = api_client.put(f'/clients/{client.id}/', data)
        
        assert response.status_code == status.HTTP_200_OK
        client.refresh_from_db()
        assert client.name == "Updated Name"
    
    def test_delete_client(self, api_client, admin_user):
        """Test deleting a client"""
        api_client.force_authenticate(user=admin_user)
        
        client = Client.objects.create(
            name="To Delete",
            type="New",
            number="C-005"
        )
        
        response = api_client.delete(f'/clients/{client.id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Client.objects.filter(id=client.id).exists()


@pytest.mark.django_db
class TestTaskAPI:
    """Tests for Task API endpoints"""
    
    @pytest.fixture
    def client_obj(self):
        return Client.objects.create(
            name="Test Client",
            type="New",
            number="C-001"
        )
    
    @pytest.fixture
    def task_status(self):
        return TaskStatus.objects.create(
            id="pending",
            label="قيد الانتظار",
            color="slate",
            icon="fa-clock",
            order_index=0,
            is_finished=False,
            is_default=True
        )
    
    def test_list_tasks(self, api_client, admin_user, client_obj, task_status):
        """Test listing tasks"""
        api_client.force_authenticate(user=admin_user)
        
        Task.objects.create(
            id="task-1",
            title="Task 1",
            urgency="Normal",
            status=task_status,
            client=client_obj,
            order_index=0,
            created_at=1234567890
        )
        
        response = api_client.get('/tasks/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
    
    def test_create_task(self, api_client, admin_user, client_obj, task_status):
        """Test creating a task"""
        api_client.force_authenticate(user=admin_user)
        
        data = {
            "id": "new-task",
            "title": "New Task",
            "description": "Test description",
            "urgency": "Normal",
            "status": task_status.id,
            "clientId": client_obj.id,
            "orderIndex": 0,
            "createdAt": 1234567890
        }
        
        response = api_client.post('/tasks/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Task.objects.filter(title="New Task").exists()


@pytest.mark.django_db
class TestUserAPI:
    """Tests for User API endpoints"""
    
    def test_list_users(self, api_client, admin_user):
        """Test listing users"""
        api_client.force_authenticate(user=admin_user)
        
        response = api_client.get('/users/')
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_create_user(self, api_client, admin_user):
        """Test creating a user"""
        api_client.force_authenticate(user=admin_user)
        
        data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "password123",
            "first_name": "New",
            "last_name": "User",
            "role": "designer"
        }
        
        response = api_client.post('/users/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(username="newuser").exists()


@pytest.mark.django_db
class TestAuthAPI:
    """Tests for Authentication API"""
    
    def test_login(self, api_client, admin_user):
        """Test user login"""
        data = {
            "username": "admin",
            "password": "admin123"
        }
        
        response = api_client.post('/auth/login/', data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials"""
        data = {
            "username": "invalid",
            "password": "wrong"
        }
        
        response = api_client.post('/auth/login/', data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
