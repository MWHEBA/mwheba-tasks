"""
Basic views for the backend project.
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import connection


@api_view(['GET'])
def health_check(request):
    """
    Health check endpoint to verify the server is running.
    Returns server status and database connection status.
    """
    try:
        # Test database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return Response({
        'status': 'ok',
        'database': db_status,
        'message': 'Django backend is running'
    })
