"""
Test script for notification template rendering.

This script tests the template rendering functionality with various contexts
to ensure placeholders are correctly replaced and validation works.
"""

import sys
import os
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from notifications.service import NotificationService


def test_task_created_template():
    """Test task creation template rendering"""
    print("\n=== Testing Task Created Template ===")
    
    context = {
        'taskTitle': 'تصميم بروشور',
        'clientName': 'شركة الأمل',
        'clientCode': 'C-001',
        'status': 'جديد',
        'urgency': 'عاجل'
    }
    
    message = NotificationService.render_template('NEW_PROJECT', context)
    print(f"✓ Template rendered successfully:")
    print(f"  {message}")
    assert message is not None
    assert 'تصميم بروشور' in message


def test_status_changed_template():
    """Test status change template rendering"""
    print("\n=== Testing Status Changed Template ===")
    
    context = {
        'taskTitle': 'تصميم بروشور',
        'clientName': 'شركة الأمل',
        'clientCode': 'C-001',
        'statusMessage': 'تم تحديث الحالة',
        'oldStatus': 'جديد',
        'newStatus': 'قيد التنفيذ'
    }
    
    message = NotificationService.render_template('STATUS_CHANGE', context)
    print(f"✓ Template rendered successfully:")
    print(f"  {message}")
    assert message is not None
    assert 'قيد التنفيذ' in message


def test_comment_added_template():
    """Test comment added template rendering"""
    print("\n=== Testing Comment Added Template ===")
    
    context = {
        'taskLabel': 'المشروع',
        'taskTitle': 'تصميم بروشور',
        'clientName': 'شركة الأمل',
        'clientCode': 'C-001',
        'commentText': 'يرجى تعديل الألوان',
        'commentCount': 1
    }
    
    message = NotificationService.render_template('COMMENT_ADDED', context)
    print(f"✓ Template rendered successfully:")
    print(f"  {message}")
    assert message is not None
    assert 'يرجى تعديل الألوان' in message


def test_comment_resolved_template():
    """Test comment resolved template rendering"""
    print("\n=== Testing Comment Resolved Template ===")
    
    context = {
        'taskLabel': 'المشروع',
        'taskTitle': 'تصميم بروشور',
        'clientName': 'شركة الأمل',
        'clientCode': 'C-001'
    }
    
    message = NotificationService.render_template('COMMENT_RESOLVED', context)
    print(f"✓ Template rendered successfully:")
    print(f"  {message}")
    assert message is not None
    assert 'تصميم بروشور' in message


def test_attachment_added_template():
    """Test attachment added template rendering"""
    print("\n=== Testing Attachment Added Template ===")
    
    context = {
        'taskLabel': 'المشروع',
        'taskTitle': 'تصميم بروشور',
        'clientName': 'شركة الأمل',
        'clientCode': 'C-001',
        'attachmentCount': 1,
        'attachmentNames': 'logo.png'
    }
    
    message = NotificationService.render_template('ATTACHMENT_ADDED', context)
    print(f"✓ Template rendered successfully:")
    print(f"  {message}")
    assert message is not None
    assert 'logo.png' in message


def test_missing_placeholder():
    """Test validation with missing placeholder"""
    print("\n=== Testing Missing Placeholder Validation ===")
    
    context = {
        'task_title': 'تصميم بروشور',
        'client_name': 'شركة الأمل',
        # Missing 'status' and 'urgency'
    }
    
    import pytest
    with pytest.raises(ValueError):
        message = NotificationService.render_template('task_created', context)
    print(f"✓ Correctly raised ValueError for missing placeholders")


def test_custom_template():
    """Test rendering with custom template"""
    print("\n=== Testing Custom Template ===")
    
    custom_templates = {
        'NEW_PROJECT': 'New task: {taskTitle} for {clientName}'
    }
    
    context = {
        'taskTitle': 'Design Brochure',
        'clientName': 'Hope Company',
        'clientCode': 'C-001',
        'status': 'New',
        'urgency': 'Urgent'
    }
    
    message = NotificationService.render_template('NEW_PROJECT', context, custom_templates)
    print(f"✓ Custom template rendered successfully:")
    print(f"  {message}")
    assert message is not None
    assert 'Design Brochure' in message
    assert 'Hope Company' in message


def test_template_validation():
    """Test template validation function"""
    print("\n=== Testing Template Validation ===")
    
    # Valid template
    valid_template = 'مشروع جديد: {taskTitle}\nالعميل: {clientName}\nكود: {clientCode}\nالحالة: {status}\nالأولوية: {urgency}'
    is_valid = NotificationService.validate_template(valid_template, 'NEW_PROJECT')
    print(f"Valid template: {'✓ Passed' if is_valid else '✗ Failed'}")
    assert is_valid is True
    
    # Invalid template (missing placeholder)
    invalid_template = 'مشروع جديد: {taskTitle}\nالعميل: {clientName}'
    is_invalid = not NotificationService.validate_template(invalid_template, 'NEW_PROJECT')
    print(f"Invalid template: {'✓ Correctly rejected' if is_invalid else '✗ Should have been rejected'}")
    assert is_invalid is True


def main():
    """Run all template tests"""
    print("=" * 60)
    print("Notification Template Rendering Tests")
    print("=" * 60)
    
    tests = [
        test_task_created_template,
        test_status_changed_template,
        test_comment_added_template,
        test_comment_resolved_template,
        test_attachment_added_template,
        test_missing_placeholder,
        test_custom_template,
        test_template_validation,
    ]
    
    results = [test() for test in tests]
    
    print("\n" + "=" * 60)
    print(f"Results: {sum(results)}/{len(results)} tests passed")
    print("=" * 60)
    
    return all(results)


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
