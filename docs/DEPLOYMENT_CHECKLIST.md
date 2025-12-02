# Deployment Checklist

Quick reference checklist for deploying updates to the Task Management System on cPanel. For detailed instructions, see [DEPLOYMENT_CPANEL.md](./DEPLOYMENT_CPANEL.md).

---

## Pre-Deployment Checks

### Code & Testing
- [ ] All changes committed to version control
- [ ] Code reviewed and approved
- [ ] All tests passing locally
- [ ] Dependencies updated in `requirements.txt` and `package.json`
- [ ] Database migrations created and tested locally
- [ ] New environment variables documented (if any)

### Production Validation
- [ ] Run production validation script:
  ```bash
  python backend/scripts/validate_production.py
  ```
- [ ] Run Django deployment check:
  ```bash
  python manage.py check --deploy
  ```
- [ ] Verify `.env` file has all required variables
- [ ] Confirm `DEBUG=False` in production `.env`
- [ ] Verify `SECRET_KEY` is strong and unique
- [ ] Verify `ALLOWED_HOSTS` includes production domain
- [ ] Verify `CORS_ALLOWED_ORIGINS` only includes production URLs

### Backups
- [ ] Backup production database:
  ```bash
  cd /home/mwmwheba/mwheba_tasks/backend/
  ./scripts/backup_database.sh
  ```
- [ ] Backup backend code:
  ```bash
  cd /home/mwmwheba/mwheba_tasks/
  tar -czf backup_backend_$(date +%Y%m%d_%H%M%S).tar.gz backend/
  ```
- [ ] Backup frontend code:
  ```bash
  cd /home/mwmwheba/tasks.mwheba.com/
  tar -czf backup_frontend_$(date +%Y%m%d_%H%M%S).tar.gz index.html assets/
  ```

### Communication
- [ ] Notify users of maintenance window (if applicable)
- [ ] Schedule deployment during low-traffic period
- [ ] Have rollback plan ready

---

## Deployment Steps

### Backend Deployment

1. **Connect to Server**
   ```bash
   ssh mwmwheba@tasks.mwheba.com
   ```

2. **Navigate to Backend Directory**
   ```bash
   cd /home/mwmwheba/mwheba_tasks/backend/
   ```

3. **Activate Virtual Environment**
   ```bash
   source venv/bin/activate
   ```

4. **Pull Latest Code**
   ```bash
   git pull origin main
   ```
   Or upload files via FTP/cPanel if not using Git

5. **Update Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

6. **Run Database Migrations**
   ```bash
   # Check pending migrations
   python manage.py showmigrations
   
   # View migration plan
   python manage.py migrate --plan
   
   # Apply migrations
   python manage.py migrate
   
   # Verify all applied
   python manage.py showmigrations
   ```

7. **Collect Static Files**
   ```bash
   python manage.py collectstatic --noinput
   ```

8. **Restart Passenger**
   ```bash
   touch tmp/restart.txt
   ```
   Or use:
   ```bash
   ./scripts/restart_passenger.sh
   ```

### Frontend Deployment

1. **Build Production Bundle (Local Machine)**
   ```bash
   npm install
   npm run build
   ```

2. **Verify Build Output**
   ```bash
   ls -la dist/
   ```
   - Check for `index.html`
   - Check for `assets/` directory
   - Verify no `.map` files in production

3. **Upload to Server**
   
   **Option A - SCP:**
   ```bash
   scp -r dist/* mwmwheba@tasks.mwheba.com:/home/mwmwheba/tasks.mwheba.com/
   ```
   
   **Option B - FTP/cPanel:**
   - Upload `dist/` contents to `/home/mwmwheba/tasks.mwheba.com/`

4. **Verify .htaccess Files**
   ```bash
   ls -la /home/mwmwheba/tasks.mwheba.com/.htaccess
   ls -la /home/mwmwheba/tasks.mwheba.com/api/.htaccess
   ```

5. **Set File Permissions**
   ```bash
   cd /home/mwmwheba/tasks.mwheba.com/
   chmod 644 index.html
   chmod 755 assets/
   chmod 644 assets/*
   ```

---

## Post-Deployment Verification

### Automated Checks
- [ ] Run production validation script:
  ```bash
  cd /home/mwmwheba/mwheba_tasks/backend/
  source venv/bin/activate
  python scripts/validate_production.py
  ```

### Backend API Verification
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

### Frontend Verification
- [ ] Homepage loads: `https://tasks.mwheba.com/`
- [ ] Login page accessible
- [ ] Static assets loading (check browser console)
- [ ] No console errors in browser developer tools
- [ ] Test user login flow
- [ ] Test main application features

### Database Verification
- [ ] All migrations applied:
  ```bash
  python manage.py showmigrations | grep "\[ \]"
  ```
  Should return nothing (all checked)
- [ ] Database queries working:
  ```bash
  python manage.py shell -c "from users.models import User; print(User.objects.count())"
  ```

### File Upload Verification
- [ ] Test file upload through UI
- [ ] Verify file saved to media directory
- [ ] Verify file accessible via URL

### Logging Verification
- [ ] Error log exists and is writable:
  ```bash
  ls -la logs/errors.log
  ```
