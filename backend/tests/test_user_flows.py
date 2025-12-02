"""
End-to-End User Flow Tests for Backend
اختبارات شاملة لرحلة المستخدم من خلال Backend
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from users.models import UserProfile
from clients.models import Client
from tasks.models import Task, Comment
from statuses.models import TaskStatus


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user():
    user = User.objects.create_user(
        username="admin",
        email="admin@example.com",
        password="admin123",
        first_name="أحمد",
        last_name="المدير"
    )
    UserProfile.objects.create(user=user, role="admin")
    return user


@pytest.fixture
def designer_user():
    user = User.objects.create_user(
        username="designer",
        email="designer@example.com",
        password="designer123",
        first_name="محمد",
        last_name="المصمم"
    )
    UserProfile.objects.create(user=user, role="designer")
    return user


@pytest.fixture
def test_client():
    return Client.objects.create(
        name="شركة ABC",
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
class TestCompleteUserJourney:
    """Test complete user journey from login to task completion"""
    
    def test_admin_complete_workflow(self, api_client, admin_user, test_client, test_status):
        """
        Complete admin workflow:
        1. Login
        2. Create client
        3. Create task
        4. Update task status
        5. Add comment
        6. Complete task
        """
        # Step 1: Login
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        response = api_client.post('/auth/login/', login_data)
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        
        # Authenticate for subsequent requests
        api_client.force_authenticate(user=admin_user)
        
        # Step 2: Create client
        client_data = {
            "name": "عميل جديد",
            "type": "New",
            "number": "C-002"
        }
        response = api_client.post('/clients/', client_data)
        assert response.status_code == status.HTTP_201_CREATED
        client_id = response.data['id']
        
        # Step 3: Create task
        task_data = {
            "id": "task-flow-1",
            "title": "تصميم شعار",
            "description": "تصميم شعار احترافي",
            "urgency": "Normal",
            "status": test_status.id,
            "clientId": client_id,
            "orderIndex": 0,
            "createdAt": 1234567890
        }
        response = api_client.post('/tasks/', task_data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        
        # Step 4: Update task status
        new_status = TaskStatus.objects.create(
            id="in-design",
            label="جاري التصميم",
            color="blue",
            icon="fa-palette",
            order_index=1,
            is_finished=False
        )
        
        response = api_client.post(
            f'/tasks/task-flow-1/update_status/',
            {"statusId": new_status.id},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        
        # Step 5: Add comment
        comment_data = {
            "text": "تم البدء في التصميم",
            "parentCommentId": None
        }
        response = api_client.post(
            '/tasks/task-flow-1/comments/',
            comment_data,
            format='json'
        )
        assert response.status_code == status.HTTP_201_CREATED
        
        # Step 6: Complete task
        completed_status = TaskStatus.objects.create(
            id="completed",
            label="مكتمل",
            color="green",
            icon="fa-check",
            order_index=10,
            is_finished=True
        )
        
        response = api_client.post(
            f'/tasks/task-flow-1/update_status/',
            {"statusId": completed_status.id},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        
        # Verify final state
        task = Task.objects.get(id="task-flow-1")
        assert task.status.id == completed_status.id
        assert task.comments.count() >= 1


@pytest.mark.django_db
class TestDesignerWorkflow:
    """Test designer user workflow"""
    
    def test_designer_task_workflow(self, api_client, designer_user, test_client, test_status):
        """
        Designer workflow:
        1. Login
        2. View tasks
        3. Update task status
        4. Add comment
        """
        # Login
        api_client.force_authenticate(user=designer_user)
        
        # Create task for designer
        task = Task.objects.create(
            id="designer-task-1",
            title="مهمة المصمم",
            urgency="Normal",
            status=test_status,
            client=test_client,
            order_index=0,
            created_at=1234567890
        )
        
        # View tasks
        response = api_client.get('/tasks/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        
        # Update status
        in_design_status = TaskStatus.objects.create(
            id="in-design",
            label="جاري التصميم",
            color="blue",
            icon="fa-palette",
            order_index=1,
            is_finished=False
        )
        
        response = api_client.post(
            f'/tasks/{task.id}/update_status/',
            {"statusId": in_design_status.id},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        
        # Add comment
        response = api_client.post(
            f'/tasks/{task.id}/comments/',
            {"text": "بدأت العمل على التصميم", "parentCommentId": None},
            format='json'
        )
        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestCommentWorkflow:
    """Test comment and reply workflow"""
    
    def test_comment_reply_resolve_workflow(self, api_client, admin_user, test_client, test_status):
        """
        Comment workflow:
        1. Add comment
        2. Add reply
        3. Resolve comment
        """
        api_client.force_authenticate(user=admin_user)
        
        # Create task
        task = Task.objects.create(
            id="comment-task-1",
            title="مهمة التعليقات",
            urgency="Normal",
            status=test_status,
            client=test_client,
            order_index=0,
            created_at=1234567890
        )
        
        # Add comment
        response = api_client.post(
            f'/tasks/{task.id}/comments/',
            {"text": "يرجى تعديل اللون", "parentCommentId": None},
            format='json'
        )
        assert response.status_code == status.HTTP_201_CREATED
        comment_id = response.data['id']
        
        # Add reply
        response = api_client.post(
            f'/tasks/{task.id}/add_reply/',
            {"text": "تم التعديل", "parentCommentId": comment_id},
            format='json'
        )
        assert response.status_code == status.HTTP_201_CREATED
        
        # Resolve comment
        comment = Comment.objects.get(id=comment_id)
        response = api_client.put(
            f'/comments/{comment_id}/',
            {
                "id": comment.id,
                "task": task.id,
                "parentComment": None,
                "text": comment.text,
                "isResolved": True,
                "createdAt": comment.created_at
            },
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        
        # Verify comment is resolved
        comment.refresh_from_db()
        assert comment.is_resolved == True


@pytest.mark.django_db
class TestClientManagementFlow:
    """Test client management workflow"""
    
    def test_client_lifecycle(self, api_client, admin_user):
        """
        Client lifecycle:
        1. Create client
        2. Update client
        3. View client tasks
        4. Delete client
        """
        api_client.force_authenticate(user=admin_user)
        
        # Create client
        response = api_client.post(
            '/clients/',
            {
                "name": "عميل الاختبار",
                "type": "New",
                "number": "C-TEST-001",
                "notes": "عميل للاختبار"
            }
        )
        assert response.status_code == status.HTTP_201_CREATED
        client_id = response.data['id']
        
        # Update client
        response = api_client.put(
            f'/clients/{client_id}/',
            {
                "name": "عميل محدث",
                "type": "Existing",
                "number": "C-TEST-001",
                "notes": "تم التحديث"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        
        # Verify update
        client = Client.objects.get(id=client_id)
        assert client.name == "عميل محدث"
        assert client.type == "Existing"
        
        # Delete client
        response = api_client.delete(f'/clients/{client_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify deletion
        assert not Client.objects.filter(id=client_id).exists()


@pytest.mark.django_db
class TestUserManagementFlow:
    """Test user management workflow"""
    
    def test_user_lifecycle(self, api_client, admin_user):
        """
        User lifecycle:
        1. Create user
        2. Update user
        3. Toggle active status
        4. Delete user
        """
        api_client.force_authenticate(user=admin_user)
        
        # Create user
        response = api_client.post(
            '/users/',
            {
                "username": "newdesigner",
                "email": "new@example.com",
                "password": "password123",
                "first_name": "مصمم",
                "last_name": "جديد",
                "role": "designer"
            }
        )
        assert response.status_code == status.HTTP_201_CREATED
        user_id = response.data['id']
        
        # Update user
        response = api_client.patch(
            f'/users/{user_id}/',
            {
                "first_name": "مصمم محدث",
                "role": "print_manager"
            },
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        
        # Toggle active
        response = api_client.post(f'/users/{user_id}/toggle_active/')
        assert response.status_code == status.HTTP_200_OK
        
        # Delete user
        response = api_client.delete(f'/users/{user_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
