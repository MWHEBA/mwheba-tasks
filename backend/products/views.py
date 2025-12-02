"""
Views for the products app.
"""
from rest_framework import viewsets
from permissions import IsAdminOrReadOnly
from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product model.
    Provides CRUD operations for products.
    
    Permissions:
    - Admin: Full access (create, read, update, delete)
    - Other authenticated users: Read-only access
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    
    def get_queryset(self):
        """
        Get queryset ordered by name.
        """
        return Product.objects.all().order_by('name')
