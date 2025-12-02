# Smart Notifications System

## Overview
نظام الإشعارات الذكي يرسل الإشعارات للأشخاص المناسبين بناءً على أدوارهم الوظيفية.

## User Roles

### 1. Admin (الإداري)
**المسؤوليات:**
- متابعة المشاريع والفواتير
- التنسيق مع العملاء للتسليم
- المتابعة المالية

**الإشعارات التي يستلمها:**
- ✅ مشروع جديد (NEW_PROJECT)
- ✅ بند جديد (NEW_SUBTASK)
- ✅ تعديل بند (SUBTASK_UPDATE)
- ✅ تحديث الحالة (STATUS_CHANGE) - خاصة:
  - جاهز للتسليم
  - تم التسليم
  - ملغي
  - معلق
- ✅ ملاحظات جديدة (COMMENT_ADDED)
- ✅ مرفقات جديدة (ATTACHMENT_ADDED)

---

### 2. Designer (مصمم الجرافيك)
**المسؤوليات:**
- التصميم والتعديلات
- الرد على ملاحظات العملاء

**الإشعارات التي يستلمها:**
- ✅ مشروع جديد (NEW_PROJECT)
- ✅ بند جديد (NEW_SUBTASK)
- ✅ تحديث الحالة (STATUS_CHANGE) - فقط:
  - يوجد ملاحظات (Has Comments)
  - في انتظار المواد (Awaiting Materials)
  - معلق (On Hold)
  - ملغي (Cancelled)
- ✅ ملاحظة جديدة (COMMENT_ADDED)
- ✅ رد جديد (REPLY_ADDED)
- ✅ تم حل الملاحظة (COMMENT_RESOLVED)
- ✅ مرفقات جديدة (ATTACHMENT_ADDED)

**ملاحظة:** المصمم لا يستلم إشعارات عن الإجراءات التي يقوم بها هو نفسه.

---

### 3. Print Manager (منسق المطبوعات)
**المسؤوليات:**
- المونتاج والطباعة
- متابعة المواصفات (المقاس ونوع الطباعة)

**الإشعارات التي يستلمها:**
- ✅ تحديث الحالة (STATUS_CHANGE) - فقط:
  - تم التصميم (Design Completed)
  - جاهز للمونتاج (Ready for Montage)
  - جاري المونتاج (In Montage)
  - تم المونتاج (Montage Completed)
  - جاري الطباعة (In Printing)
  - جاهز للتسليم (Ready for Delivery)
- ✅ تعديل بند (SUBTASK_UPDATE)
- ✅ تعديل مواصفات (SUBTASK_SPECS_UPDATE)
- ✅ ملاحظات (COMMENT_ADDED) - المتعلقة بالطباعة
- ✅ مرفقات (ATTACHMENT_ADDED)

---

## Configuration

### Backend Setup
في ملف `backend/notifications/service.py`:

```python
ROLE_NOTIFICATION_PREFERENCES = {
    'designer': [...],
    'print_manager': [...],
    'admin': [...]
}

ROLE_RELEVANT_STATUSES = {
    'designer': [...],
    'print_manager': [...],
    'admin': [...]
}
```

### Frontend Setup
في صفحة الإعدادات، كل رقم واتساب يجب أن يحتوي على:
- `name`: اسم الشخص
- `number`: رقم الواتساب
- `apiKey`: مفتاح API
- `type`: نوع الحساب (للعرض فقط)
- `role`: الدور الوظيفي (`admin`, `designer`, `print_manager`)
- `enabled`: مفعّل أم لا

---

## Smart Filtering Logic

### 1. Role-Based Filtering
```python
def should_send_to_role(template_type, role, context):
    # Check if template type is relevant to role
    if template_type not in ROLE_NOTIFICATION_PREFERENCES[role]:
        return False
    
    # Additional filtering for STATUS_CHANGE
    if template_type == 'STATUS_CHANGE':
        new_status = context.get('newStatus')
        return new_status in ROLE_RELEVANT_STATUSES[role]
    
    return True
```

### 2. Action-Based Filtering (Future Enhancement)
لمنع إرسال إشعارات للشخص الذي قام بالإجراء:
```python
# TODO: Add created_by tracking
if context.get('created_by') == recipient_user_id:
    return False  # Don't send notification to action creator
```

---

## Examples

### Example 1: Status Change to "Has Comments"
```python
context = {
    'taskTitle': 'بطاقات عمل',
    'clientName': 'شركة ABC',
    'clientCode': 'C-001',
    'statusMessage': 'يوجد ملاحظات',
    'oldStatus': 'في انتظار المراجعة',
    'newStatus': 'Has Comments'
}

# Who receives this notification?
# ✅ Designer (needs to make edits)
# ❌ Print Manager (not relevant to printing)
# ✅ Admin (tracks all changes)
```

### Example 2: Status Change to "In Printing"
```python
context = {
    'taskTitle': 'بطاقات عمل',
    'clientName': 'شركة ABC',
    'clientCode': 'C-001',
    'statusMessage': 'جاري الطباعة',
    'oldStatus': 'تم المونتاج',
    'newStatus': 'In Printing'
}

# Who receives this notification?
# ❌ Designer (design phase is done)
# ✅ Print Manager (printing started)
# ✅ Admin (tracks all changes)
```

---

## ✅ Implemented Features

### 1. User Action Tracking
النظام الآن يمنع إرسال إشعارات للشخص الذي قام بالإجراء:

**Backend Implementation:**
```python
def should_exclude_action_creator(recipient, context):
    # Check by user ID
    if context.get('created_by_user_id') == recipient.get('userId'):
        return True  # Don't send
    
    # Check by phone number
    if context.get('created_by_phone') == recipient.get('phone'):
        return True  # Don't send
    
    return False
```

