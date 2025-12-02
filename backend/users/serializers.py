"""
Serializers for user authentication and profile management.
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile model"""
    
    class Meta:
        model = UserProfile
        fields = ['role', 'phone_number', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model with profile"""
    profile = UserProfileSerializer(read_only=True)
    role = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'is_staff', 'is_active', 'date_joined', 'profile', 'role', 'phone_number']
        read_only_fields = ['id', 'date_joined']
    
    def get_role(self, obj):
        """Get user role from profile"""
        return obj.get_role()
    
    def get_phone_number(self, obj):
        """Get phone number from profile"""
        if hasattr(obj, 'profile'):
            return obj.profile.phone_number
        return None


class CreateUserSerializer(serializers.ModelSerializer):
    """Serializer for creating a new user"""
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    role = serializers.ChoiceField(
        choices=UserProfile.ROLE_CHOICES,
        default='designer',
        required=False
    )
    phone_number = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role', 'phone_number']
    
    def create(self, validated_data):
        """Create user with profile"""
        role = validated_data.pop('role', 'designer')
        phone_number = validated_data.pop('phone_number', '')
        
        # Create user
        user = User.objects.create_user(**validated_data)
        
        # Create or update profile
        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                'role': role,
                'phone_number': phone_number
            }
        )
        
        return user


class UpdateUserSerializer(serializers.ModelSerializer):
    """Serializer for updating user"""
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    role = serializers.ChoiceField(
        choices=UserProfile.ROLE_CHOICES,
        required=False
    )
    phone_number = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 
                  'is_active', 'role', 'phone_number']
    
    def update(self, instance, validated_data):
        """Update user and profile"""
        role = validated_data.pop('role', None)
        phone_number = validated_data.pop('phone_number', None)
        password = validated_data.pop('password', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update password if provided
        if password:
            instance.set_password(password)
        
        instance.save()
        
        # Update profile
        if role is not None or phone_number is not None:
            profile, created = UserProfile.objects.get_or_create(user=instance)
            if role is not None:
                profile.role = role
            if phone_number is not None:
                profile.phone_number = phone_number
            profile.save()
        
        return instance


class LoginSerializer(serializers.Serializer):
    """Serializer for login request"""
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
