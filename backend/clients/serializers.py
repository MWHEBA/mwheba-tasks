"""
Serializers for the clients app.
"""
from backend.serializers import CamelCaseSerializer
from .models import Client


class ClientSerializer(CamelCaseSerializer):
    """
    Serializer for Client model.
    Converts between snake_case (database) and camelCase (frontend).
    """
    
    class Meta:
        model = Client
        fields = [
            'id',
            'name',
            'type',
            'number',
            'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
