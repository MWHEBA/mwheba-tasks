"""
Production Settings Module

This module contains production-specific Django settings that override
the base settings.py configuration. It enforces security best practices,
optimizes performance, and configures production-ready logging.

Usage:
    Set DJANGO_SETTINGS_MODULE=backend.settings_production in production environment
    or import this module after base settings.
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
from .env_config import EnvironmentConfig

# Use pymysql as MySQLdb replacement
import pymysql
pymysql.install_as_MySQLdb()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env')

# Validate production configuration on startup
EnvironmentConfig.validate_production_config()

# ============================================================================
# SECURITY SETTINGS
# ============================================================================

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = EnvironmentConfig.get_secret_key()

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

# Production allowed hosts
ALLOWED_HOSTS = EnvironmentConfig.get_allowed_hosts()

# Security middleware settings
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False') == 'True'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'SAMEORIGIN'

# ============================================================================
# APPLICATION DEFINITION
# ============================================================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    
    # Local apps
    'users',
    'tasks',
    'clients',
    'products',
    'statuses',
    'settings',
    'notifications',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'backend.middleware.RequestLoggingMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# ============================================================================
# DATABASE CONFIGURATION WITH CONNECTION POOLING
# ============================================================================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            # Connection pooling settings
            'connect_timeout': 10,
            'read_timeout': 30,
            'write_timeout': 30,
        },
        # Connection pool settings
        'CONN_MAX_AGE': 600,  # Keep connections alive for 10 minutes
        'ATOMIC_REQUESTS': True,  # Wrap each request in a transaction
    }
}

# ============================================================================
# PASSWORD VALIDATION
# ============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# ============================================================================
# INTERNATIONALIZATION
# ============================================================================

LANGUAGE_CODE = 'ar'
TIME_ZONE = 'Africa/Cairo'
USE_I18N = True
USE_TZ = True

# ============================================================================
# STATIC AND MEDIA FILES
# ============================================================================

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ============================================================================
# DEFAULT PRIMARY KEY FIELD TYPE
# ============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================================================
# REST FRAMEWORK SETTINGS
# ============================================================================

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'throttling.LoggingAnonRateThrottle',
        'throttling.LoggingUserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/minute',
        'user': '200/minute',
        'login': '10/minute',
    },
    'EXCEPTION_HANDLER': 'backend.utils.custom_exception_handler',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
}

# ============================================================================
# CORS CONFIGURATION (PRODUCTION ONLY)
# ============================================================================

# Get CORS origins from environment, excluding development URLs
cors_origins_str = os.getenv('CORS_ALLOWED_ORIGINS', '')
if cors_origins_str:
    # Split by comma and strip whitespace
    cors_origins = [origin.strip() for origin in cors_origins_str.split(',')]
    
    # Filter out development URLs
    dev_patterns = ['localhost', '127.0.0.1', '0.0.0.0', ':5173', ':3000', ':8000']
    CORS_ALLOWED_ORIGINS = [
        origin for origin in cors_origins
        if not any(pattern in origin for pattern in dev_patterns)
    ]
    
    # Ensure we have at least one production origin
    if not CORS_ALLOWED_ORIGINS:
        raise ValueError(
            "No production CORS origins configured. "
            "Please set CORS_ALLOWED_ORIGINS in .env with production URLs only."
        )
else:
    raise ValueError(
        "CORS_ALLOWED_ORIGINS must be set in production. "
        "Please specify allowed origins in your .env file."
    )

CORS_ALLOW_CREDENTIALS = True

# Additional CORS security settings
CORS_ALLOW_ALL_ORIGINS = False

# Allowed HTTP methods for CORS requests
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Allowed headers in CORS requests
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Headers exposed to the browser in CORS responses
CORS_EXPOSE_HEADERS = [
    'content-type',
    'x-csrftoken',
]

# Cache preflight requests for 1 hour (3600 seconds)
CORS_PREFLIGHT_MAX_AGE = 3600

# ============================================================================
# JWT SETTINGS
# ============================================================================

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ============================================================================
# PRODUCTION LOGGING WITH JSON FORMAT
# ============================================================================

# Create logs directory if it doesn't exist
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d %(funcName)s',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'sanitize': {
            '()': 'backend.logging_filters.SensitiveDataFilter',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'app.log',
            'maxBytes': 100 * 1024 * 1024,  # 100MB
            'backupCount': 10,  # Keep 10 backup files
            'formatter': 'json',
            'filters': ['sanitize'],
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'errors.log',
            'maxBytes': 100 * 1024 * 1024,  # 100MB
            'backupCount': 10,  # Keep 10 backup files
            'formatter': 'json',
            'filters': ['sanitize'],
        },
        'console': {
            'level': 'WARNING',  # Only warnings and above in production console
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'filters': ['require_debug_false', 'sanitize'],
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'filters': ['require_debug_false', 'sanitize'],
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'error_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['error_file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['error_file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['file'],
            'level': 'WARNING',  # Only log warnings and errors for DB queries
            'propagate': False,
        },
        'tasks': {
            'handlers': ['file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'notifications': {
            'handlers': ['file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'users': {
            'handlers': ['file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'backend': {
            'handlers': ['file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['file', 'error_file', 'console'],
        'level': 'INFO',
    },
}

# ============================================================================
# ADMIN CONFIGURATION
# ============================================================================

# Admin email for error notifications
ADMINS = [
    ('Admin', os.getenv('ADMIN_EMAIL', 'admin@mwheba.com')),
]

MANAGERS = ADMINS

# ============================================================================
# EMAIL CONFIGURATION (for error notifications)
# ============================================================================

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@mwheba.com')
SERVER_EMAIL = os.getenv('SERVER_EMAIL', 'server@mwheba.com')

# ============================================================================
# CACHE CONFIGURATION
# ============================================================================

# Use database caching for simplicity (can be upgraded to Redis later)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'django_cache_table',
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
            'CULL_FREQUENCY': 3,
        }
    }
}

# ============================================================================
# FILE UPLOAD SETTINGS
# ============================================================================

# Maximum upload size: 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# Allowed file extensions for uploads
ALLOWED_UPLOAD_EXTENSIONS = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 
    'txt', 'csv', 'jpg', 'jpeg', 'png', 'gif'
]

# ============================================================================
# PRODUCTION VALIDATION
# ============================================================================

# Ensure critical settings are correct
assert DEBUG is False, "DEBUG must be False in production"
assert SECRET_KEY != 'django-insecure-dev-key-change-this-in-production', \
    "SECRET_KEY must be changed from default value"
assert len(ALLOWED_HOSTS) > 0, "ALLOWED_HOSTS must not be empty in production"
assert len(CORS_ALLOWED_ORIGINS) > 0, "CORS_ALLOWED_ORIGINS must not be empty in production"
