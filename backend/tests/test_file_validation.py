"""
Tests for file upload validation
"""
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from validators import validate_file_size, validate_file_type


class FileUploadValidationTests(TestCase):
    """Test file upload validation functions"""
    
    def test_validate_file_size_valid(self):
        """Test that files under 10MB pass validation"""
        file_content = b'x' * (1 * 1024 * 1024)
        uploaded_file = SimpleUploadedFile(
            "test.pdf",
            file_content,
            content_type="application/pdf"
        )
        
        try:
            validate_file_size(uploaded_file)
        except ValidationError:
            self.fail("validate_file_size raised ValidationError unexpectedly")
    
    def test_validate_file_size_too_large(self):
        """Test that files over 10MB fail validation"""
        file_content = b'x' * (11 * 1024 * 1024)
        uploaded_file = SimpleUploadedFile(
            "test.pdf",
            file_content,
            content_type="application/pdf"
        )
        
        with self.assertRaises(ValidationError) as context:
            validate_file_size(uploaded_file)
        
        self.assertIn('10MB', str(context.exception))
    
    def test_validate_file_type_valid_pdf(self):
        """Test that PDF files pass validation"""
        uploaded_file = SimpleUploadedFile(
            "test.pdf",
            b"fake pdf content",
            content_type="application/pdf"
        )
        
        try:
            validate_file_type(uploaded_file)
        except ValidationError:
            self.fail("validate_file_type raised ValidationError unexpectedly")
    
    def test_validate_file_type_invalid(self):
        """Test that invalid file types fail validation"""
        uploaded_file = SimpleUploadedFile(
            "test.exe",
            b"fake exe content",
            content_type="application/x-msdownload"
        )
        
        with self.assertRaises(ValidationError) as context:
            validate_file_type(uploaded_file)
        
        self.assertIn('not allowed', str(context.exception))


class AttachmentSerializerTests(TestCase):
    """Test attachment serializer validation"""
    
    def setUp(self):
        """Set up test data"""
        from clients.models import Client
        from statuses.models import TaskStatus
        from tasks.models import Task
        
        self.client_obj = Client.objects.create(
            id='test-client',
            name='Test Client',
            type='New',
            number='1234567890'
        )
        
        self.status = TaskStatus.objects.create(
            id='test-status',
            label='Test Status',
            order_index=1,
            is_finished=False
        )
        
        self.task = Task.objects.create(
            id='test-task',
            title='Test Task',
            urgency='Normal',
            status=self.status,
            client=self.client_obj,
            order_index=1,
            created_at=1234567890000
        )
    
    def test_serializer_validates_file_size(self):
        """Test that serializer validates file size"""
        from tasks.serializers import AttachmentSerializer
        
        file_content = b'x' * (11 * 1024 * 1024)
        uploaded_file = SimpleUploadedFile(
            "large.pdf",
            file_content,
            content_type="application/pdf"
        )
        
        data = {
            'id': 'test-attachment',
            'task': self.task.id,
            'name': 'large.pdf',
            'type': 'application/pdf',
            'file': uploaded_file,
            'size': uploaded_file.size
        }
        
        serializer = AttachmentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('file', serializer.errors)
    
    def test_serializer_accepts_valid_pdf(self):
        """Test that serializer accepts valid PDF files"""
        from tasks.serializers import AttachmentSerializer
        
        file_content = b'%PDF-1.4 fake pdf content'
        uploaded_file = SimpleUploadedFile(
            "test.pdf",
            file_content,
            content_type="application/pdf"
        )
        
        data = {
            'id': 'test-attachment',
            'task': self.task.id,
            'name': 'test.pdf',
            'type': 'application/pdf',
            'file': uploaded_file,
            'size': uploaded_file.size
        }
        
        serializer = AttachmentSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
