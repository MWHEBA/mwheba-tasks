# cPanel Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying updates to the Task Management System on cPanel hosting. It covers backend deployment, frontend deployment, database migrations, static file collection, Passenger restart procedures, rollback procedures, and troubleshooting.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Backend Deployment](#backend-deployment)
3. [Frontend Deployment](#frontend-deployment)
4. [Database Migration Process](#database-migration-process)
5. [Static File Collection](#static-file-collection)
6. [Passenger Restart Procedure](#passenger-restart-procedure)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Rollback Procedure](#rollback-procedure)
9. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying any changes, complete this checklist:

### Code Preparation

- [ ] All changes committed to version control
- [ ] Code reviewed and tested locally
- [ ] All tests passing in development environment
- [ ] Dependencies updated in `requirements.txt` (backend) and `package.json` (frontend)
- [ ] Database migrations created and tested locally
- [ ] Environment variables documented if new ones added

### Production Validation

- [ ] Run production validation script locally:
  ```bash
  python backend/scripts/validate_production.py
  ```

- [ ] Run Django deployment check:
  ```bash
  python manage.py check --deploy
  ```

- [ ] Verify `.env` file has all required variables
- [ ] Confirm DEBUG=False in production `.env`
- [ ] Backup current production database
- [ ] Backup current production code

### Communication

- [ ] Notify users of planned maintenance window (if applicable)
- [ ] Schedule deployment during low-traffic period
- [ ] Have rollback plan ready

---

## Backend Deployment

### Step 1: Connect to Server

Connect via SSH or use cPanel File Manager and Terminal:

```bash
ssh mwmwheba@tasks.mwheba.com
```

### Step 2: Navigate to Backend Directory

```bash
cd /home/mwmwheba/mwheba_tasks/backend/
```

### Step 3: Backup Current Code

Create a backup of the current deployment:

```bash
cd /home/mwmwheba/mwheba_tasks/
tar -czf backup_backend_$(date +%Y%m%d_%H%M%S).tar.gz backend/
```

### Step 4: Pull Latest Code

If using Git:

```bash
cd /home/mwmwheba/mwheba_tasks/backend/
git fetch origin
git pull origin main
```

Or upload files via FTP/cPanel File Manager if not using Git.

### Step 5: Activate Virtual Environment

```bash
source /home/mwmwheba/mwheba_tasks/backend/venv/bin/activate
```

### Step 6: Update Dependencies

Install any new or updated Python packages:

```bash
pip install -r requirements.txt
```

### Step 7: Run Database Migrations

See [Database Migration Process](#database-migration-process) section below.

### Step 8: Collect Static Files

See [Static File Collection](#static-file-collection) section below.

### Step 9: Restart Passenger

See [Passenger Restart Procedure](#passenger-restart-procedure) section below.

### Step 10: Verify Deployment

See [Post-Deployment Verification](#post-deployment-verification) section below.

---

## Frontend Deployment

### Step 1: Build Production Bundle Locally

On your local development machine:

```bash
# Navigate to project root
cd /path/to/project/

# Install dependencies (if needed)
npm install

# Build production bundle
npm run build
```

This creates optimized files in the `dist/` directory.

### Step 2: Verify Build Output

Check that the build completed successfully:

```bash
ls -la dist/
```

You should see:
- `index.html`
- `assets/` directory with minified JS and CSS files
- No source map files (`.map`) in production build

### Step 3: Backup Current Frontend

Connect to server and backup current frontend:

```bash
ssh mwmwheba@tasks.mwheba.com
cd /home/mwmwheba/tasks.mwheba.com/
tar -czf backup_frontend_$(date +%Y%m%d_%H%M%S).tar.gz index.html assets/
```

### Step 4: Upload New Build

Upload the contents of `dist/` to `/home/mwmwheba/tasks.mwheba.com/`:

**Option A: Using SCP**

```bash
# From your local machine
scp -r dist/* mwmwheba@tasks.mwheba.com:/home/mwmwheba/tasks.mwheba.com/
```

**Option B: Using FTP Client**

1. Connect to server via FTP
2. Navigate to `/home/mwmwheba/tasks.mwheba.com/`
3. Upload all files from `dist/` directory
4. Overwrite existing files when prompted

**Option C: Using cPanel File Manager**

1. Log in to cPanel
2. Open File Manager
3. Navigate to `tasks.mwheba.com/`
4. Upload files from `dist/` directory
5. Extract if uploaded as zip

### Step 5: Verify .htaccess Files

Ensure `.htaccess` files are in place and not overwritten:

```bash
# Root .htaccess for frontend routing
ls -la /home/mwmwheba/tasks.mwheba.com/.htaccess

# API .htaccess for Passenger
ls -la /home/mwmwheba/tasks.mwheba.com/api/.htaccess
```

If missing, restore from backup or repository.

### Step 6: Set File Permissions

```bash
cd /home/mwmwheba/tasks.mwheba.com/
chmod 644 index.html
chmod 755 assets/
chmod 644 assets/*
```

### Step 7: Clear Browser Cache

After deployment, users may need to clear browser cache or hard refresh (Ctrl+F5) to see changes.

---

## Database Migration Process

### Overview

Database migrations update the database schema to match your Django models. Always test migrations locally before running in production.

### Step 1: Check for Pending Migrations

```bash
cd /home/mwmwheba/mwheba_tasks/backend/
source venv/bin/activate
python manage.py showmigrations
```

Look for `[ ]` (unchecked) migrations that need to be applied.

### Step 2: Backup Database

**Critical**: Always backup before running migrations.

```bash
# Using the backup script
cd /home/mwmwheba/mwheba_tasks/backend/
./scripts/backup_database.sh
```

Or manually:

```bash
mysqldump -u mwmwheba_tasks -p mwmwheba_tasks > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 3: Test Migration (Dry Run)

Check what the migration will do without applying it:

```bash
python manage.py migrate --plan
```

Review the output to understand what changes will be made.

### Step 4: Run Migrations

Apply the migrations:

```bash
python manage.py migrate
```

**Expected output:**
```
Running migrations:
  Applying app_name.0001_initial... OK
  Applying app_name.0002_add_field... OK
```

### Step 5: Verify Migration Success

Check that all migrations are applied:

```bash
python manage.py showmigrations
```

All migrations should show `[X]` (checked).

### Step 6: Test Application

Verify the application works correctly after migration:

```bash
# Test database connectivity
python manage.py check --database default

# Test a simple query
python manage.py shell
>>> from users.models import User
>>> User.objects.count()
>>> exit()
```

### Migration Troubleshooting

**If migration fails:**

1. **Don't panic** - database is backed up
2. Check error message carefully
3. Check migration file for issues
4. Restore from backup if needed:
   ```bash
   mysql -u mwmwheba_tasks -p mwmwheba_tasks < backup_YYYYMMDD_HHMMSS.sql
   ```
5. Fix the issue and try again

**Common migration issues:**

- **Constraint violations**: Data doesn't meet new constraints
- **Missing dependencies**: Migration depends on another migration
- **Conflicting migrations**: Multiple migrations modify same field

---

## Static File Collection

### Overview

Django's `collectstatic` command gathers all static files (CSS, JS, images) from all apps into a single directory for serving.

### When to Run Collectstatic

Run `collectstatic` when:
- Deploying for the first time
- Updating Django admin styles
- Adding new static files to any app
- Updating CSS/JS in Django apps
- After updating Django version

**Note**: Frontend (React) static files are handled separately through the build process.

### Step 1: Navigate to Backend Directory

```bash
cd /home/mwmwheba/mwheba_tasks/backend/
source venv/bin/activate
```

### Step 2: Run Collectstatic

```bash
python manage.py collectstatic --noinput
```

The `--noinput` flag skips the confirmation prompt.

**Expected output:**
```
120 static files copied to '/home/mwmwheba/mwheba_tasks/backend/staticfiles'.
```

### Step 3: Verify Static Files

Check that files were collected:

```bash
ls -la staticfiles/
```

You should see directories like:
- `admin/` - Django admin static files
- `rest_framework/` - DRF browsable API files
- Other app static files

### Step 4: Set Permissions

```bash
chmod -R 755 staticfiles/
find staticfiles/ -type f -exec chmod 644 {} \;
```

### Step 5: Test Static File Access

Test that static files are accessible:

```bash
curl -I https://tasks.mwheba.com/static/admin/css/base.css
```

Should return `200 OK`.

### Collectstatic Troubleshooting

**Issue: "Destination already exists"**

Solution: Use `--clear` flag to remove old files first:
```bash
python manage.py collectstatic --clear --noinput
```

**Issue: Permission denied**

Solution: Check directory permissions:
```bash
chmod 755 staticfiles/
```

**Issue: Files not updating**

Solution: Clear and recollect:
```bash
rm -rf staticfiles/*
python manage.py collectstatic --noinput
```

---

## Passenger Restart Procedure

### Overview

Passenger is the application server running your Django backend. After code changes, you must restart Passenger to load the new code.

### Method 1: Touch restart.txt (Recommended)

This is the standard Passenger restart method:

```bash
cd /home/mwmwheba/mwheba_tasks/backend/
touch tmp/restart.txt
```

Passenger detects the file modification and restarts the application automatically.

### Method 2: Using Restart Script

Use the provided restart script:

```bash
cd /home/mwmwheba/mwheba_tasks/backend/
./scripts/restart_passenger.sh
```

### Method 3: Via cPanel

1. Log in to cPanel
2. Navigate to **Setup Python App** (or **Application Manager**)
3. Find your application
4. Click **Restart**

### Verification

After restart, verify the application is running:

```bash
curl -I https://tasks.mwheba.com/api/
```

Should return `200 OK` or `301 Redirect`.

### Restart Troubleshooting

**Issue: Application not restarting**

Solutions:
1. Check `tmp/` directory exists:
   ```bash
   mkdir -p tmp/
   ```

2. Try deleting and recreating restart.txt:
   ```bash
   rm tmp/restart.txt
   touch tmp/restart.txt
   ```

3. Check Passenger error logs in cPanel

**Issue: Application crashes after restart**

Solutions:
1. Check error logs:
   ```bash
   tail -f logs/errors.log
   ```

2. Check Passenger logs in cPanel

3. Verify environment variables are set correctly

4. Check Python path and virtual environment

**Issue: Changes not reflecting**

Solutions:
1. Clear Python bytecode cache:
   ```bash
   find . -type d -name __pycache__ -exec rm -rf {} +
   find . -name "*.pyc" -delete
   ```

2. Restart Passenger again

3. Check that correct code was deployed

---

## Post-Deployment Verification

After deployment, verify everything is working correctly.

### Automated Verification

Run the production validation script:

```bash
cd /home/mwmwheba/mwheba_tasks/backend/
source venv/bin/activate
python scripts/validate_production.py
```

This checks:
- DEBUG is False
- SECRET_KEY is secure
- ALLOWED_HOSTS configured
- Database connectivity
- Environment variables

### Manual Verification Checklist

#### Backend API

- [ ] API root accessible:
  ```bash
  curl https://tasks.mwheba.com/api/
  ```

- [ ] Authentication endpoint working:
  ```bash
  curl -X POST https://tasks.mwheba.com/api/auth/login/ \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
  ```

- [ ] Security headers present:
  ```bash
  curl -I https://tasks.mwheba.com/api/ | grep -E "X-Content-Type-Options|X-Frame-Options"
  ```

#### Frontend

- [ ] Homepage loads: Visit `https://tasks.mwheba.com/`
- [ ] Login page accessible
- [ ] Static assets loading (check browser console for errors)
- [ ] No console errors in browser developer tools

#### Database

- [ ] Migrations applied:
  ```bash
  python manage.py showmigrations | grep "\[ \]"
  ```
  Should return nothing (all migrations checked)

- [ ] Database queries working:
  ```bash
  python manage.py shell -c "from users.models import User; print(User.objects.count())"
  ```

#### File Uploads

- [ ] Test file upload through UI
- [ ] Verify file saved to media directory
- [ ] Verify file accessible via URL

#### Logging

- [ ] Check error log exists and is writable:
  ```bash
  ls -la logs/errors.log
  ```

- [ ] Check recent log entries:
  ```bash
  tail -20 logs/errors.log
  ```

### Performance Check

- [ ] Page load time acceptable (< 3 seconds)
- [ ] API response time acceptable (< 500ms)
- [ ] No memory leaks or high CPU usage

### Security Check

- [ ] `.env` file not accessible:
  ```bash
  curl https://tasks.mwheba.com/.env
  ```
  Should return `403 Forbidden`

- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] CORS working correctly (only allowed origins)

---

## Rollback Procedure

If deployment fails or causes issues, follow this rollback procedure.

### When to Rollback

Rollback if:
- Application crashes and won't start
- Critical functionality broken
- Data corruption detected
- Security vulnerability introduced
- Performance severely degraded

### Quick Rollback Steps

#### 1. Restore Backend Code

```bash
cd /home/mwmwheba/mwheba_tasks/

# List available backups
ls -lt backup_backend_*.tar.gz | head -5

# Restore from backup (replace with actual backup filename)
tar -xzf backup_backend_YYYYMMDD_HHMMSS.tar.gz

# Restart Passenger
cd backend/
touch tmp/restart.txt
```

#### 2. Restore Frontend Code

```bash
cd /home/mwmwheba/tasks.mwheba.com/

# List available backups
ls -lt backup_frontend_*.tar.gz | head -5

# Restore from backup
tar -xzf backup_frontend_YYYYMMDD_HHMMSS.tar.gz
```

#### 3. Rollback Database (If Needed)

**Warning**: Only rollback database if migrations caused issues.

```bash
cd /home/mwmwheba/mwheba_tasks/backend/

# List available database backups
ls -lt backup_*.sql | head -5

# Restore database (replace with actual backup filename)
mysql -u mwmwheba_tasks -p mwmwheba_tasks < backup_YYYYMMDD_HHMMSS.sql
```

#### 4. Verify Rollback

- [ ] Application starts successfully
- [ ] API endpoints responding
- [ ] Frontend loads correctly
- [ ] Database queries working
- [ ] No errors in logs

### Rollback Database Migrations

If you need to rollback specific migrations without full database restore:

```bash
cd /home/mwmwheba/mwheba_tasks/backend/
source venv/bin/activate

# Rollback to specific migration
python manage.py migrate app_name migration_name

# Example: Rollback to migration 0003
python manage.py migrate tasks 0003
```

### Post-Rollback Actions

After rollback:

1. **Investigate the issue**
   - Check error logs
   - Review what changed
   - Identify root cause

2. **Fix the problem**
   - Fix code issues
   - Test thoroughly locally
   - Test in staging if available

3. **Document the incident**
   - What went wrong
   - Why it happened
   - How it was fixed
   - How to prevent in future

4. **Plan redeployment**
   - Fix issues
   - Test more thoroughly
   - Deploy during low-traffic period

---

## Troubleshooting

### Deployment Issues

#### Issue: Git Pull Fails

**Symptoms:**
- "Permission denied" error
- "Authentication failed" error

**Solutions:**
1. Check SSH key is configured:
   ```bash
   ssh -T git@github.com
   ```

2. Use HTTPS instead of SSH:
   ```bash
   git remote set-url origin https://github.com/username/repo.git
   ```

3. Pull with credentials:
   ```bash
   git pull https://username:token@github.com/username/repo.git
   ```

#### Issue: Pip Install Fails

**Symptoms:**
- "Could not find a version that satisfies the requirement"
- "Permission denied" when installing packages

**Solutions:**
1. Upgrade pip:
   ```bash
   pip install --upgrade pip
   ```

2. Check virtual environment is activated:
   ```bash
   which python
   # Should show path in venv/
   ```

3. Install with --user flag if needed:
   ```bash
   pip install --user -r requirements.txt
   ```

4. Check disk space:
   ```bash
   df -h
   ```

#### Issue: Collectstatic Fails

**Symptoms:**
- "Permission denied" error
- "No such file or directory" error

**Solutions:**
1. Create staticfiles directory:
   ```bash
   mkdir -p staticfiles/
   ```

2. Fix permissions:
   ```bash
   chmod 755 staticfiles/
   ```

3. Check STATIC_ROOT setting in settings.py

4. Run with --clear flag:
   ```bash
   python manage.py collectstatic --clear --noinput
   ```

### Runtime Issues

#### Issue: 500 Internal Server Error

**Symptoms:**
- All pages return 500 error
- Generic error page shown

**Solutions:**
1. Check error logs:
   ```bash
   tail -50 logs/errors.log
   ```

2. Check Passenger logs in cPanel

3. Verify environment variables:
   ```bash
   python manage.py shell -c "import os; print(os.environ.get('DEBUG'))"
   ```

4. Check database connectivity:
   ```bash
   python manage.py check --database default
   ```

5. Restart Passenger:
   ```bash
   touch tmp/restart.txt
   ```

#### Issue: Static Files Not Loading

**Symptoms:**
- CSS/JS files return 404
- Admin panel has no styling
- Frontend looks broken

**Solutions:**
1. Run collectstatic:
   ```bash
   python manage.py collectstatic --noinput
   ```

2. Check STATIC_URL and STATIC_ROOT settings

3. Verify .htaccess allows static file access

4. Check file permissions:
   ```bash
   chmod -R 755 staticfiles/
   ```

5. Clear browser cache (Ctrl+F5)

#### Issue: Database Connection Errors

**Symptoms:**
- "Can't connect to MySQL server"
- "Access denied for user"
- "Unknown database"

**Solutions:**
1. Verify database credentials in `.env`:
   ```bash
   cat .env | grep DB_
   ```

2. Test database connection:
   ```bash
   mysql -u mwmwheba_tasks -p -h localhost mwmwheba_tasks
   ```

3. Check database exists in cPanel

4. Verify user has privileges:
   ```sql
   SHOW GRANTS FOR 'mwmwheba_tasks'@'localhost';
   ```

5. Restart MySQL (via cPanel if needed)

#### Issue: CORS Errors

**Symptoms:**
- "CORS policy: No 'Access-Control-Allow-Origin' header"
- API requests fail from frontend
- Browser console shows CORS errors

**Solutions:**
1. Check CORS_ALLOWED_ORIGINS in `.env`:
   ```bash
   cat .env | grep CORS
   ```

2. Verify origin matches exactly (no trailing slash)

3. Ensure HTTPS is used (not HTTP)

4. Check origin in browser request:
   - Open browser developer tools
   - Network tab
   - Check request headers

5. Restart Passenger:
   ```bash
   touch tmp/restart.txt
   ```

#### Issue: File Uploads Fail

**Symptoms:**
- File upload returns error
- Files not saved
- "Permission denied" error

**Solutions:**
1. Check media directory exists:
   ```bash
   mkdir -p media/attachments/
   ```

2. Fix permissions:
   ```bash
   chmod -R 755 media/
   ```

3. Check disk space:
   ```bash
   df -h
   ```

4. Verify MEDIA_ROOT setting

5. Check file size limits in settings

### Performance Issues

#### Issue: Slow Response Times

**Symptoms:**
- Pages load slowly
- API requests timeout
- High server load

**Solutions:**
1. Check database query performance:
   ```bash
   python manage.py shell
   >>> from django.db import connection
   >>> from django.db import reset_queries
   >>> # Run your queries
   >>> print(len(connection.queries))
   >>> print(connection.queries)
   ```

2. Enable database connection pooling (already configured)

3. Check for N+1 query problems

4. Monitor server resources:
   ```bash
   top
   ```

5. Check log file sizes:
   ```bash
   du -sh logs/
   ```

6. Rotate logs if needed:
   ```bash
   ./scripts/rotate_logs.sh
   ```

#### Issue: High Memory Usage

**Symptoms:**
- Server running out of memory
- Application crashes randomly
- Slow performance

**Solutions:**
1. Check memory usage:
   ```bash
   free -h
   ```

2. Check Passenger processes:
   ```bash
   ps aux | grep passenger
   ```

3. Reduce Passenger worker processes (if configured)

4. Check for memory leaks in code

5. Restart Passenger:
   ```bash
   touch tmp/restart.txt
   ```

---

## Deployment Scripts Reference

### Backend Deployment Script

Location: `backend/scripts/deploy_backend.sh`

Usage:
```bash
cd /home/mwmwheba/mwheba_tasks/backend/
./scripts/deploy_backend.sh
```

This script automates:
- Git pull
- Dependency installation
- Database migrations
- Static file collection
- Passenger restart

### Frontend Deployment Script

Location: `backend/scripts/deploy_frontend.sh`

Usage:
```bash
# Run locally to build and upload
./backend/scripts/deploy_frontend.sh
```

This script automates:
- Production build
- File upload to server
- Permission setting

### Passenger Restart Script

Location: `backend/scripts/restart_passenger.sh`

Usage:
```bash
cd /home/mwmwheba/mwheba_tasks/backend/
./scripts/restart_passenger.sh
```

### Database Backup Script

Location: `backend/scripts/backup_database.sh`

Usage:
```bash
cd /home/mwmwheba/mwheba_tasks/backend/
./scripts/backup_database.sh
```

### Database Restore Script

Location: `backend/scripts/restore_database.sh`

Usage:
```bash
cd /home/mwmwheba/mwheba_tasks/backend/
./scripts/restore_database.sh backup_YYYYMMDD_HHMMSS.sql
```

---

## Best Practices

### Deployment Timing

- Deploy during low-traffic periods (late night/early morning)
- Avoid deploying on Fridays or before holidays
- Schedule maintenance windows for major updates
- Notify users in advance of planned downtime

### Testing

- Always test locally before deploying
- Use staging environment if available
- Run automated tests before deployment
- Perform manual smoke tests after deployment

### Backups

- Always backup before deployment
- Keep multiple backup versions
- Test restore procedures regularly
- Store backups in multiple locations

### Documentation

- Document all changes in changelog
- Update deployment documentation as needed
- Keep runbook for common issues
- Document any manual steps required

### Monitoring

- Monitor logs after deployment
- Watch for error spikes
- Monitor performance metrics
- Set up alerts for critical issues

### Communication

- Notify team before deployment
- Communicate any issues immediately
- Document lessons learned
- Share knowledge with team

---

## Quick Reference

### Essential Commands

```bash
# Navigate to backend
cd /home/mwmwheba/mwheba_tasks/backend/

# Activate virtual environment
source venv/bin/activate

# Pull latest code
git pull origin main

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Restart Passenger
touch tmp/restart.txt

# Check logs
tail -f logs/errors.log

# Validate production config
python scripts/validate_production.py
```

### Emergency Contacts

- **Hosting Support**: cPanel support portal
- **Database Issues**: Check cPanel MySQL section
- **DNS Issues**: Check domain registrar

---

## Additional Resources

- [Production Environment Setup Guide](./PRODUCTION_ENVIRONMENT_SETUP.md)
- [Django Deployment Documentation](https://docs.djangoproject.com/en/4.2/howto/deployment/)
- [Passenger Documentation](https://www.phusionpassenger.com/docs/)
- [cPanel Documentation](https://docs.cpanel.net/)

---

**Last Updated:** 2024
**Version:** 1.0
