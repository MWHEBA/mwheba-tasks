"""
Integration tests for complete workflows
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from users.models import UserProfile
from clients.models import Client
from tasks.models import Task
from statuses.models import TaskStatus


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user():
    user = User.objects.create_user(
        username="admin",
        email="admin@example.com",
        password="admin123"
    )
    UserProfile.objects.create(user=user, role="admin")
    return user


@pytest.fixture
def test_client():
    return Client.objects.create(
        name="Test Client",
        type="New",
        number="C-001"
    )


@pytest.fixture
def test_status():
    return TaskStatus.objects.create(
        id="pending",
        label="قيد الانتظار",
        color="slate",
        icon="fa-clock",
        order_index=0,
        is_finished=False,
        is_default=True
    )


@pytest.mark.django_db
class TestCompleteTaskWorkflow:
    """Test complete task lifecycle"""
    
    def test_create_task_workflow(self, api_client, admin_user, test_client, test_status):
        """Test creating a task with full workflow"""
        api_client.force_authenticate(user=admin_user)
        
        # Create task
        task_data = {
            "id": "task-1",
            "title": "Test Task",
            "description": "Test description",
            "urgency": "Normal",
            "status": test_status.id,
            "clientId": test_client.id,
            "orderIndex": 0,
            "createdAt": 1234567890
        }
        
        response = api_client.post('/tasks/', task_data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify task exists
        response = api_client.get('/tasks/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
    
    def test_update_task_status_workflow(self, api_client, admin_user, test_client, test_status):
        """Test updating task status"""
        api_client.force_authenticate(user=admin_user)
        
        # Create task
        task = Task.objects.create(
            id="task-1",
            title="Test Task",
            urgency="Normal",
            status=test_status,
            client=test_client,
            order_index=0,
            created_at=1234567890
        )
        
        # Create new status
        new_status = TaskStatus.objects.create(
            id="in-progress",
            label="قيد التنفيذ",
            color="blue",
            icon="fa-spinner",
            order_index=1,
            is_finished=False
        )
        
        # Update task status
        response = api_client.post(
            f'/tasks/{task.id}/update_status/',
            {"statusId": new_status.id},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify status changed
        task.refresh_from_db()
        assert task.status.id == new_status.id


@pytest.mark.django_db
class TestClientTaskRelationship:
    """Test relationship between clients and tasks"""
    
    def test_client_with_tasks(self, api_client, admin_user, test_client, test_status):
        """Test client with multiple tasks"""
        api_client.force_authenticate(user=admin_user)
        
        # Create multiple tasks for client
        for i in range(3):
            Task.objects.create(
                id=f"task-{i}",
                title=f"Task {i}",
                urgency="Normal",
                status=test_status,
                client=test_client,
                order_index=i,
                created_at=1234567890 + i
            )
        
        # Verify tasks exist
        tasks = Task.objects.filter(client=test_client)
        assert tasks.count() == 3
    
    def test_delete_client_cascades_tasks(self, api_client, admin_user, test_client, test_status):
        """Test that deleting client deletes associated tasks"""
        api_client.force_authenticate(user=admin_user)
        
        # Create task for client
        task = Task.objects.create(
            id="task-1",
            title="Test Task",
            urgency="Normal",
            status=test_status,
            client=test_client,
            order_index=0,
            created_at=1234567890
        )
        
        # Delete client
        response = api_client.delete(f'/clients/{test_client.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify task is also deleted
        assert not Task.objects.filter(id=task.id).exists()


@pytest.mark.django_db
class TestUserManagementWorkflow:
    """Test user management workflows"""
    
    def test_create_and_activate_user(self, api_client, admin_user):
        """Test creating and activating a user"""
        api_client.force_authenticate(user=admin_user)
        
        # Create user
        user_data = {
            "username": "newuser",
            "email": "new@example.com",
            "password": "password123",
            "first_name": "New",
            "last_name": "User",
            "role": "designer"
        }
        
        response = api_client.post('/users/', user_data)
        assert response.status_code == status.HTTP_201_CREATED
        
        user_id = response.data['id']
        
        # Toggle active status
        response = api_client.post(f'/users/{user_id}/toggle_active/')
        assert response.status_code == status.HTTP_200_OK
    
    def test_update_user_role(self, api_client, admin_user):
        """Test updating user role"""
        api_client.force_authenticate(user=admin_user)
        
        # Create user
        user = User.objects.create_user(
            username="testuser",
            password="password123"
        )
        UserProfile.objects.create(user=user, role="designer")
        
        # Update role
        response = api_client.patch(
            f'/users/{user.id}/',
            {"role": "print_manager"},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify role changed
        user.profile.refresh_from_db()
        assert user.profile.role == "print_manager"
