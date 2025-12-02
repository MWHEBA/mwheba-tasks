import React, { useState, useEffect } from 'react';
import { AppSettings, WhatsAppType, WhatsAppNumber, TaskStatus } from '../types';
import { SettingsService } from '../services/settingsService';
import { NotificationService } from '../services/notificationService';
import { NotificationTemplatesTab } from '../components/NotificationTemplatesTab';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { Permissions } from '../utils/permissions';
import { useSettingsContext } from '../contexts/SettingsContext';
import { StatusService } from '../services/statusService';

const TYPE_LABELS: Record<WhatsAppType, { label: string, color: string, icon: string }> = {
    [WhatsAppType.MANAGEMENT]: { label: 'الإدارة', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'fa-solid fa-user-tie' },
    [WhatsAppType.PRINT_MANAGER]: { label: 'مسؤول المطبوعات', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'fa-solid fa-print' },
    [WhatsAppType.DESIGNER]: { label: 'مصمم', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'fa-solid fa-pen-nib' },
};

export const Settings: React.FC = () => {
  const { settings: contextSettings, loading: contextLoading, refreshSettings, updateSettings } = useSettingsContext();
  const [settings, setSettings] = useState<AppSettings>({ whatsappNumbers: [], notificationsEnabled: true });
  const [activeTab, setActiveTab] = useState<'numbers' | 'templates'>('numbers');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingPreferencesId, setEditingPreferencesId] = useState<string | null>(null);
  const [tempPreferences, setTempPreferences] = useState<any>({});
  const [allStatuses, setAllStatuses] = useState<TaskStatus[]>([]);
  
  // New Number Form State
  const [newNumber, setNewNumber] = useState<{
      name: string;
      number: string;
      apiKey: string;
      type: WhatsAppType;
      role: 'admin' | 'designer' | 'print_manager';
  }>({
      name: '',
      number: '',
      apiKey: '',
      type: WhatsAppType.MANAGEMENT,
      role: 'admin'
  });
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<{
    number?: string;
  }>({});

  // Test State
  const [testingId, setTestingId] = useState<string | null>(null);
  
  // Track if this is the first load to avoid auto-saving on initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Load statuses on mount
  useEffect(() => {
    const loadStatuses = async () => {
      const statuses = await StatusService.getAll();
      setAllStatuses(statuses);
    };
    loadStatuses();
  }, []);

  // Load settings on mount
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);
  
  // Sync context settings to local state
  useEffect(() => {
    if (contextSettings) {
      setSettings(contextSettings);
      setIsInitialLoad(false);
    }
  }, [contextSettings]);
  
  // Validation function for WhatsApp number
  const validateWhatsAppNumber = (value: string): string | undefined => {
    if (!value || value.trim().length === 0) {
      return 'رقم الهاتف مطلوب';
    }
    
    // Remove any spaces or special characters
    const cleanNumber = value.replace(/[\s\-\+\(\)]/g, '');
    
    // Check if it contains only digits
    if (!/^\d+$/.test(cleanNumber)) {
      return 'رقم الهاتف يجب أن يحتوي على أرقام فقط';
    }
    
    // Check length (international format: 10-15 digits)
    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
      return 'رقم الهاتف يجب أن يكون بين 10 و 15 رقم';
    }
    
    return undefined;
  };
  
  if (contextLoading || !contextSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" text="جاري التحميل..." />
      </div>
    );
  }

  const openAddModal = () => {
      setNewNumber({
          name: '',
          number: '',
          apiKey: '',
          type: WhatsAppType.MANAGEMENT,
          role: 'admin'
      });
      setValidationErrors({});
      setIsAddModalOpen(true);
  };

  const handleAddNumber = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validate WhatsApp number
      const numberError = validateWhatsAppNumber(newNumber.number);
      
      setValidationErrors({
        number: numberError
      });
      
      // If there are validation errors, stop submission
      if (numberError) {
        return;
      }
      
      if (!newNumber.name || !newNumber.number || !newNumber.apiKey) return;

      const newItem: WhatsAppNumber = {
          id: crypto.randomUUID(),
          ...newNumber,
          enabled: true, // Default enabled
          preferences: {
              NEW_PROJECT: true,
              NEW_SUBTASK: true,
              SUBTASK_UPDATE: true,
              SUBTASK_SPECS_UPDATE: true,
              STATUS_CHANGE: true,
              COMMENT_ADDED: true,
              REPLY_ADDED: true,
              COMMENT_RESOLVED: true,
              ATTACHMENT_ADDED: true
          }
      };

      const updatedSettings = {
          ...settings,
          whatsappNumbers: [...settings.whatsappNumbers, newItem]
      };
      
      setSettings(updatedSettings);
      updateSettings(updatedSettings);
      setIsAddModalOpen(false);
  };

  const handleDeleteClick = (id: string) => {
      setDeleteId(id);
  };

  const handleOpenPreferences = (id: string) => {
      const item = settings.whatsappNumbers.find(n => n.id === id);
      if (item) {
          const baseTypes = [
              'NEW_PROJECT', 'NEW_SUBTASK', 'SUBTASK_UPDATE', 'SUBTASK_SPECS_UPDATE',
              'COMMENT_ADDED', 'REPLY_ADDED', 'COMMENT_RESOLVED', 'ATTACHMENT_ADDED'
          ];
          
          // Add status-specific preferences
          const statusTypes = allStatuses.map(s => `STATUS_${s.id}`);
          const allTypes = [...baseTypes, ...statusTypes];
          
          const defaultPrefs = allTypes.reduce((acc, type) => ({ ...acc, [type]: true }), {});
          setTempPreferences(item.preferences || defaultPrefs);
          setEditingPreferencesId(id);
      }
  };

  const handleSavePreferences = (id: string, preferences: any) => {
      const updatedSettings = {
          ...settings,
          whatsappNumbers: settings.whatsappNumbers.map(n => 
              n.id === id ? { ...n, preferences } : n
          )
      };
      setSettings(updatedSettings);
      updateSettings(updatedSettings);
      setEditingPreferencesId(null);
      setTempPreferences({});
  };

  const confirmDelete = () => {
      if (deleteId) {
          const updatedSettings = {
              ...settings,
              whatsappNumbers: settings.whatsappNumbers.filter(n => n.id !== deleteId)
          };
          setSettings(updatedSettings);
          updateSettings(updatedSettings);
          setDeleteId(null);
      }
  };

  const handleToggleNumber = (id: string) => {
      const updatedSettings = {
          ...settings,
          whatsappNumbers: settings.whatsappNumbers.map(n => 
              n.id === id ? { ...n, enabled: !n.enabled } : n
          )
      };
      setSettings(updatedSettings);
      updateSettings(updatedSettings);
  };

  const handleNumberChange = (value: string) => {
    setNewNumber({...newNumber, number: value});
    
    // Clear error when user starts typing
    if (validationErrors.number) {
      setValidationErrors(prev => ({ ...prev, number: undefined }));
    }
  };

  const handleTestNumber = async (item: WhatsAppNumber) => {
      setTestingId(item.id);
      try {
        const success = await NotificationService.sendTestMessage(item.number, item.apiKey);
        setTestingId(null);
        if (success) {
          alert(`✅ تم إرسال رسالة اختبار إلى ${item.name}

تحقق من واتساب الآن.`);
        } else {
          alert(`❌ فشل إرسال الرسالة إلى ${item.name}

تأكد من:
• الاتصال بالإنترنت
• صحة رقم الهاتف (بدون + في البداية: 201234567890)
• صحة API Key
• تفعيل الرقم على CallMeBot

للتفعيل: أرسل على واتساب:
+34 621 33 17 09
النص: I allow callmebot to send me messages`);
        }
      } catch (error) {
        setTestingId(null);
        alert(`❌ حدث خطأ أثناء إرسال الرسالة

الرجاء المحاولة مرة أخرى`);
      }
  };

  const inputClass = "w-full h-11 rounded-md border-slate-300 shadow-sm px-3 border text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white";

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إعدادات الإشعارات</h1>
          <p className="text-slate-500 mt-1">تهيئة أرقام واتساب وقوالب الإشعارات</p>
          {!Permissions.canManageSettings() && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
              <i className="fa-solid fa-lock"></i>
              <span>يمكنك عرض الإعدادات فقط. التعديل متاح للمدراء فقط.</span>
            </div>
          )}
        </div>
        <a
          href="/#/status-settings"
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all text-sm"
        >
          <i className="fa-solid fa-list-check"></i>
          إعدادات الحالات
        </a>
      </div>

      {contextLoading ? (
        <div className="text-center py-10">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-slate-300"></i>
        </div>
      ) : (
        <>
      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-slate-200">
        <div className="flex gap-1">
          {[
            { id: 'numbers', icon: 'fa-brands fa-whatsapp', label: 'أرقام الاستقبال' },
            { id: 'templates', icon: 'fa-solid fa-file-lines', label: 'قوالب الإشعارات' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'numbers' | 'templates')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <i className={`${tab.icon} ml-2`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'numbers' && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl">
                      <i className="fa-brands fa-whatsapp"></i>
                  </div>
                  <div>
                      <h2 className="font-bold text-lg text-slate-800">أرقام الاستقبال</h2>
                      <p className="text-xs text-slate-500">قائمة الأرقام المسجلة لاستلام الإشعارات. (يتم الحفظ تلقائياً)</p>
                  </div>
              </div>
              {Permissions.canManageSettings() && (
                <button
                    onClick={openAddModal}
                    className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm flex items-center gap-2"
                >
                    <i className="fa-solid fa-plus"></i>
                    إضافة رقم
                </button>
              )}
            </div>

          <div className="divide-y divide-slate-100">
              {settings.whatsappNumbers.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-sm italic">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300 text-2xl">
                          <i className="fa-solid fa-address-book"></i>
                      </div>
                      لا توجد أرقام مسجلة. قم بإضافة أرقام لاستقبال الإشعارات.
                  </div>
              ) : (
                  settings.whatsappNumbers.map(item => {
                      // Fallback for old types if any exist in storage
                      const typeStyle = TYPE_LABELS[item.type] || TYPE_LABELS[WhatsAppType.MANAGEMENT];
                      return (
                          <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50 transition-colors group">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${typeStyle.color} flex-shrink-0`}>
                                  <i className={typeStyle.icon}></i>
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                      <h4 className={`font-bold text-slate-800 ${!item.enabled ? 'opacity-50' : ''}`}>{item.name}</h4>
                                      <span className={`text-[10px] px-2 py-0.5 rounded border ${typeStyle.color} ${!item.enabled ? 'opacity-50' : ''}`}>
                                          {typeStyle.label}
                                      </span>
                                      {item.role && (
                                          <span className={`text-[10px] px-2 py-0.5 rounded border ${
                                              item.role === 'admin' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                              item.role === 'designer' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                              'bg-blue-50 text-blue-700 border-blue-200'
                                          } ${!item.enabled ? 'opacity-50' : ''}`}>
                                              {item.role === 'admin' ? 'إداري' : item.role === 'designer' ? 'مصمم' : 'منسق مطبوعات'}
                                          </span>
                                      )}
                                  </div>
                                  <div className={`flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono ${!item.enabled ? 'opacity-50' : ''}`}>
                                      <span><i className="fa-solid fa-phone me-1"></i>{item.number}</span>
                                      <span className="truncate max-w-[100px]"><i className="fa-solid fa-key me-1"></i>{item.apiKey}</span>
                                  </div>
                              </div>
                              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                  {Permissions.canManageSettings() ? (
                                    <label className="relative inline-flex items-center cursor-pointer" title={item.enabled ? 'إيقاف الإشعارات' : 'تفعيل الإشعارات'}>
                                      <input 
                                          type="checkbox" 
                                          checked={item.enabled} 
                                          onChange={() => handleToggleNumber(item.id)}
                                          className="sr-only peer" 
                                      />
                                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                                    </label>
                                  ) : (
                                    <span className={`text-xs px-2 py-1 rounded ${item.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                      {item.enabled ? 'مفعّل' : 'معطّل'}
                                    </span>
                                  )}
                                  <div className="h-6 w-px bg-slate-200"></div>
                                  <button 
                                      onClick={() => handleOpenPreferences(item.id)}
                                      className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                                      title="تخصيص الإشعارات"
                                  >
                                      <i className="fa-solid fa-sliders"></i>
                                  </button>
                                  <button 
                                      onClick={() => handleTestNumber(item)}
                                      disabled={!item.enabled || testingId === item.id}
                                      className={`p-2 rounded transition-colors ${!item.enabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                                      title="تجربة الإرسال"
                                  >
                                      {testingId === item.id ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                                  </button>
                                  {Permissions.canManageSettings() && (
                                    <button 
                                        onClick={() => handleDeleteClick(item.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="حذف"
                                    >
                                        <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                  )}
                              </div>
                          </div>
                      );
                  })
              )}
            </div>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <h4 className="font-bold mb-2"><i className="fa-solid fa-circle-info me-2"></i>معلومة هامة</h4>
            <p>
                  لتفعيل استلام الرسائل على أي رقم جديد، يجب إرسال الرسالة التالية من الرقم نفسه إلى البوت (+34 644 10 55 84):
                  <br />
                  <code className="bg-white px-2 py-0.5 rounded border border-blue-200 mt-1 inline-block font-mono text-xs select-all">
                      I allow callmebot to send me messages
                  </code>
            </p>
          </div>
        </>
      )}

      {activeTab === 'templates' && (
        <NotificationTemplatesTab />
      )}

      {/* Add Number Modal */}
      <AnimatePresence>
          {isAddModalOpen && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                 <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
                 >
                     <div className="flex justify-between items-center p-4 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">إضافة رقم واتساب جديد</h3>
                        <button onClick={() => setIsAddModalOpen(false)}><i className="fa-solid fa-times text-slate-400 hover:text-slate-600"></i></button>
                     </div>
                     <form onSubmit={handleAddNumber} className="p-6 space-y-4">
                         <div>
                             <label className="block text-xs font-medium text-slate-600 mb-1">الاسم التعريفي</label>
                             <input 
                                 type="text" 
                                 required
                                 placeholder="مثال: مدير المبيعات"
                                 value={newNumber.name}
                                 onChange={e => setNewNumber({...newNumber, name: e.target.value})}
                                 className={inputClass}
                             />
                         </div>
                         
                         <div>
                             <label className="block text-xs font-medium text-slate-600 mb-1">النوع</label>
                             <select
                                 value={newNumber.type}
                                 onChange={e => setNewNumber({...newNumber, type: e.target.value as WhatsAppType})}
                                 className={inputClass}
                             >
                                 {Object.values(WhatsAppType).map(type => (
                                     <option key={type} value={type}>{TYPE_LABELS[type].label}</option>
                                 ))}
                             </select>
                         </div>

                         <div>
                             <label className="block text-xs font-medium text-slate-600 mb-1">رقم الهاتف</label>
                             <input 
                                 type="text" 
                                 required
                                 placeholder="201xxxxxxxxx"
                                 value={newNumber.number}
                                 onChange={e => handleNumberChange(e.target.value)}
                                 className={`${inputClass} font-mono ${
                                   validationErrors.number 
                                     ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                                     : ''
                                 }`}
                                 dir="ltr"
                             />
                             {validationErrors.number && (
                               <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                 <i className="fa-solid fa-circle-exclamation"></i>
                                 {validationErrors.number}
                               </p>
                             )}
                         </div>

                         <div>
                             <label className="block text-xs font-medium text-slate-600 mb-1">API Key</label>
                             <input 
                                 type="text" 
                                 required
                                 placeholder="123456"
                                 value={newNumber.apiKey}
                                 onChange={e => setNewNumber({...newNumber, apiKey: e.target.value})}
                                 className={`${inputClass} font-mono`}
                                 dir="ltr"
                             />
                         </div>

                         <div>
                             <label className="block text-xs font-medium text-slate-600 mb-1">الدور الوظيفي</label>
                             <select 
                                 value={newNumber.role}
                                 onChange={e => setNewNumber({...newNumber, role: e.target.value as 'admin' | 'designer' | 'print_manager'})}
                                 className={inputClass}
                             >
                                 <option value="admin">إداري (يستلم كل الإشعارات)</option>
                                 <option value="designer">مصمم جرافيك (التصميم والملاحظات)</option>
                                 <option value="print_manager">منسق مطبوعات (المونتاج والطباعة)</option>
                             </select>
                             <p className="mt-1 text-xs text-slate-500">
                                 <i className="fa-solid fa-info-circle me-1"></i>
                                 يحدد نوع الإشعارات التي سيستلمها
                             </p>
                         </div>

                         <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
                            <button 
                                type="button" 
                                onClick={() => setIsAddModalOpen(false)} 
                                className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 text-slate-700 h-11"
                            >
                                إلغاء
                            </button>
                            <button 
                                type="submit" 
                                className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 h-11 font-medium shadow-sm"
                            >
                                إضافة
                            </button>
                         </div>
                     </form>
                 </motion.div>
             </div>
          )}
      </AnimatePresence>

      {/* Preferences Modal */}
      <AnimatePresence>
        {editingPreferencesId && (() => {
            const item = settings.whatsappNumbers.find(n => n.id === editingPreferencesId);
            if (!item) return null;

            const getNotificationTypes = () => {
                const baseTypes = [
                    { key: 'NEW_PROJECT', label: 'مشروع جديد', icon: 'fa-folder-plus', description: 'عند إضافة مشروع رئيسي جديد', category: 'general' },
                    { key: 'NEW_SUBTASK', label: 'بند جديد', icon: 'fa-plus-circle', description: 'عند إضافة بند جديد', category: 'general' },
                    { key: 'SUBTASK_UPDATE', label: 'تعديل بند', icon: 'fa-edit', description: 'عند تعديل بند موجود', category: 'general' },
                    { key: 'SUBTASK_SPECS_UPDATE', label: 'تعديل مواصفات', icon: 'fa-cog', description: 'عند تعديل المقاس أو نوع الطباعة', category: 'general' },
                    { key: 'COMMENT_ADDED', label: 'ملاحظة جديدة', icon: 'fa-comment', description: 'عند إضافة ملاحظة جديدة', category: 'general' },
                    { key: 'REPLY_ADDED', label: 'رد جديد', icon: 'fa-reply', description: 'عند إضافة رد على ملاحظة', category: 'general' },
                    { key: 'COMMENT_RESOLVED', label: 'حل ملاحظة', icon: 'fa-check-circle', description: 'عند حل ملاحظة', category: 'general' },
                    { key: 'ATTACHMENT_ADDED', label: 'مرفقات جديدة', icon: 'fa-paperclip', description: 'عند إضافة مرفقات', category: 'general' }
                ];

                // Add dynamic status types (exclude default/redundant statuses)
                const excludedStatuses = ['Pending']; // قيد الانتظار - covered by NEW_PROJECT
                
                const statusTypes = allStatuses
                    .filter(status => !excludedStatuses.includes(status.id))
                    .map(status => ({
                        key: `STATUS_${status.id}`,
                        label: status.label,
                        icon: status.icon || 'fa-circle',
                        description: `عند تغيير الحالة إلى: ${status.label}`,
                        category: 'status',
                        color: status.color
                    }));

                return { baseTypes, statusTypes };
            };

            const { baseTypes, statusTypes } = getNotificationTypes();

            const handleToggle = (key: string) => {
                setTempPreferences({ ...tempPreferences, [key]: !tempPreferences[key] });
            };

            const handleSelectAll = () => {
                const allTypes = [...baseTypes, ...statusTypes];
                const allEnabled = allTypes.reduce((acc, type) => ({ ...acc, [type.key]: true }), {});
                setTempPreferences(allEnabled);
            };

            const handleDeselectAll = () => {
                const allTypes = [...baseTypes, ...statusTypes];
                const allDisabled = allTypes.reduce((acc, type) => ({ ...acc, [type.key]: false }), {});
                setTempPreferences(allDisabled);
            };

            const totalTypes = baseTypes.length + statusTypes.length;
            const enabledCount = Object.values(tempPreferences).filter(Boolean).length;

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-brand-50 to-white">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <i className="fa-solid fa-sliders text-brand-600"></i>
                                    تخصيص الإشعارات
                                </h3>
                                <button
                                    onClick={() => setEditingPreferencesId(null)}
                                    className="text-slate-400 hover:text-slate-600 p-2"
                                >
                                    <i className="fa-solid fa-times text-xl"></i>
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <i className="fa-solid fa-user"></i>
                                <span className="font-medium">{item.name}</span>
                                <span className="text-slate-400">•</span>
                                <span className={`text-xs px-2 py-0.5 rounded border ${
                                    item.role === 'admin' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                    item.role === 'designer' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                    'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                    {item.role === 'admin' ? 'إداري' : item.role === 'designer' ? 'مصمم' : 'منسق مطبوعات'}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm text-slate-600">
                                    <i className="fa-solid fa-bell me-1"></i>
                                    <span className="font-medium">{enabledCount}</span> من {totalTypes} مفعّل
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-xs px-3 py-1 text-brand-600 hover:bg-brand-50 rounded border border-brand-200"
                                    >
                                        تفعيل الكل
                                    </button>
                                    <button
                                        onClick={handleDeselectAll}
                                        className="text-xs px-3 py-1 text-slate-600 hover:bg-slate-50 rounded border border-slate-200"
                                    >
                                        إلغاء الكل
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* General Notifications */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <i className="fa-solid fa-bell"></i>
                                        إشعارات عامة
                                    </h4>
                                    <div className="space-y-2">
                                        {baseTypes.map(type => (
                                            <label
                                                key={type.key}
                                                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                                    tempPreferences[type.key]
                                                        ? 'border-brand-200 bg-brand-50/50'
                                                        : 'border-slate-100 hover:border-slate-200 bg-white'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={tempPreferences[type.key] || false}
                                                    onChange={() => handleToggle(type.key)}
                                                    className="mt-1 w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <i className={`fa-solid ${type.icon} text-brand-600`}></i>
                                                        <span className="font-medium text-slate-800">{type.label}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">{type.description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Status Change Notifications */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <i className="fa-solid fa-exchange-alt"></i>
                                        تغيير الحالة (اختر الحالات المهمة لك)
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto p-1">
                                        {statusTypes.map(type => (
                                            <label
                                                key={type.key}
                                                className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                                                    tempPreferences[type.key]
                                                        ? 'border-brand-200 bg-brand-50/50'
                                                        : 'border-slate-100 hover:border-slate-200 bg-white'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={tempPreferences[type.key] || false}
                                                    onChange={() => handleToggle(type.key)}
                                                    className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                                                />
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <i className={`fa-solid ${type.icon} text-sm`} style={{ color: type.color }}></i>
                                                    <span className="text-sm text-slate-800 truncate">{type.label}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingPreferencesId(null)}
                                className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-white text-slate-700"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={() => handleSavePreferences(item.id, tempPreferences)}
                                className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 font-medium shadow-sm"
                            >
                                <i className="fa-solid fa-save me-2"></i>
                                حفظ التفضيلات
                            </button>
                        </div>
                    </motion.div>
                </div>
            );
        })()}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden"
                >
                     <div className="p-6 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 text-2xl">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">تأكيد الحذف</h3>
                        <p className="text-sm text-slate-500">هل أنت متأكد من حذف هذا الرقم؟</p>
                    </div>
                    <div className="flex border-t border-slate-100 bg-slate-50 p-4 gap-3 justify-center">
                        <button
                            onClick={() => setDeleteId(null)}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm"
                        >
                            حذف نهائي
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
      </>
      )}
    </div>
  );
};