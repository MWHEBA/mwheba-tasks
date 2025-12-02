"""
Tests for custom actions in TaskViewSet.
Tests the add_activity, overdue, urgent, and add_reply actions.
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
        
        # Create a test user with admin role
        self.test_user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        
        # Create user profile with admin role
        self.user_profile = UserProfile.objects.create(
            user=self.test_user,
            role='admin'
        )
        
        # Authenticate the client
        self.client_api.force_authenticate(user=self.test_user)
        
        # Create a test client
        self.test_client = Client.objects.create(
            id='test-client-1',
            name='Test Client',
            type='New',
            number='C-001'
        )
        
        # Create test statuses
        self.pending_status = TaskStatus.objects.create(
            id='pending',
            label='قيد الانتظار',
            color='slate',
            icon='fa-clock',
            order_index=0,
            is_finished=False
        )
        
        self.has_comments_status = TaskStatus.objects.create(
            id='has-comments',
            label='يوجد ملاحظات',
            color='yellow',
            icon='fa-comment',
            order_index=1,
            is_finished=False
        )
        
        # Create a test task
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
        
        # Verify activity log was created in database
        activity_log = ActivityLog.objects.get(id=response.data['id'])
        assert activity_log.task == self.test_task
        assert activity_log.description == 'Test activity description'
    
    def test_add_activity_missing_fields(self):
        """Test add_activity with missing required fields"""
        url = f'/tasks/{self.test_task.id}/add_activity/'
        data = {
            'type': 'CUSTOM_ACTION'
            # Missing description
        }
        
        response = self.client_api.post(url, data, format='json')
        
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
    
    def test_overdue_tasks(self):
        """Test getting overdue tasks"""
        # Create an overdue task
        past_deadline = int((time.time() - 86400) * 1000)  # 1 day ago
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
        
        # Create a future task (not overdue)
        future_deadline = int((time.time() + 86400) * 1000)  # 1 day from now
        future_task = Task.objects.create(
            id='future-task-1',
            title='Future Task',
            urgency='Normal',
            status=self.pending_status,
            client=self.test_client,
            order_index=2,
            deadline=future_deadline,
            created_at=int(time.time() * 1000)
        )
        
        url = '/tasks/overdue/'
        response = self.client_api.get(url)
        
        assert response.status_code == http_status.HTTP_200_OK
        assert len(response.data) >= 1
        
        # Check that overdue task is in the response
        task_ids = [task['id'] for task in response.data]
        assert overdue_task.id in task_ids
        assert future_task.id not in task_ids
    
    def test_urgent_tasks(self):
        """Test getting urgent tasks"""
        # Create urgent tasks
        urgent_task = Task.objects.create(
            id='urgent-task-1',
            title='Urgent Task',
            urgency='Urgent',
            status=self.pending_status,
            client=self.test_client,
            order_index=1,
            created_at=int(time.time() * 1000)
        )
        
        critical_task = Task.objects.create(
            id='critical-task-1',
            title='Critical Task',
            urgency='Critical',
            status=self.pending_status,
            client=self.test_client,
            order_index=2,
            created_at=int(time.time() * 1000)
        )
        
        # Normal task should not be included
        normal_task = Task.objects.create(
            id='normal-task-1',
            title='Normal Task',
            urgency='Normal',
            status=self.pending_status,
            client=self.test_client,
            order_index=3,
            created_at=int(time.time() * 1000)
        )
        
        url = '/tasks/urgent/'
        response = self.client_api.get(url)
        
        assert response.status_code == http_status.HTTP_200_OK
        
        # Check that urgent and critical tasks are in the response
        task_ids = [task['id'] for task in response.data]
        assert urgent_task.id in task_ids
        assert critical_task.id in task_ids
        assert normal_task.id not in task_ids
    
    def test_add_reply_success(self):
        """Test adding a reply to a comment"""
        # Create a parent comment
        parent_comment = Comment.objects.create(
            id='parent-comment-1',
            task=self.test_task,
            text='Parent comment',
            is_resolved=False,
            created_at=int(time.time() * 1000)
        )
        
        url = f'/tasks/{self.test_task.id}/add_reply/'
        data = {
            'text': 'Reply to comment',
            'parentCommentId': parent_comment.id
        }
        
        response = self.client_api.post(url, data, format='json')
        
        assert response.status_code == http_status.HTTP_201_CREATED
        assert 'id' in response.data
        assert response.data['text'] == 'Reply to comment'
        
        # Verify reply was created in database
        reply = Comment.objects.get(id=response.data['id'])
        assert reply.task == self.test_task
        assert reply.parent_comment == parent_comment
        
        # Verify task status changed to "Has Comments"
        self.test_task.refresh_from_db()
        assert self.test_task.status == self.has_comments_status
    
    def test_add_reply_missing_fields(self):
        """Test add_reply with missing required fields"""
        url = f'/tasks/{self.test_task.id}/add_reply/'
        data = {
            'text': 'Reply text'
            # Missing parentCommentId
        }
        
        response = self.client_api.post(url, data, format='json')
        
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
    
    def test_add_reply_invalid_parent(self):
        """Test add_reply with invalid parent comment ID"""
        url = f'/tasks/{self.test_task.id}/add_reply/'
        data = {
            'text': 'Reply text',
            'parentCommentId': 'non-existent-comment'
        }
        
        response = self.client_api.post(url, data, format='json')
        
        assert response.status_code == http_status.HTTP_404_NOT_FOUND
        assert 'error' in response.data
