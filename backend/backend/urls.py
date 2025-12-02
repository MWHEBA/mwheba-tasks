"""
URL configuration for backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings as django_settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from backend.views import health_check
from statuses.views import TaskStatusViewSet
from clients.views import ClientViewSet
from products.views import ProductViewSet
from tasks.views import TaskViewSet, CommentUpdateView
from users.views import login_view, logout_view, current_user_view, UserViewSet

# Import settings app views - use importlib to avoid conflict with backend.settings module
from importlib import import_module
try:
    settings_app_views = import_module('settings.views')
    SettingViewSet = settings_app_views.SettingViewSet
    UnifiedSettingsViewSet = settings_app_views.UnifiedSettingsViewSet
except ImportError:
    # Fallback if settings app is not available
    SettingViewSet = None
    UnifiedSettingsViewSet = None

# Create a router for API endpoints
router = DefaultRouter()

# Register all ViewSets
router.register(r'statuses', TaskStatusViewSet)
router.register(r'clients', ClientViewSet)
router.register(r'products', ProductViewSet)
router.register(r'tasks', TaskViewSet)
if UnifiedSettingsViewSet:
    router.register(r'settings', UnifiedSettingsViewSet, basename='settings')
router.register(r'users', UserViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    # API endpoints with /api prefix for development
    path('api/', include(router.urls)),
    path('api/health/', health_check, name='health_check'),
    path('api/comments/<str:pk>/', CommentUpdateView.as_view(), name='comment-update'),
    # Authentication endpoints
    path('api/auth/login/', login_view, name='login'),
    path('api/auth/logout/', logout_view, name='logout'),
    path('api/auth/me/', current_user_view, name='current_user'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Serve media files in development
if django_settings.DEBUG:
    urlpatterns += static(django_settings.MEDIA_URL, document_root=django_settings.MEDIA_ROOT)
