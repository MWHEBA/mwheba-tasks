# Django Backend - نظام إدارة المهام

Backend مبني على Django REST Framework لنظام إدارة المهام مع دعم كامل للعملاء والمنتجات.

---

## 🚀 البدء السريع

### التطوير (Development)

```bash
# 1. إنشاء بيئة افتراضية
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 2. تثبيت المكتبات
pip install -r requirements.txt

# 3. تكوين البيئة
cp .env.example .env
# عدّل .env بمعلومات قاعدة البيانات

# 4. تشغيل migrations
python manage.py migrate --fake-initial

# 5. تشغيل الخادم
python manage.py runserver
```

✅ الخادم يعمل على: `http://localhost:8000`

### النشر (Production)

#### الطريقة السريعة - باستخدام السكريبت

```bash
cd /path/to/backend
chmod +x deploy.sh
sudo ./deploy.sh
```

السكريبت سيقوم بكل شيء تلقائياً:
- ✅ تثبيت المتطلبات
- ✅ إعداد قاعدة البيانات
- ✅ تكوين Nginx
- ✅ إعداد Systemd
- ✅ تثبيت SSL (اختياري)

#### الطريقة اليدوية

<details>
<summary>انقر لعرض خطوات النشر اليدوي</summary>

**1. تثبيت المتطلبات**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.10 python3.10-venv python3-pip mysql-server nginx git
```

**2. إعداد قاعدة البيانات**
```bash
sudo mysql
```
```sql
CREATE DATABASE mwheba_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mwheba_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON mwheba_tasks.* TO 'mwheba_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**3. نشر التطبيق**
```bash
sudo mkdir -p /var/www/backend
cd /var/www/backend
# رفع الملفات

sudo -u www-data python3.10 -m venv venv
sudo -u www-data bash -c "source venv/bin/activate && pip install -r requirements.txt"
sudo -u www-data cp .env.example .env
sudo -u www-data nano .env  # عدل الإعدادات
sudo -u www-data bash -c "source venv/bin/activate && python manage.py migrate --fake-initial"
sudo -u www-data bash -c "source venv/bin/activate && python manage.py collectstatic --noinput"
```

**4. تكوين Nginx**
```bash
sudo cp nginx.conf /etc/nginx/sites-available/mwheba_tasks
sudo ln -s /etc/nginx/sites-available/mwheba_tasks /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**5. تكوين Systemd**
```bash
sudo cp backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable backend
sudo systemctl start backend
```

**6. SSL (اختياري)**
```bash
sudo certbot --nginx -d tasks.mwheba.com
```

</details>

---

## 🔧 المتطلبات

- Python 3.10+
- MySQL 8.0+
- pip & virtualenv

---

## ⚙️ تكوين البيئة (.env)

```env
# Development/Production
DEBUG=False  # True للتطوير

# Django Secret Key
SECRET_KEY=your-secret-key-here

# Allowed Hosts
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database
DB_NAME=mwheba_tasks
DB_USER=mwheba_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

---

## 🔐 Django Admin Panel

تم تكوين Django Admin بالكامل لجميع الـ models في النظام:

### الوصول للـ Admin Panel
```
URL: http://localhost:8000/admin/
```

### Models المتاحة في Admin:

#### 1. Users & Authentication
- **Users**: إدارة المستخدمين مع الـ profiles والأدوار
- **Groups**: إدارة المجموعات والصلاحيات

#### 2. Clients
- **Clients**: إدارة العملاء (جدد/حاليين) مع البحث والفلترة

#### 3. Products
- **Products**: إدارة المنتجات (عادي/VIP)

#### 4. Task Statuses
- **Task Statuses**: إدارة حالات المهام مع الترتيب والألوان

#### 5. Tasks
- **Tasks**: إدارة المهام الرئيسية مع:
  - Inline للـ Attachments
  - Inline للـ Comments
  - Inline للـ Activity Logs (read-only)
- **Attachments**: إدارة المرفقات
- **Comments**: إدارة التعليقات والردود
- **Activity Logs**: عرض سجل الأنشطة (read-only)

#### 6. Settings
- **Unified Settings**: الإعدادات الموحدة (singleton) - تحتوي على أرقام الواتساب والإشعارات

#### 7. Notifications
- **Notification Logs**: سجل الإشعارات المرسلة (read-only)

### مميزات Admin Panel:
- ✅ Search & Filter في كل الـ models
- ✅ Inline editing للـ related models
- ✅ Read-only للـ logs والـ metadata
- ✅ Fieldsets منظمة لسهولة الاستخدام
- ✅ Custom display methods للـ previews
- ✅ Optimized queries مع select_related

---

## 🌐 API Endpoints

