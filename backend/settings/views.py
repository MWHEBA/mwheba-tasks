"""
Views for the settings app.
"""
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from permissions import IsAdminOrReadOnly
from .models import Setting, UnifiedSettings
from backend.serializers import CamelCaseSerializer
from .serializers import UnifiedSettingsSerializer


class SettingViewSet(viewsets.ViewSet):
    """
    ViewSet for Settings.
    Provides list and update operations for system settings.
    Returns settings as a dictionary format.
    
    Permissions:
    - Admin: Full access (read and update)
    - Other authenticated users: Read-only access
    """
    permission_classes = [IsAdminOrReadOnly]
    
    def list(self, request):
        """
        GET /api/settings
        Returns all settings as a dictionary with key-value pairs.
        """
        settings = Setting.objects.all()
        
        # Convert to dictionary format
        settings_dict = {}
        for setting in settings:
            # Convert key_name from snake_case to camelCase
            camel_key = CamelCaseSerializer.snake_to_camel(setting.key_name)
            settings_dict[camel_key] = setting.value
        
        return Response(settings_dict)
    
    def update(self, request, pk=None):
        """
        PUT /api/settings/:key
        Updates a specific setting by key.
        """
        # Convert camelCase key to snake_case for database lookup
        snake_key = CamelCaseSerializer.camel_to_snake(pk)
        
        setting = get_object_or_404(Setting, key_name=snake_key)
        
        # Get the new value from request data
        # The request might have the value directly or in a 'value' field
        if 'value' in request.data:
            new_value = request.data['value']
        else:
            new_value = request.data
        
        setting.value = new_value
        setting.save()
        
        # Return the updated setting in camelCase format
        return Response({
            CamelCaseSerializer.snake_to_camel(setting.key_name): setting.value
        })


class UnifiedSettingsViewSet(viewsets.ViewSet):
    """
    ViewSet for unified settings management.
    Provides GET and PUT operations for the entire settings object.
    Singleton resource - accessed via /api/settings/1/
    
    Permissions:
    - Admin: Full access (read and update)
    - Other authenticated users: Read-only access
    """
    permission_classes = [IsAdminOrReadOnly]
    
    def retrieve(self, request, pk=None):
        """
        GET /api/settings/1/
        Returns unified settings object with whatsappNumbers, notificationsEnabled, and notificationTemplates.
        """
        # Get or create the singleton settings instance (always ID=1)
        settings, created = UnifiedSettings.objects.get_or_create(
            id=1,
            defaults={
                'whatsapp_numbers': [],
                'notifications_enabled': False,
                'notification_templates': {}
            }
        )
        
        # Use serializer to format response
        serializer = UnifiedSettingsSerializer(settings)
        return Response(serializer.data)
    
    def update(self, request, pk=None):
        """
        PUT /api/settings/1/
        Updates unified settings object.
        Validates input structure and persists all settings atomically.
        """
        # Get or create the singleton settings instance (always ID=1)
        settings, created = UnifiedSettings.objects.get_or_create(id=1)
        
        # Use serializer for validation and update
        serializer = UnifiedSettingsSerializer(settings, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
