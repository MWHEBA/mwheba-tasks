# Backend Tests Documentation

## Test Structure

All tests are organized in the `backend/tests/` directory for centralized management and easy discovery.

```
backend/tests/
├── README.md                      # This file
├── test_api.py                    # API endpoint tests
├── test_backend_config.py         # CORS, Environment, Logging tests
├── test_error_handling.py         # Error handling and sanitization
├── test_file_validation.py        # File upload validation
├── test_integration.py            # Integration tests
├── test_models.py                 # Model tests
├── test_permissions.py            # Permission and authorization tests
├── test_task_actions.py           # Custom task actions and CASCADE
├── test_user_flows.py             # End-to-end user flows
└── __init__.py
```

## Running Tests

### Run All Tests
```bash
cd backend
pytest
```

### Run Specific Test File
```bash
pytest tests/test_api.py
pytest tests/test_models.py
```

### Run Specific Test Class
```bash
pytest tests/test_api.py::TestClientAPI
pytest tests/test_models.py::TestTaskModel
```

### Run Specific Test Method
```bash
pytest tests/test_api.py::TestClientAPI::test_list_clients
```

### Run with Coverage
```bash
pytest --cov=. --cov-report=html
```

### Run with Verbose Output
```bash
pytest -v
pytest -vv  # Extra verbose
```

### Run Only Fast Tests (Skip Slow)
```bash
pytest -m "not slow"
```

## Test Categories

### 1. API Tests (`test_api.py`)
Tests for REST API endpoints:
- Client CRUD operations
- Task CRUD operations
- User management
- Authentication

**Example:**
```python
@pytest.mark.django_db
class TestClientAPI:
    def test_list_clients(self, api_client, admin_user):
        # Test implementation
```

### 2. Model Tests (`test_models.py`)
Tests for Django models:
- Model creation
- Model relationships
- Model methods
- Model ordering

**Example:**
```python
@pytest.mark.django_db
class TestTaskModel:
    def test_create_task(self, client, status):
        # Test implementation
```

### 3. Integration Tests (`test_integration.py`)
Tests for complete workflows:
- Task lifecycle
- Client-task relationships
- User management workflows

**Example:**
```python
@pytest.mark.django_db
class TestCompleteTaskWorkflow:
    def test_create_task_workflow(self, api_client, admin_user):
        # Test implementation
```

### 4. Permission Tests (`test_permissions.py`)
Tests for authorization:
- Admin permissions
- Designer permissions
- Print manager permissions
- Unauthenticated access

**Example:**
```python
@pytest.mark.django_db
class TestAdminPermissions:
    def test_admin_can_create_users(self, api_client, admin_user):
        # Test implementation
```

### 5. User Flow Tests (`test_user_flows.py`)
End-to-end user journey tests:
- Complete admin workflow
- Designer workflow
- Comment workflow
- Client management flow

**Example:**
```python
@pytest.mark.django_db
class TestCompleteUserJourney:
    def test_admin_complete_workflow(self, api_client, admin_user):
        # Test implementation
```

### 6. Task Action Tests (`test_task_actions.py`)
Tests for custom task actions:
- Add activity log
- Overdue tasks
- Urgent tasks
- Add reply
- CASCADE delete

**Example:**
```python
@pytest.mark.django_db
class TestCustomActions:
    def test_add_activity_success(self):
        # Test implementation
```

### 7. Backend Config Tests (`test_backend_config.py`)
Tests for backend configuration:
- CORS settings
- Environment variables
- Logging filters

**Example:**
```python
class TestEnvironmentConfig:
    def test_validate_required_vars_all_present(self):
        # Test implementation
```

### 8. Error Handling Tests (`test_error_handling.py`)
Tests for error handling:
- Exception handler
- Error sanitization
- Production vs development errors

**Example:**
```python
@pytest.mark.django_db
class TestExceptionHandlerIntegration:
    def test_database_error_production_sanitized(self):
        # Test implementation
```

### 9. File Validation Tests (`test_file_validation.py`)
Tests for file upload validation:
- File size validation
- File type validation
- Serializer validation

**Example:**
```python
class FileUploadValidationTests:
    def test_validate_file_size_valid(self):
        # Test implementation
```

## Fixtures

Common fixtures are defined in `conftest.py`:

```python
@pytest.fixture
def api_client():
    """Create API client"""
    return APIClient()

@pytest.fixture
def admin_user():
    """Create admin user"""
    # Implementation

@pytest.fixture
def designer_user():
    """Create designer user"""
    # Implementation
```

## Test Markers

Available pytest markers:

- `@pytest.mark.django_db` - Test requires database access
- `@pytest.mark.slow` - Test is slow running

## Coverage

Current test coverage:

| Module | Coverage |
|--------|----------|
| Models | ~90% |
| Views | ~85% |
| Serializers | ~80% |
| Utils | ~75% |

## Best Practices

### 1. Use Fixtures
```python
@pytest.fixture
def test_client():
    return Client.objects.create(name="Test", type="New", number="C-001")

def test_something(test_client):
    # Use fixture
```

### 2. Use Descriptive Names
```python
# Good
def test_admin_can_create_users(self, api_client, admin_user):
    pass

# Bad
def test_1(self, api_client, admin_user):
    pass
```

### 3. Test One Thing
```python
# Good
def test_create_client(self):
    # Test only creation

def test_update_client(self):
    # Test only update

# Bad
def test_client_crud(self):
    # Tests create, read, update, delete all together
```

### 4. Use Assertions
```python
# Good
assert response.status_code == status.HTTP_200_OK
assert len(response.data) >= 1

# Bad
response.status_code == status.HTTP_200_OK  # No assertion
```

### 5. Clean Up
```python
def test_something(self):
    # Create test data
    client = Client.objects.create(...)
    
    # Test
    # ...
    
    # Cleanup (if needed)
    client.delete()
```

## Troubleshooting

### Tests Fail with Database Errors
```bash
# Recreate test database
pytest --create-db

# Or drop and recreate
python manage.py flush --no-input
pytest
```

### Tests Fail with Import Errors
```bash
# Ensure you're in the backend directory
cd backend

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

### Tests Run Slowly
```bash
# Run in parallel (requires pytest-xdist)
pip install pytest-xdist
pytest -n auto

# Skip slow tests
pytest -m "not slow"
```

## Adding New Tests

### 1. Choose the Right File
- API tests → `test_api.py`
- Model tests → `test_models.py`
- Integration tests → `test_integration.py`
- etc.

### 2. Follow the Pattern
```python
@pytest.mark.django_db
class TestNewFeature:
    """Tests for new feature"""
    
    def test_feature_works(self, api_client, admin_user):
        """Test that feature works correctly"""
        # Arrange
        # ...
        
        # Act
        # ...
        
        # Assert
        # ...
```

### 3. Run Your Tests
```bash
pytest tests/test_api.py::TestNewFeature -v
```

### 4. Check Coverage
```bash
pytest --cov=. --cov-report=term-missing
```

## CI/CD Integration

Tests are automatically run on:
- Every commit
- Every pull request
- Before deployment

Ensure all tests pass before merging!

---

**Last Updated:** December 2024  
**Version:** 3.0.0
