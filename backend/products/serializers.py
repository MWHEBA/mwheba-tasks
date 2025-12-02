"""
Serializers for the products app.
"""
from backend.serializers import CamelCaseSerializer
from .models import Product


class ProductSerializer(CamelCaseSerializer):
    """
    Serializer for Product model.
    Converts between snake_case (database) and camelCase (frontend).
    """
    
    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'is_vip',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
