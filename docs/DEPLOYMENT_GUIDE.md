# دليل النشر - Deployment Guide

## نظرة عامة

دليل مبسط لنشر التحديثات على نظام إدارة المهام في بيئة cPanel.

---

## ✅ قبل النشر

### 1. التحقق من الكود
- [ ] كل التغييرات في version control
- [ ] الاختبارات تعمل محلياً
- [ ] تحديث `requirements.txt` و `package.json`
- [ ] إنشاء migrations واختبارها

### 2. النسخ الاحتياطي
```bash
# Database backup
cd /home/mwmwheba/mwheba_tasks/backend/
./scripts/backup_database.sh

# Code backup
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz backend/
```

### 3. التحقق من الإعدادات
```bash
# Run validation
python backend/scripts/validate_production.py

# Django deployment check
python manage.py check --deploy
```

---

## 🚀 نشر Backend

### الخطوات السريعة

```bash
# 1. الاتصال بالسيرفر
ssh mwmwheba@tasks.mwheba.com

# 2. الانتقال للمجلد
cd /home/mwmwheba/mwheba_tasks/backend/

# 3. تفعيل البيئة الافتراضية
source venv/bin/activate

# 4. سحب آخر تحديثات
git pull origin main

# 5. تحديث المكتبات
pip install -r requirements.txt

# 6. تشغيل migrations
python manage.py migrate

# 7. جمع الملفات الثابتة
python manage.py collectstatic --noinput

# 8. إعادة تشغيل Passenger
touch tmp/restart.txt
```

### التحقق من النشر

```bash
# فحص API
curl https://tasks.mwheba.com/api/

# فحص السجلات
tail -f logs/errors.log

# التحقق من migrations
python manage.py showmigrations
```

---

## 🎨 نشر Frontend

### 1. بناء المشروع (محلياً)

```bash
# تثبيت المكتبات
npm install

# بناء للإنتاج
npm run build

# التحقق من المخرجات
ls -la dist/
```

### 2. رفع الملفات

**باستخدام SCP:**
```bash
scp -r dist/* mwmwheba@tasks.mwheba.com:/home/mwmwheba/tasks.mwheba.com/
```

**أو باستخدام FTP/cPanel:**
- ارفع محتويات `dist/` إلى `/home/mwmwheba/tasks.mwheba.com/`

### 3. ضبط الصلاحيات

```bash
cd /home/mwmwheba/tasks.mwheba.com/
chmod 644 index.html
chmod 755 assets/
chmod 644 assets/*
```

---

## 🗄️ Database Migrations

### الخطوات الآمنة

```bash
# 1. نسخ احتياطي
./scripts/backup_database.sh

# 2. معاينة التغييرات
python manage.py migrate --plan

# 3. تطبيق migrations
python manage.py migrate

# 4. التحقق
python manage.py showmigrations
```

### في حالة المشاكل

```bash
# استعادة النسخة الاحتياطية
mysql -u mwmwheba_tasks -p mwmwheba_tasks < backup_YYYYMMDD_HHMMSS.sql

# الرجوع لـ migration معين
python manage.py migrate app_name migration_name
```

---

## 🔄 إعادة تشغيل Passenger

### الطريقة الأساسية

```bash
cd /home/mwmwheba/mwheba_tasks/backend/
touch tmp/restart.txt
```

### طرق بديلة

```bash
# باستخدام السكريبت
./scripts/restart_passenger.sh

# أو عبر cPanel
# Setup Python App → Restart
```

---

## 🔙 التراجع عن النشر (Rollback)

### متى تتراجع؟
- التطبيق لا يعمل
- أخطاء حرجة
- مشاكل في الأداء

### خطوات التراجع

```bash
# 1. استعادة الكود
cd /home/mwmwheba/mwheba_tasks/
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz

# 2. استعادة قاعدة البيانات (إذا لزم)
mysql -u mwmwheba_tasks -p mwmwheba_tasks < backup_YYYYMMDD_HHMMSS.sql

# 3. إعادة التشغيل
cd backend/
touch tmp/restart.txt
```

---

## 🔍 استكشاف الأخطاء

### خطأ 500 Internal Server Error

```bash
# فحص السجلات
tail -50 logs/errors.log

# إعادة التشغيل
touch tmp/restart.txt

# فحص قاعدة البيانات
python manage.py check --database default
```

### الملفات الثابتة لا تعمل

```bash
# إعادة جمع الملفات
python manage.py collectstatic --clear --noinput

# ضبط الصلاحيات
chmod -R 755 staticfiles/
```

### أخطاء CORS

```bash
# فحص الإعدادات
cat .env | grep CORS

# إعادة التشغيل
touch tmp/restart.txt
```

### مشاكل قاعدة البيانات

```bash
# فحص الاتصال
cat .env | grep DB_

# اختبار الاتصال
mysql -u mwmwheba_tasks -p -h localhost mwmwheba_tasks
```

---

## 📋 قائمة التحقق النهائية

بعد النشر، تأكد من:

### Backend
- [ ] API يعمل: `curl https://tasks.mwheba.com/api/`
- [ ] لا أخطاء في السجلات: `tail logs/errors.log`
- [ ] Migrations مطبقة: `python manage.py showmigrations`
- [ ] الملفات الثابتة تعمل

### Frontend
- [ ] الصفحة الرئيسية تفتح
- [ ] تسجيل الدخول يعمل
- [ ] لا أخطاء في console المتصفح
- [ ] الملفات الثابتة تحمل

### الأمان
- [ ] `.env` محمي: `curl https://tasks.mwheba.com/.env` → 403
- [ ] HTTPS يعمل
- [ ] CORS مضبوط

---

## 🛠️ أوامر سريعة

```bash
# الانتقال للـ backend
cd /home/mwmwheba/mwheba_tasks/backend/

# تفعيل البيئة
source venv/bin/activate

# سحب التحديثات
git pull origin main

# تحديث المكتبات
pip install -r requirements.txt

# Migrations
python manage.py migrate

# جمع الملفات
python manage.py collectstatic --noinput

# إعادة التشغيل
touch tmp/restart.txt

# فحص السجلات
tail -f logs/errors.log
```

---

## 📚 مراجع إضافية

- **Backend README**: `backend/README.md` - دليل شامل
- **Django Docs**: https://docs.djangoproject.com/en/4.2/howto/deployment/
- **Passenger Docs**: https://www.phusionpassenger.com/docs/

---

## 📞 الدعم

في حالة المشاكل:
1. فحص `logs/errors.log`
2. فحص Passenger logs في cPanel
3. تشغيل `python scripts/validate_production.py`
4. مراجعة `python manage.py check --deploy`

---

**آخر تحديث:** ديسمبر 2024  
**الإصدار:** 3.0.0
