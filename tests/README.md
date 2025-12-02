# Testing Guide

## Overview
Comprehensive testing suite covering Frontend (React/TypeScript) and Backend (Django/Python).

## Running Tests

### Frontend Tests (Vitest)
```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Backend Tests (Pytest)
```bash
# Navigate to backend directory
cd backend

# Run all tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ --cov

# Run specific test file
python -m pytest tests/test_models.py -v
```

## Test Structure

### Frontend Tests
```
tests/
├── components/       # Component tests (Layout, ErrorBoundary, StatusBadge, LoadingSpinner)
├── pages/           # Page tests (Login)
├── services/        # Service tests (auth, task, client, user, status, product)
├── contexts/        # Context tests (AuthContext)
└── setup.ts         # Test configuration
```

### Backend Tests
```
backend/tests/
├── test_models.py   # Model tests (Client, Task, User, Comment, ActivityLog)
├── test_api.py      # API endpoint tests (CRUD operations, authentication)
└── __init__.py
```

## Test Coverage Summary

### ✅ Frontend (151 tests)

**Components (8 files - 68 tests)**
- Layout.tsx - Navigation, user menu, logout (7 tests)
- ErrorBoundary.tsx - Error handling, fallback UI (4 tests)
- LoadingSpinner.tsx - Loading states, overlays (7 tests)
- StatusBadge.tsx - Status display, accessibility (5 tests)
- ConfirmDialog.tsx - Confirmation dialogs, user interactions (10 tests)
- ErrorMessage.tsx - Error display, variants, actions (13 tests)
- DeadlineBadge.tsx - Deadline display, alert levels (8 tests)
- UrgencyBadge.tsx - Urgency indicators (5 tests)
- ProgressBar.tsx - Progress visualization (5 tests)
- SkeletonLoader.tsx - Loading placeholders (4 tests)

**Pages (1 file - 8 tests)**
- Login.tsx - Authentication, form validation (8 tests)

**Services (8 files - 64 tests)**
- authService.ts - Token management, authentication (16 tests)
- taskService.ts - Task CRUD, status updates (11 tests)
- clientService.ts - Client management (12 tests)
- userService.ts - User management (8 tests)
- statusService.ts - Status operations (10 tests)
- productService.ts - Product management (10 tests)
- settingsService.ts - Settings management (6 tests)

**Contexts (1 file - 11 tests)**
- AuthContext.tsx - State management, auth flows (11 tests)

**E2E User Flows (1 file - 12 tests)**
- Login to Dashboard - Complete authentication flow (2 tests)
- Admin User Management - User creation and management (1 test)
- Designer Task Creation - Task creation workflow (1 test)
- Task Status Updates - Status change workflow (1 test)
- Comment and Reply - Comment interaction flow (1 test)
- File Upload - Attachment upload flow (1 test)
- Search and Filter - Search and filter functionality (2 tests)
- Notifications - Notification system (1 test)
- Settings Management - Settings update flow (1 test)
- Logout - Logout workflow (1 test)

### ✅ Backend (40 tests)

**Models (14 tests)**
- Client model - Creation, validation, ordering (3 tests)
- Task model - CRUD, subtasks, ordering (3 tests)
- Comment model - Comments, replies, resolution (3 tests)
- UserProfile model - Roles, permissions (4 tests)
- ActivityLog model - Activity tracking (1 test)

**API Endpoints (10 tests)**
- Client API - List, create, update, delete (4 tests)
- Task API - List, create (2 tests)
- User API - List, create (2 tests)
- Auth API - Login, invalid credentials (2 tests)

**Permissions (10 tests)**
- Admin permissions - User management, full access (3 tests)
- Designer permissions - Limited access (2 tests)
- Print Manager permissions - View-only access (2 tests)
- Unauthenticated access - Security checks (3 tests)

**Integration (6 tests)**
- Complete task workflow - End-to-end task lifecycle (2 tests)
- Client-task relationship - Cascading operations (2 tests)
- User management workflow - User lifecycle (2 tests)

## Total Coverage

**Frontend**: 163 tests ✅
**Backend**: 45 tests ✅
**Total**: 208 tests ✅

### Coverage Breakdown

**Frontend (163 tests)**
- Components: 68 tests
- Pages: 8 tests
- Services: 64 tests
- Contexts: 11 tests
- E2E User Flows: 12 tests

**Backend (45 tests)**
- Models: 14 tests
- API Endpoints: 10 tests
- Permissions: 10 tests
- Integration: 6 tests
- User Flows: 5 tests

## Writing Tests

### Frontend Component Tests
```typescript
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

it('renders component', () => {
  render(
    <BrowserRouter>
      <YourComponent />
    </BrowserRouter>
  );
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### Frontend Service Tests
```typescript
import { vi } from 'vitest';

vi.mock('../../config/api', () => ({
  apiCall: vi.fn(),
}));

it('calls API correctly', async () => {
  const { apiCall } = await import('../../config/api');
  vi.mocked(apiCall).mockResolvedValueOnce({ data: 'test' });
  // Test your service
});
```

### Backend Model Tests
```python
@pytest.mark.django_db
def test_create_model():
    obj = MyModel.objects.create(name="Test")
    assert obj.name == "Test"
```

### Backend API Tests
```python
@pytest.mark.django_db
def test_api_endpoint(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    response = api_client.get('/api/endpoint/')
    assert response.status_code == 200
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies (API calls, localStorage, database)
3. **Accessibility**: Use semantic queries (getByRole, getByLabelText)
4. **Coverage**: Test happy paths and error cases
5. **Cleanup**: Tests automatically cleanup after each run
6. **Fixtures**: Use pytest fixtures for reusable test data

## Troubleshooting

### Frontend Issues

**Issue**: Tests fail with "Cannot read properties of undefined"
**Solution**: Ensure all external dependencies are properly mocked

**Issue**: Multiple elements found
**Solution**: Use more specific queries (getByRole, getAllBy*)

**Issue**: Async operations timeout
**Solution**: Use waitFor() for async operations

### Backend Issues

**Issue**: Database errors
**Solution**: Use @pytest.mark.django_db decorator

**Issue**: Authentication errors
**Solution**: Use api_client.force_authenticate(user=user)

**Issue**: Import errors
**Solution**: Ensure DJANGO_SETTINGS_MODULE is set correctly in pytest.ini