### Health Check
- `GET /api/health/` - فحص حالة الخادم

### Task Statuses
- `GET /api/statuses/` - قائمة الحالات
- `POST /api/statuses/` - إنشاء حالة
- `PUT /api/statuses/:id/` - تحديث حالة
- `DELETE /api/statuses/:id/` - حذف حالة

### Clients
- `GET /api/clients/` - قائمة العملاء
- `POST /api/clients/` - إنشاء عميل
- `PUT /api/clients/:id/` - تحديث عميل
- `DELETE /api/clients/:id/` - حذف عميل

### Products
- `GET /api/products/` - قائمة المنتجات
- `POST /api/products/` - إنشاء منتج
- `PUT /api/products/:id/` - تحديث منتج
- `DELETE /api/products/:id/` - حذف منتج

### Tasks
- `GET /api/tasks/` - قائمة المهام
- `POST /api/tasks/` - إنشاء مهمة
- `PUT /api/tasks/:id/` - تحديث مهمة
- `DELETE /api/tasks/:id/` - حذف مهمة

#### Custom Actions
- `POST /api/tasks/:id/add_comment/` - إضافة تعليق
- `POST /api/tasks/:id/add_reply/` - إضافة رد
- `POST /api/tasks/:id/add_activity/` - إضافة نشاط
- `GET /api/tasks/:id/progress/` - حساب التقدم
- `GET /api/tasks/overdue/` - المهام المتأخرة
- `GET /api/tasks/urgent/` - المهام العاجلة
- `POST /api/tasks/reorder/` - إعادة الترتيب

---

## 🧪 الاختبارات

```bash
# تشغيل جميع الاختبارات
pytest

# مع تقرير التغطية
pytest --cov=. --cov-report=html

# اختبار محدد
pytest tests/test_models.py
pytest tests/test_api.py::TestClientAPI
```

للمزيد من التفاصيل، راجع [TESTING.md](TESTING.md)

---

## 📁 بنية المشروع

```
backend/
├── manage.py
├── requirements.txt
├── .env.example
├── backend/          # المشروع الرئيسي
├── tasks/            # تطبيق المهام
├── clients/          # تطبيق العملاء
├── products/         # تطبيق المنتجات
├── statuses/         # تطبيق الحالات
├── settings/         # تطبيق الإعدادات
├── monitoring/       # أدوات المراقبة
└── scripts/          # سكريبتات الصيانة
```

---

## 🔍 المراقبة والصيانة

### أدوات المراقبة

```bash
# لوحة المراقبة
python monitoring/dashboard.py

# فحص صحة النظام
python monitoring/health_check.py

# مراقبة السجلات
python monitoring/log_monitor.py
```

### النسخ الاحتياطي

```bash
# نسخ احتياطي
./scripts/backup_database.sh

# استعادة
./scripts/restore_database.sh
```

### الأوامر المفيدة

```bash
# حالة الخدمة
sudo systemctl status backend

# السجلات
sudo journalctl -u backend -f

# إعادة التشغيل
sudo systemctl restart backend

# تحديث التطبيق
cd /var/www/backend
sudo -u www-data git pull
sudo -u www-data bash -c "source venv/bin/activate && pip install -r requirements.txt"
sudo -u www-data bash -c "source venv/bin/activate && python manage.py migrate"
sudo systemctl restart backend
```

---

## 🆘 استكشاف الأخطاء

### الخدمة لا تعمل
```bash
sudo systemctl status backend
sudo journalctl -u backend -n 50
```

### 502 Bad Gateway
```bash
# تحقق من Gunicorn
sudo systemctl status backend
sudo netstat -tlnp | grep 8000
sudo systemctl restart backend
```

### خطأ قاعدة البيانات
```bash
sudo systemctl status mysql
mysql -u mwheba_user -p mwheba_tasks
```

---

## 📚 المكتبات المستخدمة

- Django 4.2.7
- Django REST Framework 3.14.0
- PyMySQL 1.1.0
- django-cors-headers 4.3.0
- python-dotenv 1.0.0
- gunicorn 21.2.0
- pytest 7.4.3
- pytest-django 4.7.0

---

## 📖 وثائق إضافية

- [MAINTENANCE.md](MAINTENANCE.md) - دليل الصيانة الشامل
- [monitoring/README.md](monitoring/README.md) - دليل أدوات المراقبة
- [MONITORING_QUICKSTART.md](MONITORING_QUICKSTART.md) - البدء السريع للمراقبة
- [MONITORING_CHEATSHEET.md](MONITORING_CHEATSHEET.md) - ورقة مرجعية

---

**آخر تحديث**: نوفمبر 2024  
**الإصدار**: 3.0.0
#   m w h e b a - t a s k s 
 
 