**Usage Example:**
```python
context = {
    'taskTitle': 'بطاقات عمل',
    'clientName': 'شركة ABC',
    'created_by_user_id': '123',  # Designer who made the change
    'created_by_phone': '1234567890',
    ...
}

# Designer with userId='123' won't receive notification
# Other users will receive it normally
```

---

### 2. Custom Preferences
كل مستخدم يقدر يخصص الإشعارات اللي عايزها:

**Data Structure:**
```typescript
interface WhatsAppNumber {
    id: string;
    name: string;
    number: string;
    apiKey: string;
    role: 'admin' | 'designer' | 'print_manager';
    userId?: string;  // For action tracking
    preferences?: {
        NEW_PROJECT?: boolean;
        NEW_SUBTASK?: boolean;
        SUBTASK_UPDATE?: boolean;
        SUBTASK_SPECS_UPDATE?: boolean;
        STATUS_CHANGE?: boolean;
        COMMENT_ADDED?: boolean;
        REPLY_ADDED?: boolean;
        COMMENT_RESOLVED?: boolean;
        ATTACHMENT_ADDED?: boolean;
    }
}
```

**Backend Implementation:**
```python
def check_user_preferences(recipient, template_type):
    preferences = recipient.get('preferences', {})
    
    # If no preferences, send all (default: True)
    if not preferences:
        return True
    
    # Check if this type is enabled
    return preferences.get(template_type, True)
```

**Example:**
```json
{
    "id": "1",
    "name": "أحمد المصمم",
    "role": "designer",
    "preferences": {
        "NEW_PROJECT": true,
        "STATUS_CHANGE": true,
        "COMMENT_ADDED": true,
        "REPLY_ADDED": false,  // Disabled
        "ATTACHMENT_ADDED": false  // Disabled
    }
}
```

---

## Future Enhancements

### 1. Priority Levels
تصنيف الإشعارات حسب الأولوية:
- 🚨 عاجل (Urgent) - مهام عاجلة، مشاكل في الجودة
- ⚠️ مهم (Important) - ملاحظات جديدة، تغيير حالة
- ℹ️ عادي (Normal) - مرفقات، ردود

### 2. Notification Grouping
تجميع الإشعارات المتشابهة:
```
بدلاً من:
- تم إضافة ملاحظة على بطاقات عمل
- تم إضافة ملاحظة على بروشور
- تم إضافة ملاحظة على فلاير

يصبح:
- تم إضافة 3 ملاحظات جديدة
```

### 3. Scheduled Notifications
إرسال ملخص يومي بدلاً من إشعارات فورية:
```
📊 ملخص اليوم:
- 5 مشاريع جديدة
- 12 ملاحظة جديدة
- 8 مهام تم تسليمها
```

### 4. Notification History
حفظ سجل الإشعارات المرسلة:
- متى تم الإرسال
- لمن تم الإرسال
- هل تم التسليم بنجاح

---

## Testing

### Test 1: Role-Based Filtering
```python
recipients = [
    {'phone': '1234', 'apiKey': 'key1', 'role': 'designer'},
    {'phone': '5678', 'apiKey': 'key2', 'role': 'print_manager'}
]

context = {'newStatus': 'Has Comments'}
filtered = filter_recipients_by_role('STATUS_CHANGE', recipients, context)

# Expected: Only designer receives (relevant to their role)
assert len(filtered) == 1
assert filtered[0]['role'] == 'designer'
```

### Test 2: Action Creator Exclusion
```python
recipients = [
    {'phone': '1234', 'apiKey': 'key1', 'role': 'designer', 'userId': '123'},
    {'phone': '5678', 'apiKey': 'key2', 'role': 'admin', 'userId': '456'}
]

context = {
    'newStatus': 'Has Comments',
    'created_by_user_id': '123'  # Designer created the action
}
filtered = filter_recipients_by_role('STATUS_CHANGE', recipients, context)

# Expected: Only admin receives (designer excluded as action creator)
assert len(filtered) == 1
assert filtered[0]['role'] == 'admin'
```

### Test 3: User Preferences
```python
recipients = [
    {
        'phone': '1234',
        'apiKey': 'key1',
        'role': 'designer',
        'preferences': {
            'NEW_PROJECT': True,
            'COMMENT_ADDED': False  # Disabled
        }
    }
]

# Test enabled notification
context = {}
filtered = filter_recipients_by_role('NEW_PROJECT', recipients, context)
assert len(filtered) == 1  # Receives

# Test disabled notification
filtered = filter_recipients_by_role('COMMENT_ADDED', recipients, context)
assert len(filtered) == 0  # Doesn't receive
```

### Test 4: Combined Filtering
```python
recipients = [
    {
        'phone': '1111',
        'role': 'designer',
        'userId': '1',
        'preferences': {'STATUS_CHANGE': True}
    },
    {
        'phone': '2222',
        'role': 'designer',
        'userId': '2',
        'preferences': {'STATUS_CHANGE': False}  # Disabled
    },
    {
        'phone': '3333',
        'role': 'print_manager',
        'userId': '3'
    }
]

context = {
    'newStatus': 'Has Comments',  # Relevant to designer only
    'created_by_user_id': '1'  # First designer created it
}

filtered = filter_recipients_by_role('STATUS_CHANGE', recipients, context)

# Expected: No one receives
# - Designer 1: Excluded (action creator)
# - Designer 2: Excluded (disabled in preferences)
# - Print Manager: Excluded (not relevant to role)
assert len(filtered) == 0
```
