"""
Admin configuration for users app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile


class UserProfileInline(admin.StackedInline):
    """Inline admin for UserProfile"""
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fields = ['role', 'phone_number']


class UserAdmin(BaseUserAdmin):
    """Extended User admin with profile"""
    inlines = [UserProfileInline]
    list_display = ['username', 'email', 'get_role', 'is_staff', 'is_active']
    list_filter = ['is_staff', 'is_active']
    
    def get_role(self, obj):
        """Get user role from profile"""
        return obj.get_role()
    get_role.short_description = 'Role'


# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)
