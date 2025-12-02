"""
Base serializers for the Django backend.
Provides utilities for converting between snake_case and camelCase.
"""
from rest_framework import serializers
import re


class CamelCaseSerializer(serializers.ModelSerializer):
    """
    Base serializer that converts between snake_case (Python/Database) and camelCase (JavaScript/Frontend).
    
    This serializer automatically converts field names when serializing to JSON (to_representation)
    and when deserializing from JSON (to_internal_value).
    """
    
    def to_representation(self, instance):
        """
        Convert the model instance to a dictionary with camelCase keys.
        
        Args:
            instance: The model instance to serialize
            
        Returns:
            dict: Dictionary with camelCase keys
        """
        data = super().to_representation(instance)
        return self.convert_to_camel_case(data)
    
    def to_internal_value(self, data):
        """
        Convert the incoming camelCase data to snake_case for internal processing.
        
        Args:
            data: Dictionary with camelCase keys from the frontend
            
        Returns:
            dict: Dictionary with snake_case keys for Django
        """
        data = self.convert_to_snake_case(data)
        return super().to_internal_value(data)
    
    def convert_to_camel_case(self, data):
        """
        Recursively convert dictionary keys from snake_case to camelCase.
        
        Args:
            data: Dictionary, list, or primitive value
            
        Returns:
            Converted data structure with camelCase keys
        """
        if isinstance(data, dict):
            return {
                self.snake_to_camel(key): self.convert_to_camel_case(value)
                for key, value in data.items()
            }
        elif isinstance(data, list):
            return [self.convert_to_camel_case(item) for item in data]
        else:
            return data
    
    def convert_to_snake_case(self, data):
        """
        Recursively convert dictionary keys from camelCase to snake_case.
        
        Args:
            data: Dictionary, list, or primitive value
            
        Returns:
            Converted data structure with snake_case keys
        """
        if isinstance(data, dict):
            return {
                self.camel_to_snake(key): self.convert_to_snake_case(value)
                for key, value in data.items()
            }
        elif isinstance(data, list):
            return [self.convert_to_snake_case(item) for item in data]
        else:
            return data
    
    @staticmethod
    def snake_to_camel(snake_str):
        """
        Convert a snake_case string to camelCase.
        
        Args:
            snake_str: String in snake_case format
            
        Returns:
            str: String in camelCase format
            
        Examples:
            'user_name' -> 'userName'
            'is_active' -> 'isActive'
            'created_at' -> 'createdAt'
        """
        components = snake_str.split('_')
        # Keep the first component as is, capitalize the rest
        return components[0] + ''.join(x.title() for x in components[1:])
    
    @staticmethod
    def camel_to_snake(camel_str):
        """
        Convert a camelCase string to snake_case.
        
        Args:
            camel_str: String in camelCase format
            
        Returns:
            str: String in snake_case format
            
        Examples:
            'userName' -> 'user_name'
            'isActive' -> 'is_active'
            'createdAt' -> 'created_at'
        """
        # Insert an underscore before any uppercase letter and convert to lowercase
        snake_str = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', camel_str)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', snake_str).lower()
