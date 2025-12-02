# Production Environment Setup Guide

## Overview

This guide provides comprehensive instructions for setting up and configuring the production environment for the Task Management System on cPanel hosting. Follow these steps carefully to ensure a secure and properly configured production deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables Configuration](#environment-variables-configuration)
3. [SECRET_KEY Generation](#secret-key-generation)
4. [Database Configuration](#database-configuration)
5. [CORS Configuration](#cors-configuration)
6. [Security Checklist](#security-checklist)
7. [Validation](#validation)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- Access to cPanel hosting account
- SSH access (optional but recommended)
- MySQL database created in cPanel
- Database user with full privileges
- Production domain configured and pointing to your server

---

## Environment Variables Configuration

### Step 1: Copy the Template

1. Navigate to your backend directory:
   ```bash
   cd /home/mwmwheba/mwheba_tasks/backend/
   ```

2. Copy the production template to create your `.env` file:
   ```bash
   cp .env.production.template .env
   ```

3. Set proper file permissions (owner read/write only):
   ```bash
   chmod 600 .env
   ```

### Step 2: Edit the .env File

Open the `.env` file and configure each variable according to the sections below.

---

## SECRET_KEY Generation

The `SECRET_KEY` is one of the most critical security settings. It must be:
- **Unique**: Different from development, staging, and any example keys
- **Strong**: Minimum 50 characters with mixed alphanumeric and special characters
- **Secret**: Never shared or committed to version control

### Generation Methods

Choose one of the following methods to generate a secure SECRET_KEY:

#### Method 1: Using Django's Built-in Generator (Recommended)

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**Example output:**
```
django-insecure-k8$2h#9x@m4v!n7p&q3r*s5t+u6w=y8z^a1b-c2d_e3f~g4h
```

#### Method 2: Using OpenSSL

```bash
openssl rand -base64 50
```

**Example output:**
```
Xk9mP2nQ3rR4sS5tT6uU7vV8wW9xX0yY1zZ2aA3bB4cC5dD6eE7fF8gG9hH0iI1j
```

#### Method 3: Using Python secrets Module

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

**Example output:**
```
vN8wX9yY0zZ1aA2bB3cC4dD5eE6fF7gG8hH9iI0jJ1kK2lL3mM4nN5oO6pP7qQ8r
```

### Update .env File

Copy the generated key and update your `.env` file:

```bash
SECRET_KEY=your-generated-key-here
```

**Important**: Remove any quotes around the key value.

---

## Database Configuration

### Step 1: Create Database in cPanel

1. Log in to cPanel
2. Navigate to **MySQL® Databases**
3. Create a new database:
   - Database name: `tasks` (will become `mwmwheba_tasks`)
4. Create a database user:
   - Username: `tasks` (will become `mwmwheba_tasks`)
   - Generate a strong password using cPanel's password generator
5. Add user to database with **ALL PRIVILEGES**

### Step 2: Configure Database Variables

Update your `.env` file with the database credentials:

```bash
DB_NAME=mwmwheba_tasks
DB_USER=mwmwheba_tasks
DB_PASSWORD=your-generated-database-password
DB_HOST=localhost
DB_PORT=3306
```

### Database Configuration Notes

- **DB_NAME**: Use the full database name as shown in cPanel (includes prefix)
- **DB_USER**: Use the full username as shown in cPanel (includes prefix)
- **DB_PASSWORD**: Use the exact password generated/set in cPanel
- **DB_HOST**: For cPanel shared hosting, always use `localhost`
- **DB_PORT**: Standard MySQL port is `3306`

### Step 3: Test Database Connection

Test the connection before proceeding:

```bash
cd /home/mwmwheba/mwheba_tasks/backend/
source venv/bin/activate
python manage.py check --database default
```

If successful, you should see:
```
System check identified no issues (0 silenced).
```

---

## CORS Configuration

CORS (Cross-Origin Resource Sharing) controls which domains can access your API.

### Production CORS Settings

Update your `.env` file with production-only origins:

```bash
CORS_ALLOWED_ORIGINS=https://tasks.mwheba.com
```

### Multiple Origins

If you have multiple domains or subdomains, separate them with commas (no spaces):

```bash
CORS_ALLOWED_ORIGINS=https://tasks.mwheba.com,https://www.tasks.mwheba.com
```

### CORS Security Rules

**DO:**
- ✅ Use full HTTPS URLs
- ✅ Include only production domains
- ✅ Remove trailing slashes
- ✅ Test each origin individually

**DON'T:**
- ❌ Include `localhost` or `127.0.0.1`
- ❌ Include development URLs
- ❌ Use wildcards (`*`)
- ❌ Include HTTP URLs (use HTTPS only)
- ❌ Add spaces between origins

### Example Configurations

**Single domain:**
```bash
CORS_ALLOWED_ORIGINS=https://tasks.mwheba.com
```

**Multiple domains:**
```bash
CORS_ALLOWED_ORIGINS=https://tasks.mwheba.com,https://api.tasks.mwheba.com
```

**With CDN:**
```bash
CORS_ALLOWED_ORIGINS=https://tasks.mwheba.com,https://cdn.tasks.mwheba.com
```

---

## Security Checklist

Before deploying to production, verify each item:

### Critical Security Settings

- [ ] **DEBUG is False**
  ```bash
  DEBUG=False
  ```

- [ ] **SECRET_KEY is strong and unique**
  - Minimum 50 characters
  - Contains mixed alphanumeric and special characters
  - Different from development key
  - Not a default or example value

- [ ] **ALLOWED_HOSTS is configured**
  ```bash
  ALLOWED_HOSTS=tasks.mwheba.com
  ```

- [ ] **CORS origins are production-only**
  - No localhost URLs
  - No development URLs
  - HTTPS only

### File Security

- [ ] **.env file permissions are 600**
  ```bash
  chmod 600 /home/mwmwheba/mwheba_tasks/backend/.env
  ```

- [ ] **.env is not in version control**
  - Check `.gitignore` includes `.env`
  - Verify `.env` not in git history

- [ ] **.htaccess protects .env files**
  - Root `.htaccess` denies access to `.env`
  - API `.htaccess` denies access to `.env`

### Database Security

- [ ] **Database password is strong**
  - Minimum 16 characters
  - Mixed alphanumeric and special characters
  - Generated using secure method

- [ ] **Database user has minimal privileges**
  - Only privileges needed for application
  - No SUPER or FILE privileges

### Additional Security

- [ ] **Static files are collected**
  ```bash
  python manage.py collectstatic --noinput
  ```

- [ ] **Migrations are applied**
  ```bash
  python manage.py migrate
  ```

- [ ] **HTTPS is enforced**
  - `.htaccess` redirects HTTP to HTTPS
  - No mixed content warnings

---

## Validation

### Step 1: Run Django's Deployment Check

Django includes a built-in deployment security check:

```bash
cd /home/mwmwheba/mwheba_tasks/backend/
source venv/bin/activate
python manage.py check --deploy
```

This command checks for common security issues. Address any warnings or errors before proceeding.

### Step 2: Run Production Validation Script

Use the custom validation script to verify all settings:

```bash
cd /home/mwmwheba/mwheba_tasks/backend/
source venv/bin/activate
python scripts/validate_production.py
```

The script validates:
- DEBUG is False
- SECRET_KEY is secure
- ALLOWED_HOSTS is configured
- Database connectivity
- Required environment variables
- Static files configuration

### Step 3: Manual Verification

Test the following manually:

1. **API Endpoints**
   ```bash
   curl -I https://tasks.mwheba.com/api/
   ```
   Should return 200 OK with security headers

2. **.env File Protection**
   ```bash
   curl https://tasks.mwheba.com/.env
   ```
   Should return 403 Forbidden

3. **CORS Headers**
   ```bash
   curl -H "Origin: https://tasks.mwheba.com" -I https://tasks.mwheba.com/api/
   ```
   Should include `Access-Control-Allow-Origin` header

4. **Static Files**
   ```bash
   curl -I https://tasks.mwheba.com/static/admin/css/base.css
   ```
   Should return 200 OK with cache headers

---

## Troubleshooting

### Issue: "SECRET_KEY not set" Error

**Symptoms:**
- Application fails to start
- Error message about SECRET_KEY

**Solutions:**
1. Verify `.env` file exists in backend directory
2. Check SECRET_KEY is set in `.env` (no quotes)
3. Verify file permissions: `chmod 600 .env`
4. Restart Passenger: `touch tmp/restart.txt`

### Issue: Database Connection Failed

**Symptoms:**
- "Can't connect to MySQL server"
- "Access denied for user"

**Solutions:**
1. Verify database credentials in `.env`
2. Check database exists in cPanel
3. Verify user has privileges on database
4. Test connection: `python manage.py dbshell`
5. Check DB_HOST is `localhost` for cPanel

### Issue: CORS Errors in Browser

**Symptoms:**
- "CORS policy: No 'Access-Control-Allow-Origin' header"
- API requests fail from frontend

**Solutions:**
1. Verify CORS_ALLOWED_ORIGINS in `.env`
2. Check origin URL matches exactly (no trailing slash)
3. Ensure HTTPS is used (not HTTP)
4. Restart Passenger: `touch tmp/restart.txt`
5. Check browser console for exact origin being sent

### Issue: Static Files Not Loading

**Symptoms:**
- CSS/JS files return 404
- Admin panel has no styling

**Solutions:**
1. Run collectstatic: `python manage.py collectstatic --noinput`
2. Verify STATIC_ROOT in settings
3. Check file permissions on staticfiles directory
4. Verify .htaccess allows static file access

### Issue: DEBUG=False Shows Generic Error Page

**Symptoms:**
- All errors show "Server Error (500)"
- No error details visible

**Solutions:**
This is expected behavior in production. To debug:
1. Check error logs: `tail -f logs/errors.log`
2. Temporarily set DEBUG=True (only for debugging)
3. Use Django's logging to capture errors
4. Check Passenger error logs in cPanel

### Issue: File Uploads Fail

**Symptoms:**
- File upload returns error
- Files not saved to media directory

**Solutions:**
1. Verify MEDIA_ROOT directory exists
2. Check directory permissions: `chmod 755 media/`
3. Verify FILE_UPLOAD_MAX_MEMORY_SIZE setting
4. Check disk space: `df -h`
5. Review error logs for specific error

---

## Environment Variables Reference

### Required Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `DEBUG` | Boolean | Debug mode (must be False) | `False` |
| `SECRET_KEY` | String | Django secret key (50+ chars) | `django-insecure-k8$2h#9x...` |
| `ALLOWED_HOSTS` | String | Comma-separated domains | `tasks.mwheba.com` |
| `DB_NAME` | String | Database name | `mwmwheba_tasks` |
| `DB_USER` | String | Database username | `mwmwheba_tasks` |
| `DB_PASSWORD` | String | Database password | `Ha^%Fe0]Lh5;9+QG` |
| `DB_HOST` | String | Database host | `localhost` |
| `CORS_ALLOWED_ORIGINS` | String | Comma-separated URLs | `https://tasks.mwheba.com` |

### Optional Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DB_PORT` | Integer | `3306` | Database port |
| `FILE_UPLOAD_MAX_MEMORY_SIZE` | Integer | `10485760` | Max upload size (bytes) |
| `JWT_ACCESS_TOKEN_LIFETIME` | Integer | `60` | Access token lifetime (minutes) |
| `JWT_REFRESH_TOKEN_LIFETIME` | Integer | `7` | Refresh token lifetime (days) |
| `LOG_LEVEL` | String | `INFO` | Logging level |

---

## Additional Resources

- [Django Deployment Checklist](https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/)
- [cPanel Documentation](https://docs.cpanel.net/)
- [Django Security Best Practices](https://docs.djangoproject.com/en/4.2/topics/security/)
- [CORS Configuration Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

## Support

If you encounter issues not covered in this guide:

1. Check application logs: `backend/logs/errors.log`
2. Check Passenger logs in cPanel
3. Run validation script: `python scripts/validate_production.py`
4. Review Django deployment checklist: `python manage.py check --deploy`

---

**Last Updated:** 2024
**Version:** 1.0