- [ ] Check recent log entries:
  ```bash
  tail -20 logs/errors.log
  ```
- [ ] No critical errors in logs

### Security Verification
- [ ] `.env` file not accessible:
  ```bash
  curl https://tasks.mwheba.com/.env
  ```
  Should return `403 Forbidden`
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] CORS working correctly (only allowed origins)
- [ ] Security headers present on all responses

### Performance Check
- [ ] Page load time acceptable (< 3 seconds)
- [ ] API response time acceptable (< 500ms)
- [ ] No memory leaks or high CPU usage

---

## Rollback Procedure

### When to Rollback
Rollback immediately if:
- Application crashes and won't start
- Critical functionality broken
- Data corruption detected
- Security vulnerability introduced
- Performance severely degraded

### Quick Rollback Steps

1. **Restore Backend Code**
   ```bash
   cd /home/mwmwheba/mwheba_tasks/
   
   # List backups
   ls -lt backup_backend_*.tar.gz | head -5
   
   # Restore (replace with actual filename)
   tar -xzf backup_backend_YYYYMMDD_HHMMSS.tar.gz
   
   # Restart
   cd backend/
   touch tmp/restart.txt
   ```

2. **Restore Frontend Code**
   ```bash
   cd /home/mwmwheba/tasks.mwheba.com/
   
   # List backups
   ls -lt backup_frontend_*.tar.gz | head -5
   
   # Restore
   tar -xzf backup_frontend_YYYYMMDD_HHMMSS.tar.gz
   ```

3. **Restore Database (If Needed)**
   ```bash
   cd /home/mwmwheba/mwheba_tasks/backend/
   
   # List backups
   ls -lt backup_*.sql | head -5
   
   # Restore
   mysql -u mwmwheba_tasks -p mwmwheba_tasks < backup_YYYYMMDD_HHMMSS.sql
   ```

4. **Verify Rollback**
   - [ ] Application starts successfully
   - [ ] API endpoints responding
   - [ ] Frontend loads correctly
   - [ ] Database queries working
   - [ ] No errors in logs

### Rollback Specific Migrations
If only migrations need rollback:
```bash
cd /home/mwmwheba/mwheba_tasks/backend/
source venv/bin/activate

# Rollback to specific migration
python manage.py migrate app_name migration_name

# Example: Rollback tasks app to migration 0003
python manage.py migrate tasks 0003
```

---

## Post-Rollback Actions

After successful rollback:

1. **Investigate the Issue**
   - [ ] Check error logs
   - [ ] Review what changed
   - [ ] Identify root cause
   - [ ] Document findings

2. **Fix the Problem**
   - [ ] Fix code issues
   - [ ] Test thoroughly locally
   - [ ] Test in staging if available
   - [ ] Review with team

3. **Document the Incident**
   - [ ] What went wrong
   - [ ] Why it happened
   - [ ] How it was fixed
   - [ ] Prevention measures

4. **Plan Redeployment**
   - [ ] Address all issues
   - [ ] Add additional tests
   - [ ] Schedule new deployment
   - [ ] Communicate with stakeholders

---

## Common Issues & Quick Fixes

### Issue: 500 Internal Server Error
```bash
# Check error logs
tail -50 logs/errors.log

# Restart Passenger
touch tmp/restart.txt

# Check database connectivity
python manage.py check --database default
```

### Issue: Static Files Not Loading
```bash
# Recollect static files
python manage.py collectstatic --clear --noinput

# Fix permissions
chmod -R 755 staticfiles/

# Clear browser cache (Ctrl+F5)
```

### Issue: Database Connection Errors
```bash
# Verify credentials
cat .env | grep DB_

# Test connection
mysql -u mwmwheba_tasks -p -h localhost mwmwheba_tasks
```

### Issue: CORS Errors
```bash
# Check CORS settings
cat .env | grep CORS

# Restart Passenger
touch tmp/restart.txt
```

### Issue: Passenger Won't Restart
```bash
# Delete and recreate restart.txt
rm tmp/restart.txt
touch tmp/restart.txt

# Or use cPanel to restart
```

---

## Emergency Contacts

- **Hosting Support**: cPanel support portal
- **Database Issues**: Check cPanel MySQL section
- **DNS Issues**: Check domain registrar
- **Team Lead**: [Contact information]

---

## Quick Command Reference

```bash
# Navigate to backend
cd /home/mwmwheba/mwheba_tasks/backend/

# Activate venv
source venv/bin/activate

# Pull code
git pull origin main

# Install deps
pip install -r requirements.txt

# Migrate
python manage.py migrate

# Collectstatic
python manage.py collectstatic --noinput

# Restart
touch tmp/restart.txt

# Check logs
tail -f logs/errors.log

# Validate
python scripts/validate_production.py
```

---

## Additional Resources

- [Detailed Deployment Guide](./DEPLOYMENT_CPANEL.md)
- [Production Environment Setup](./PRODUCTION_ENVIRONMENT_SETUP.md)
- [Django Deployment Docs](https://docs.djangoproject.com/en/4.2/howto/deployment/)
- [Passenger Documentation](https://www.phusionpassenger.com/docs/)

---

**Last Updated:** 2024  
**Version:** 1.0  
**Requirement:** 9.1
