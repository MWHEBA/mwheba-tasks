"""
Comprehensive tests for Django models
"""
import pytest
from django.contrib.auth.models import User
from clients.models import Client
from tasks.models import Task, Comment, Attachment, ActivityLog
from statuses.models import TaskStatus
from users.models import UserProfile


@pytest.mark.django_db
class TestClientModel:
    """Tests for Client model"""
    
    def test_create_client(self):
        """Test creating a new client"""
        client = Client.objects.create(
            name="Test Client",
            type="New",
            number="C-001",
            notes="Test notes"
        )
        assert client.name == "Test Client"
        assert client.type == "New"
        assert client.number == "C-001"
        assert str(client) == "Test Client"
    
    def test_client_unique_number(self):
        """Test that client number must be unique"""
        Client.objects.create(name="Client 1", type="New", number="C-001")
        
        with pytest.raises(Exception):
            Client.objects.create(name="Client 2", type="New", number="C-001")
    
    def test_client_ordering(self):
        """Test that clients are ordered by name"""
        Client.objects.create(name="Zebra Client", type="New", number="C-001")
        Client.objects.create(name="Alpha Client", type="New", number="C-002")
        
        clients = list(Client.objects.all())
        assert clients[0].name == "Alpha Client"
        assert clients[1].name == "Zebra Client"


@pytest.mark.django_db
class TestTaskModel:
    """Tests for Task model"""
    
    @pytest.fixture
    def client(self):
        """Create a test client"""
        return Client.objects.create(
            name="Test Client",
            type="New",
            number="C-001"
        )
    
    @pytest.fixture
    def status(self):
        """Create a test status"""
        return TaskStatus.objects.create(
            id="pending",
            label="قيد الانتظار",
            color="slate",
            icon="fa-clock",
            order_index=0,
            is_finished=False,
            is_default=True
        )
    
    def test_create_task(self, client, status):
        """Test creating a new task"""
        task = Task.objects.create(
            id="task-1",
            title="Test Task",
            description="Test description",
            urgency="Normal",
            status=status,
            client=client,
            order_index=0,
            created_at=1234567890
        )
        assert task.title == "Test Task"
        assert task.urgency == "Normal"
        assert task.client == client
        assert str(task) == "Test Task"
    
    def test_create_subtask(self, client, status):
        """Test creating a subtask"""
        parent = Task.objects.create(
            id="parent-1",
            title="Parent Task",
            urgency="Normal",
            status=status,
            client=client,
            order_index=0,
            created_at=1234567890
        )
        
        subtask = Task.objects.create(
            id="subtask-1",
            title="Subtask",
            urgency="Normal",
            status=status,
            client=client,
            parent=parent,
            order_index=0,
            created_at=1234567891
        )
        
        assert subtask.parent == parent
        assert parent.subtasks.count() == 1
        assert parent.subtasks.first() == subtask
    
    def test_task_ordering(self, client, status):
        """Test that tasks are ordered by order_index"""
        Task.objects.create(
            id="task-2",
            title="Task 2",
            urgency="Normal",
            status=status,
            client=client,
            order_index=2,
            created_at=1234567890
        )
        Task.objects.create(
            id="task-1",
            title="Task 1",
            urgency="Normal",
            status=status,
            client=client,
            order_index=1,
            created_at=1234567891
        )
        
        tasks = list(Task.objects.all())
        assert tasks[0].order_index == 1
        assert tasks[1].order_index == 2


@pytest.mark.django_db
class TestCommentModel:
    """Tests for Comment model"""
    
    @pytest.fixture
    def task(self, client, status):
        """Create a test task"""
        return Task.objects.create(
            id="task-1",
            title="Test Task",
            urgency="Normal",
            status=status,
            client=client,
            order_index=0,
            created_at=1234567890
        )
    
    @pytest.fixture
    def client(self):
        return Client.objects.create(name="Test", type="New", number="C-001")
    
    @pytest.fixture
    def status(self):
        return TaskStatus.objects.create(
            id="pending",
            label="Pending",
            color="slate",
            icon="fa-clock",
            order_index=0,
            is_finished=False
        )
    
    def test_create_comment(self, task):
        """Test creating a comment"""
        comment = Comment.objects.create(
            id="comment-1",
            task=task,
            text="Test comment",
            created_at=1234567890
        )
        assert comment.text == "Test comment"
        assert comment.task == task
        assert not comment.is_resolved
    
    def test_create_reply(self, task):
        """Test creating a reply to a comment"""
        parent_comment = Comment.objects.create(
            id="comment-1",
            task=task,
            text="Parent comment",
            created_at=1234567890
        )
        
        reply = Comment.objects.create(
            id="reply-1",
            task=task,
            parent_comment=parent_comment,
            text="Reply",
            created_at=1234567891
        )
        
        assert reply.parent_comment == parent_comment
        assert parent_comment.replies.count() == 1
    
    def test_resolve_comment(self, task):
        """Test resolving a comment"""
        comment = Comment.objects.create(
            id="comment-1",
            task=task,
            text="Test comment",
            created_at=1234567890
        )
        
        comment.is_resolved = True
        comment.save()
        
        assert comment.is_resolved


@pytest.mark.django_db
class TestUserProfileModel:
    """Tests for UserProfile model"""
    
    def test_create_user_profile(self):
        """Test creating a user profile"""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123"
        )
        
        profile = UserProfile.objects.create(
            user=user,
            role="designer",
            phone_number="+1234567890"
        )
        
        assert profile.role == "designer"
        assert profile.phone_number == "+1234567890"
        assert str(profile) == "testuser (Designer)"
    
    def test_user_role_methods(self):
        """Test user role checking methods"""
        user = User.objects.create_user(username="admin", password="pass")
        UserProfile.objects.create(user=user, role="admin")
        
        assert user.is_admin()
        assert not user.is_designer()
        assert not user.is_print_manager()
    
    def test_designer_role(self):
        """Test designer role"""
        user = User.objects.create_user(username="designer", password="pass")
        UserProfile.objects.create(user=user, role="designer")
        
        assert not user.is_admin()
        assert user.is_designer()
        assert not user.is_print_manager()
    
    def test_print_manager_role(self):
        """Test print manager role"""
        user = User.objects.create_user(username="printmgr", password="pass")
        UserProfile.objects.create(user=user, role="print_manager")
        
        assert not user.is_admin()
        assert not user.is_designer()
        assert user.is_print_manager()


@pytest.mark.django_db
class TestActivityLogModel:
    """Tests for ActivityLog model"""
    
    @pytest.fixture
    def task(self, client, status):
        return Task.objects.create(
            id="task-1",
            title="Test Task",
            urgency="Normal",
            status=status,
            client=client,
            order_index=0,
            created_at=1234567890
        )
    
    @pytest.fixture
    def client(self):
        return Client.objects.create(name="Test", type="New", number="C-001")
    
    @pytest.fixture
    def status(self):
        return TaskStatus.objects.create(
            id="pending",
            label="Pending",
            color="slate",
            icon="fa-clock",
            order_index=0,
            is_finished=False
        )
    
    def test_create_activity_log(self, task):
        """Test creating an activity log entry"""
        log = ActivityLog.objects.create(
            id="log-1",
            task=task,
            timestamp=1234567890,
            type="TASK_CREATED",
            description="Task created",
            details={"user": "admin"}
        )
        
        assert log.type == "TASK_CREATED"
        assert log.task == task
        assert log.details["user"] == "admin"
