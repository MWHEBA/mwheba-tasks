"""
Serializers for the settings app.
"""
from rest_framework import serializers
from backend.serializers import CamelCaseSerializer
from .models import UnifiedSettings
import re


class UnifiedSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for UnifiedSettings model.
    Provides validation for whatsapp_numbers structure and notification_templates placeholders.
    Note: We don't use CamelCaseSerializer here because we want to preserve the exact structure
    of JSONField data (with camelCase keys) as sent from the frontend.
    """
    
    # Explicitly define fields to control serialization
    whatsappNumbers = serializers.JSONField(source='whatsapp_numbers')
    notificationsEnabled = serializers.BooleanField(source='notifications_enabled')
    notificationTemplates = serializers.JSONField(source='notification_templates', required=False, allow_null=True)
    
    class Meta:
        model = UnifiedSettings
        fields = ['id', 'whatsappNumbers', 'notificationsEnabled', 'notificationTemplates', 'updated_at']
        read_only_fields = ['id', 'updated_at']
    
    def validate_whatsapp_numbers(self, value):
        """
        Validate whatsapp_numbers structure.
        Should be a list of WhatsApp number objects with id, name, number, apiKey, type, role, and enabled fields.
        """
        if not isinstance(value, list):
            raise serializers.ValidationError("whatsappNumbers must be a list")
        
        # Valid roles
        valid_roles = ['admin', 'designer', 'print_manager']
        
        # Validate each number object
        phone_pattern = re.compile(r'^\d{10,15}$')
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError("Each WhatsApp number must be an object")
            
            # Validate required fields (in camelCase as sent from frontend)
            required_fields = ['id', 'name', 'number', 'apiKey', 'type', 'enabled']
            for field in required_fields:
                if field not in item:
                    raise serializers.ValidationError(f"WhatsApp number object missing required field: {field}")
            
            # Validate role field (optional, defaults to 'admin')
            if 'role' in item:
                role = item['role']
                if role not in valid_roles:
                    raise serializers.ValidationError(
                        f"Invalid role: {role}. Must be one of: {', '.join(valid_roles)}"
                    )
            
            # Validate phone number format (international format: 10-15 digits)
            number = item['number']
            if not isinstance(number, str):
                raise serializers.ValidationError("Phone number must be a string")
            
            # Remove any spaces or special characters for validation
            clean_number = re.sub(r'[^\d]', '', number)
            if not phone_pattern.match(clean_number):
                raise serializers.ValidationError(
                    f"Invalid WhatsApp number format: {number}. Must be 10-15 digits."
                )
        
        return value
    
    def validate_notification_templates(self, value):
        """
        Validate notification_templates structure.
        Each template should contain required placeholders.
        Uses NotificationService.REQUIRED_PLACEHOLDERS as source of truth.
        """
        if value is None:
            return {}
        
        if not isinstance(value, dict):
            raise serializers.ValidationError("notificationTemplates must be a dictionary")
        
        # Import here to avoid circular imports
        from notifications.service import NotificationService
        
        # Validate each template
        for template_type, template_text in value.items():
            if not isinstance(template_text, str):
                raise serializers.ValidationError(
                    f"Template '{template_type}' must be a string"
                )
            
            # Check if template type is recognized
            if template_type in NotificationService.REQUIRED_PLACEHOLDERS:
                # Check for required placeholders
                required = NotificationService.REQUIRED_PLACEHOLDERS[template_type]
                missing_placeholders = []
                
                for placeholder in required:
                    if f'{{{placeholder}}}' not in template_text:
                        missing_placeholders.append(placeholder)
                
                if missing_placeholders:
                    raise serializers.ValidationError(
                        f"Template '{template_type}' is missing required placeholders: {', '.join(missing_placeholders)}"
                    )
        
        return value
