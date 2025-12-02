"""
Views for the clients app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from permissions import IsAdminOrReadOnly
from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Client model.
    Provides CRUD operations for clients.
    
    Permissions:
    - Admin: Full access (create, read, update, delete)
    - Other authenticated users: Read-only access
    """
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAdminOrReadOnly]
    
    def get_queryset(self):
        """
        Get queryset ordered by name.
        """
        return Client.objects.all().order_by('name')
    
    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        """
        Bulk import multiple clients at once.
        If a client with the same number exists, it will be updated instead of creating a duplicate.
        
        Example:
        POST /api/clients/bulk-import/
        [
            {"name": "Client 1", "number": "C-001", "type": "existing"},
            {"name": "Client 2", "number": "C-002", "type": "new"}
        ]
        """
        if not isinstance(request.data, list):
            return Response(
                {'error': 'Expected a list of clients'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_count = 0
        updated_count = 0
        errors = []
        
        for client_data in request.data:
            number = client_data.get('number')
            
            # Try to find existing client by number
            existing_client = None
            if number:
                try:
                    existing_client = Client.objects.get(number=number)
                except Client.DoesNotExist:
                    pass
            
            if existing_client:
                # Update existing client
                serializer = self.get_serializer(existing_client, data=client_data, partial=False)
                if serializer.is_valid():
                    serializer.save()
                    updated_count += 1
                else:
                    errors.append({
                        'number': number,
                        'errors': serializer.errors
                    })
            else:
                # Create new client
                serializer = self.get_serializer(data=client_data)
                if serializer.is_valid():
                    serializer.save()
                    created_count += 1
                else:
                    errors.append({
                        'number': number,
                        'errors': serializer.errors
                    })
        
        total = created_count + updated_count
        message = f'تم استيراد {total} عميل'
        if created_count > 0:
            message += f' ({created_count} جديد'
        if updated_count > 0:
            if created_count > 0:
                message += f'، {updated_count} محدث)'
            else:
                message += f' ({updated_count} محدث)'
        elif created_count > 0:
            message += ')'
        
        response_data = {
            'message': message,
            'count': total,
            'created': created_count,
            'updated': updated_count
        }
        
        if errors:
            response_data['errors'] = errors
        
        return Response(response_data, status=status.HTTP_201_CREATED)
