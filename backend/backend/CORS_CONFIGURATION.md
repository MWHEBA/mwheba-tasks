# CORS Configuration Guide

## Overview

This document explains the CORS (Cross-Origin Resource Sharing) configuration for the task management system. CORS is configured to allow the React frontend to communicate with the Django backend API while maintaining security.

## Configuration Files

### Development Settings (`settings.py`)

In development, CORS is configured to allow requests from local development servers:

```python
CORS_ALLOWED_ORIGINS = ['http://localhost:5173']  # Default Vite dev server
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False
```

### Production Settings (`settings_production.py`)

In production, CORS is more restrictive and automatically filters out development URLs:

```python
# Automatically filters localhost, 127.0.0.1, and common dev ports
CORS_ALLOWED_ORIGINS = ['https://tasks.mwheba.com']  # Production domain only
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False
```

## Environment Variables

Set the `CORS_ALLOWED_ORIGINS` environment variable in your `.env` file:

**Development:**
```env
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

**Production:**
```env
CORS_ALLOWED_ORIGINS=https://tasks.mwheba.com,https://api.mwheba.com
```

Multiple origins can be separated by commas.

## Security Features

### 1. Origin Validation (Requirement 4.1)
- All requests are validated against the `CORS_ALLOWED_ORIGINS` list
- Requests from unauthorized origins are rejected
- No wildcard origins allowed

### 2. Production URL Filtering (Requirement 4.2)
- Development URLs (localhost, 127.0.0.1, etc.) are automatically filtered in production
- Only HTTPS origins should be used in production

### 3. Credentials Support (Requirement 4.3)
- `CORS_ALLOW_CREDENTIALS = True` allows cookies and authorization headers
- Required for JWT authentication

### 4. Preflight Request Handling (Requirement 4.4)
- OPTIONS requests are handled automatically by django-cors-headers
- Preflight responses include all required CORS headers
- Preflight responses are cached for 1 hour (3600 seconds)

### 5. Invalid Origin Rejection (Requirement 4.5)
- Requests from origins not in the allowed list are rejected
- No CORS headers are added to responses for invalid origins

## Allowed Methods

The following HTTP methods are allowed for CORS requests:

- GET
- POST
- PUT
- PATCH
- DELETE
- OPTIONS (for preflight)

## Allowed Headers

The following headers are allowed in CORS requests:

- accept
- accept-encoding
- authorization (for JWT tokens)
- content-type
- dnt
- origin
- user-agent
- x-csrftoken (for CSRF protection)
- x-requested-with

## Exposed Headers

The following headers are exposed to the browser in CORS responses:

- content-type
- x-csrftoken

## Testing

Run the CORS configuration tests:

```bash
cd backend
python -m pytest backend/test_cors_config.py -v
```

## Troubleshooting

### CORS Error: "No 'Access-Control-Allow-Origin' header"

**Cause:** The frontend origin is not in `CORS_ALLOWED_ORIGINS`

**Solution:** Add your frontend URL to the `CORS_ALLOWED_ORIGINS` environment variable

### CORS Error: "Credentials flag is true, but Access-Control-Allow-Credentials is not"

**Cause:** `CORS_ALLOW_CREDENTIALS` is not set to True

**Solution:** Verify that `CORS_ALLOW_CREDENTIALS = True` in settings

### Preflight Request Failing

**Cause:** Missing required headers or methods in CORS configuration

**Solution:** Verify that `CORS_ALLOW_METHODS` and `CORS_ALLOW_HEADERS` include the required values

## Production Checklist

Before deploying to production:

- [ ] Set `CORS_ALLOWED_ORIGINS` to production domain(s) only
- [ ] Verify no development URLs (localhost, 127.0.0.1) in CORS origins
- [ ] Ensure all production origins use HTTPS
- [ ] Test CORS with actual production domain
- [ ] Verify preflight requests work correctly
- [ ] Check that credentials (JWT tokens) are sent correctly

## References

- [django-cors-headers Documentation](https://github.com/adamchainz/django-cors-headers)
- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
