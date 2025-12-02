"""
Tests for custom task actions and CASCADE delete
"""
import pytest
import time
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status as http_status
from tasks.models import Task, ActivityLog, Comment
from clients.models import Client
from statuses.models import TaskStatus
from users.models import UserProfile


@pytest.mark.django_db
class TestCustomActions(TestCase):
    """Test custom actions in TaskViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client_api = APIClient()
        
        self.test_user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        
        self.user_profile = UserProfile.objects.create(
            user=self.test_user,
            role='admin'
        )
        
        self.client_api.force_authenticate(user=self.test_user)
        
        self.test_client = Client.objects.create(
            id='test-client-1',
            name='Test Client',
            type='New',
            number='C-001'
        )
        
        self.pending_status = TaskStatus.objects.create(
            id='pending',
            label='قيد الانتظار',
            color='slate',
            icon='fa-clock',
            order_index=0,
            is_finished=False
        )
        
        self.test_task = Task.objects.create(
            id='test-task-1',
            title='Test Task',
            description='Test Description',
            urgency='Normal',
            status=self.pending_status,
            client=self.test_client,
            order_index=0,
            created_at=int(time.time() * 1000)
        )
    
    def test_add_activity_success(self):
        """Test adding an activity log entry to a task"""
        url = f'/tasks/{self.test_task.id}/add_activity/'
        data = {
            'type': 'CUSTOM_ACTION',
            'description': 'Test activity description',
            'details': {'key': 'value'}
        }
        
        response = self.client_api.post(url, data, format='json')
        
        assert response.status_code == http_status.HTTP_201_CREATED
        assert 'id' in response.data
        assert response.data['type'] == 'CUSTOM_ACTION'
    
    def test_overdue_tasks(self):
        """Test getting overdue tasks"""
        past_deadline = int((time.time() - 86400) * 1000)
        overdue_task = Task.objects.create(
            id='overdue-task-1',
            title='Overdue Task',
            urgency='Urgent',
            status=self.pending_status,
            client=self.test_client,
            order_index=1,
            deadline=past_deadline,
            created_at=int(time.time() * 1000)
        )
        
        url = '/tasks/overdue/'
        response = self.client_api.get(url)
        
        assert response.status_code == http_status.HTTP_200_OK
        task_ids = [task['id'] for task in response.data]
        assert overdue_task.id in task_ids


@pytest.mark.django_db
class TestCascadeDelete:
    """Test CASCADE delete behavior for parent-child task relationships"""
    
    def test_delete_parent_deletes_subtasks(self):
        """Test that deleting a parent task automatically deletes all subtasks"""
        client = Client.objects.create(
            id='test-client-cascade',
            name='Test Client',
            type='New',
            number='C-001'
        )
        
        status = TaskStatus.objects.create(
            id='test-status-cascade',
            label='Test Status',
            color='blue',
            icon='fa-test',
            order_index=0,
            is_finished=False,
            is_default=True
        )
        
        parent_task = Task.objects.create(
            id='parent-task-cascade',
            title='Parent Task',
            urgency='Normal',
            status=status,
            client=client,
            order_index=0,
            created_at=int(time.time() * 1000)
        )
        
        subtask1 = Task.objects.create(
            id='subtask-1-cascade',
            title='Subtask 1',
            urgency='Normal',
            status=status,
            client=client,
            parent=parent_task,
            order_index=0,
            created_at=int(time.time() * 1000)
        )
        
        assert Task.objects.filter(parent=parent_task).count() == 1
        
        parent_task.delete()
        
        assert Task.objects.filter(id='subtask-1-cascade').exists() == False
        
        status.delete()
        client.delete()
