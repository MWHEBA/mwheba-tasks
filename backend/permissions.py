"""
Custom permission classes for role-based access control.

These permissions implement the authorization requirements:
- Admin: Full access to all system functions
- Designer: Can create and edit tasks, but cannot delete
- Print Manager: Can create, view and update tasks, but cannot delete tasks
"""
from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission class that allows:
    - Admin users: Full access (read and write)
    - Other authenticated users: Read-only access
    - Unauthenticated users: No access
    
    Used for resources that should only be modified by administrators.
    """
    
    def has_permission(self, request, view):
        # Deny access to unauthenticated users
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow read-only access for safe methods (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Allow write access only for admin users
        return request.user.is_admin()


class CanCreateTask(permissions.BasePermission):
    """
    Permission class that allows task creation for:
    - Admin users: Can create tasks
    - Designer users: Can create tasks
    - Print Manager users: Can create tasks
    
    Used for task creation endpoints.
    """
    
    def has_permission(self, request, view):
        # Deny access to unauthenticated users
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow read-only access for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For POST (create) requests, check role
        if request.method == 'POST':
            # Admin, Designer, and Print Manager can create tasks
            return request.user.is_admin() or request.user.is_designer() or request.user.is_print_manager()
        
        # For PUT/PATCH (update) requests, allow all authenticated users
        # (they can update task status, comments, etc.)
        if request.method in ['PUT', 'PATCH']:
            return True
        
        # For DELETE requests, use CanDeleteTask permission instead
        return True


class CanDeleteTask(permissions.BasePermission):
    """
    Permission class that allows task deletion for:
    - Admin users: Can delete tasks
    - Designer users: Cannot delete tasks
    - Print Manager users: Cannot delete tasks
    
    Used for task deletion endpoints.
    """
    
    def has_permission(self, request, view):
        # Deny access to unauthenticated users
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow read-only access for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For DELETE requests, only admin can delete
        if request.method == 'DELETE':
            return request.user.is_admin()
        
        # For other methods, allow access
        return True
    
    def has_object_permission(self, request, view, obj):
        """
        Object-level permission check for task deletion.
        Only admin users can delete tasks.
        """
        # Allow read-only access for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For DELETE requests, only admin can delete
        if request.method == 'DELETE':
            return request.user.is_admin()
        
        # For other methods, allow access
        return True


class IsAuthenticatedWithRole(permissions.BasePermission):
    """
    Base permission class that ensures user is authenticated and has a role.
    All authenticated users with valid roles can access the resource.
    """
    
    def has_permission(self, request, view):
        # User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # User must have a valid role (admin, designer, or print_manager)
        user_role = request.user.get_role()
        return user_role in ['admin', 'designer', 'print_manager']
