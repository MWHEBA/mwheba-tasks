# File Upload Migration - من Base64 لـ File Upload

## التغييرات اللي اتعملت

### Backend (Django)

1. **Settings** - إضافة media files configuration:
   - `MEDIA_URL = '/media/'`
   - `MEDIA_ROOT = BASE_DIR / 'media'`
   - إضافة `MultiPartParser` و `FormParser` للـ REST_FRAMEWORK

2. **URLs** - إضافة media serving في development:
   - `urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)`

3. **Model** - تغيير `Attachment.data_url` لـ `Attachment.file`:
   - من: `data_url = models.TextField()`
   - لـ: `file = models.FileField(upload_to='attachments/%Y/%m/%d/')`

4. **Serializer** - إضافة `url` field:
   - بيرجع الـ full URL للملف

5. **View** - تعديل `add_attachment` endpoint:
   - بيستقبل `multipart/form-data` بدل JSON
   - بيحفظ الملف على الـ server

6. **Migration** - عملنا migration عشان نغير الـ database schema

### Frontend (React)

1. **Types** - تغيير `Attachment` interface:
   - من: `dataUrl: string`
   - لـ: `url: string`

2. **TaskService** - تعديل `addAttachment`:
   - بيبعت `FormData` بدل JSON
   - بيرفع الـ file مباشرة

3. **TaskDetail** - تبسيط `handleFileChange`:
   - شيلنا الـ FileReader
   - بنبعت الـ File object مباشرة

4. **AttachmentPreview** - تحديث كل الـ references:
   - من `att.dataUrl` لـ `att.url`

## المميزات

✅ **أداء أفضل**: الملفات بتتخزن على الـ disk مش في الـ database
✅ **حجم أقل**: مفيش base64 encoding (توفير 33% من المساحة)
✅ **سرعة أكبر**: الـ database queries أسرع
✅ **scalability**: ممكن نستخدم CDN أو S3 بسهولة

## Production Deployment

### 1. إنشاء media folder
```bash
mkdir -p backend/media/attachments
chmod 755 backend/media
```

### 2. تحديث passenger_wsgi.py (لو محتاج)
الـ media files هتتخدم من خلال Django في development، لكن في production لازم نتأكد إن الـ web server بيخدمها.

### 3. Backup الملفات القديمة
الـ attachments القديمة (base64) لسه موجودة في الـ database، لكن مش هتشتغل مع الكود الجديد.
لو عايز تحتفظ بيها، لازم تعمل migration script.

## ملاحظات

⚠️ **الملفات القديمة**: الـ attachments اللي اتعملت قبل التحديث مش هتشتغل
⚠️ **Production**: لازم تتأكد إن الـ media folder writable
⚠️ **Backup**: اعمل backup للـ database قبل الـ migration
