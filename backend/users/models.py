"""
User models for authentication and authorization.
"""
from django.contrib.auth.models import User as DjangoUser
from django.db import models


class UserProfile(models.Model):
    """
    Extended user profile with role-based access control.
    
    Roles:
    - admin: Full access to all system functions
    - designer: Can create and edit tasks, but cannot delete
    - print_manager: Can view and update task status, but cannot create tasks
    """
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('designer', 'Designer'),
        ('print_manager', 'Print Manager'),
    ]
    
    user = models.OneToOneField(
        DjangoUser,
        on_delete=models.CASCADE,
        related_name='profile',
        primary_key=True
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='designer',
        help_text='User role for permission management'
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text='User phone number for notifications'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
    
    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"
    
    def is_admin(self):
        """Check if user has admin role"""
        return self.role == 'admin'
    
    def is_designer(self):
        """Check if user has designer role"""
        return self.role == 'designer'
    
    def is_print_manager(self):
        """Check if user has print manager role"""
        return self.role == 'print_manager'


# Extend Django User with helper methods
def get_role(self):
    """Get user role from profile"""
    if hasattr(self, 'profile'):
        return self.profile.role
    return 'designer'

def is_admin(self):
    """Check if user has admin role"""
    return self.get_role() == 'admin'

def is_designer(self):
    """Check if user has designer role"""
    return self.get_role() == 'designer'

def is_print_manager(self):
    """Check if user has print manager role"""
    return self.get_role() == 'print_manager'

# Add methods to Django User model
DjangoUser.add_to_class('get_role', get_role)
DjangoUser.add_to_class('is_admin', is_admin)
DjangoUser.add_to_class('is_designer', is_designer)
DjangoUser.add_to_class('is_print_manager', is_print_manager)
