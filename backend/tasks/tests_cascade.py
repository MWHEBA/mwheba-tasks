"""
Test CASCADE delete functionality for tasks.
Verifies that when a parent task is deleted, all subtasks are also deleted.
"""
import pytest
import uuid
import time
from tasks.models import Task
from clients.models import Client
from statuses.models import TaskStatus


@pytest.mark.django_db
class TestCascadeDelete:
    """Test CASCADE delete behavior for parent-child task relationships"""
    
    def test_delete_parent_deletes_subtasks(self):
        """
        Test that deleting a parent task automatically deletes all subtasks.
        Validates: Requirements 6.7
        """
        # Create a client
        client = Client.objects.create(
            id='test-client-cascade',
            name='Test Client',
            type='New',
            number='C-001'
        )
        
        # Create a status
        status = TaskStatus.objects.create(
            id='test-status-cascade',
            label='Test Status',
            color='blue',
            icon='fa-test',
            order_index=0,
            is_finished=False,
            is_default=True
        )
        
        # Create a parent task
        parent_task = Task.objects.create(
            id='parent-task-cascade',
            title='Parent Task',
            description='Parent task for cascade test',
            urgency='Normal',
            status=status,
            client=client,
            order_index=0,
            created_at=int(time.time() * 1000)
        )
        
        # Create subtasks
        subtask1 = Task.objects.create(
            id='subtask-1-cascade',
            title='Subtask 1',
            description='First subtask',
            urgency='Normal',
            status=status,
            client=client,
            parent=parent_task,
            order_index=0,
            created_at=int(time.time() * 1000)
        )
        
        subtask2 = Task.objects.create(
            id='subtask-2-cascade',
            title='Subtask 2',
            description='Second subtask',
            urgency='Normal',
            status=status,
            client=client,
            parent=parent_task,
            order_index=1,
            created_at=int(time.time() * 1000)
        )
        
        # Verify subtasks exist
        assert Task.objects.filter(parent=parent_task).count() == 2
        assert Task.objects.filter(id='subtask-1-cascade').exists()
        assert Task.objects.filter(id='subtask-2-cascade').exists()
        
        # Delete the parent task
        parent_task.delete()
        
        # Verify subtasks are also deleted (CASCADE)
        assert Task.objects.filter(id='subtask-1-cascade').exists() == False
        assert Task.objects.filter(id='subtask-2-cascade').exists() == False
        assert Task.objects.filter(parent_id='parent-task-cascade').count() == 0
        
        # Cleanup
        status.delete()
        client.delete()
    
    def test_delete_parent_with_nested_subtasks(self):
        """
        Test CASCADE delete with nested subtasks (subtasks of subtasks).
        """
        # Create a client
        client = Client.objects.create(
            id='test-client-nested',
            name='Test Client Nested',
            type='New',
            number='C-002'
        )
        
        # Create a status
        status = TaskStatus.objects.create(
            id='test-status-nested',
            label='Test Status Nested',
            color='blue',
            icon='fa-test',
            order_index=0,
            is_finished=False,
            is_default=True
        )
        
        # Create a parent task
        parent_task = Task.objects.create(
            id='parent-task-nested',
            title='Parent Task',
            urgency='Normal',
            status=status,
            client=client,
            order_index=0,
            created_at=int(time.time() * 1000)
        )
        
        # Create a subtask
        subtask = Task.objects.create(
            id='subtask-nested',
            title='Subtask',
            urgency='Normal',
            status=status,
            client=client,
            parent=parent_task,
            order_index=0,
            created_at=int(time.time() * 1000)
        )
        
        # Create a sub-subtask (nested)
        sub_subtask = Task.objects.create(
            id='sub-subtask-nested',
            title='Sub-Subtask',
            urgency='Normal',
            status=status,
            client=client,
            parent=subtask,
            order_index=0,
            created_at=int(time.time() * 1000)
        )
        
        # Verify all tasks exist
        assert Task.objects.filter(id='parent-task-nested').exists()
        assert Task.objects.filter(id='subtask-nested').exists()
        assert Task.objects.filter(id='sub-subtask-nested').exists()
        
        # Delete the parent task
        parent_task.delete()
        
        # Verify all nested tasks are deleted
        assert Task.objects.filter(id='parent-task-nested').exists() == False
        assert Task.objects.filter(id='subtask-nested').exists() == False
        assert Task.objects.filter(id='sub-subtask-nested').exists() == False
        
        # Cleanup
        status.delete()
        client.delete()
