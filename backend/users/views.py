"""
Views for user authentication and profile management.
"""
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .serializers import UserSerializer, LoginSerializer, CreateUserSerializer, UpdateUserSerializer
from .models import UserProfile
from throttling import LoginThrottle
from permissions import IsAdminOrReadOnly


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login_view(request):
    """
    Login endpoint - POST /api/auth/login
    
    Authenticates user and returns JWT tokens.
    """
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    username = serializer.validated_data['username']
    password = serializer.validated_data['password']
    
    user = authenticate(username=username, password=password)
    
    if user is None:
        return Response(
            {'error': 'بيانات الدخول غير صحيحة'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.is_active:
        return Response(
            {'error': 'حساب المستخدم معطل'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Create or get user profile
    profile, created = UserProfile.objects.get_or_create(user=user)
    
    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout endpoint - POST /api/auth/logout
    
    Blacklists the refresh token.
    """
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logout successful'})
        except Exception as token_error:
            # Token might already be blacklisted or invalid
            # Still return success as the user is logged out
            return Response({'message': 'Logout successful'})
            
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """
    Current user endpoint - GET /api/auth/me
    
    Returns the currently authenticated user's information.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user management.
    
    - GET /api/users/ - List all users (all authenticated users)
    - POST /api/users/ - Create new user (admin only)
    - GET /api/users/{id}/ - Get user details (all authenticated users)
    - PUT/PATCH /api/users/{id}/ - Update user (admin only)
    - DELETE /api/users/{id}/ - Delete user (admin only)
    - POST /api/users/{id}/toggle_active/ - Toggle user active status (admin only)
    """
    queryset = User.objects.filter(is_active=True).select_related('profile').order_by('-date_joined')
    permission_classes = [IsAdminOrReadOnly]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return CreateUserSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateUserSerializer
        return UserSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new user with profile"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create user
        user = serializer.save()
        
        # Return user data
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """Update user and profile"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Update user
        user = serializer.save()
        
        return Response(UserSerializer(user).data)
    
    def destroy(self, request, *args, **kwargs):
        """Delete user (soft delete by setting is_active=False)"""
        instance = self.get_object()
        
        # Prevent deleting yourself
        if instance.id == request.user.id:
            return Response(
                {'error': 'Cannot delete your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Soft delete: set is_active to False instead of deleting
        instance.is_active = False
        instance.save()
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle user active status"""
        user = self.get_object()
        
        # Prevent toggling yourself
        if user.id == request.user.id:
            return Response(
                {'error': 'Cannot toggle your own account status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = not user.is_active
        user.save()
        
        return Response(UserSerializer(user).data)
