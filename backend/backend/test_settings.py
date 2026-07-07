from .settings import *

# Use SQLite for testing to make test runs fast and independent
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Override to ensure SQLITE is activated for testing
USE_SQLITE = True
