#!/usr/bin/env python
"""
Database Setup Script
Runs migrations and loads all initial fixtures

Usage:
    python backend/scripts/setup_database.py
    
    Or from backend directory:
    python scripts/setup_database.py
"""

import os
import sys
import django
from pathlib import Path


def setup_django():
    """Setup Django environment"""
    # Add backend directory to Python path
    backend_dir = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(backend_dir))
    
    # Set Django settings module
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    
    # Setup Django
    django.setup()


def run_migrations():
    """Run database migrations"""
    from django.core.management import call_command
    
    print("=" * 70)
    print("Running database migrations...")
    print("=" * 70)
    print()
    
    try:
        call_command('migrate', '--noinput', verbosity=1)
        print()
        print("✓ Migrations completed successfully")
        return True
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        return False


def load_fixtures():
    """Load initial data fixtures"""
    from django.core.management import call_command
    
    print()
    print("=" * 70)
    print("Loading initial data...")
    print("=" * 70)
    print()
    
    fixtures = [
        ('statuses/fixtures/initial_statuses.json', 'Statuses'),
        ('products/fixtures/initial_products.json', 'Products'),
        ('settings/fixtures/initial_settings.json', 'Settings'),
    ]
    
    success = True
    
    for fixture_path, name in fixtures:
        try:
            print(f"Loading {name}...")
            call_command('loaddata', fixture_path, verbosity=1)
            print(f"✓ {name} loaded successfully")
            print()
        except Exception as e:
            print(f"✗ Failed to load {name}: {e}")
            print()
            success = False
    
    return success


def create_superuser():
    """Create default superuser if not exists"""
    from django.contrib.auth import get_user_model
    
    print()
    print("=" * 70)
    print("Creating default superuser...")
    print("=" * 70)
    print()
    
    User = get_user_model()
    
    username = 'admin'
    password = 'admin123'
    
    try:
        if User.objects.filter(username=username).exists():
            print(f"⚠ Superuser '{username}' already exists")
            return True
        
        User.objects.create_superuser(
            username=username,
            password=password,
            email='admin@example.com'
        )
        print(f"✓ Superuser created successfully")
        print(f"  Username: {username}")
        print(f"  Password: {password}")
        print()
        print("⚠ IMPORTANT: Change the password after first login!")
        return True
    except Exception as e:
        print(f"✗ Failed to create superuser: {e}")
        return False


def collect_static():
    """Collect static files"""
    from django.core.management import call_command
    
    print()
    print("=" * 70)
    print("Collecting static files...")
    print("=" * 70)
    print()
    
    try:
        call_command('collectstatic', '--noinput', verbosity=1)
        print()
        print("✓ Static files collected successfully")
        return True
    except Exception as e:
        print(f"✗ Failed to collect static files: {e}")
        return False


def main():
    """Main entry point"""
    print()
    print("=" * 70)
    print("Database Setup Script")
    print("=" * 70)
    print()
    
    # Setup Django
    setup_django()
    
    # Run migrations
    migrations_ok = run_migrations()
    
    if not migrations_ok:
        print()
        print("✗ Setup failed at migration step")
        sys.exit(1)
    
    # Load fixtures
    fixtures_ok = load_fixtures()
    
    # Create superuser
    superuser_ok = create_superuser()
    
    # Collect static files
    static_ok = collect_static()
    
    print()
    print("=" * 70)
    if migrations_ok and fixtures_ok and superuser_ok and static_ok:
        print("✓ Database setup completed successfully!")
    else:
        print("⚠ Database setup completed with some warnings")
    print("=" * 70)
    print()
    
    sys.exit(0 if (migrations_ok and fixtures_ok) else 1)


if __name__ == '__main__':
    main()
