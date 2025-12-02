import { AppSettings, WhatsAppType, WhatsAppNumber, NotificationTemplateType } from '../types';
import { apiCall } from '../config/api';

const DEFAULT_SETTINGS: AppSettings = {
  whatsappNumbers: [
    {
      id: 'default-1',
      name: 'مدير النظام',
      type: WhatsAppType.MANAGEMENT,
      number: '201229609292',
      apiKey: '8684438',
      enabled: true
    }
  ],
  notificationsEnabled: true
};

export const SettingsService = {
  /**
   * جلب الإعدادات
   * Fetches application settings from the API
   */
  get: async (): Promise<AppSettings> => {
    try {
      // Use unified settings endpoint - GET /api/settings/1
      // ID is always 1 since settings is a singleton resource
      const settings = await apiCall<Record<string, any>>('/settings/1');
      
      // Convert settings object to AppSettings format
      const appSettings: AppSettings = {
        whatsappNumbers: settings.whatsappNumbers || DEFAULT_SETTINGS.whatsappNumbers,
        notificationsEnabled: settings.notificationsEnabled ?? true,
        notificationTemplates: settings.notificationTemplates
      };
      
      // Migration: Ensure 'enabled' property exists on all numbers
      if (appSettings.whatsappNumbers) {
        appSettings.whatsappNumbers = appSettings.whatsappNumbers.map(n => ({
          ...n,
          enabled: n.enabled ?? true
        }));
      }
      
      return appSettings;
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * حفظ الإعدادات
   * Saves application settings to the API
   */
  save: async (settings: AppSettings): Promise<void> => {
    try {
      // Use unified settings endpoint - PUT /api/settings/1
      // ID is always 1 since settings is a singleton resource
      // Save all settings atomically
      await apiCall('/settings/1', {
        method: 'PUT',
        body: JSON.stringify({
          whatsappNumbers: settings.whatsappNumbers,
          notificationsEnabled: settings.notificationsEnabled,
          notificationTemplates: settings.notificationTemplates || {}
        }),
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  /**
   * إضافة رقم واتساب جديد
   * Adds a new WhatsApp number
   */
  addWhatsAppNumber: async (number: Omit<WhatsAppNumber, 'id'>): Promise<WhatsAppNumber> => {
    const settings = await SettingsService.get();
    const newNumber: WhatsAppNumber = {
      ...number,
      id: crypto.randomUUID()
    };
    
    settings.whatsappNumbers.push(newNumber);
    await SettingsService.save(settings);
    
    return newNumber;
  },

  /**
   * تحديث رقم واتساب
   * Updates an existing WhatsApp number
   */
  updateWhatsAppNumber: async (number: WhatsAppNumber): Promise<void> => {
    const settings = await SettingsService.get();
    const index = settings.whatsappNumbers.findIndex(n => n.id === number.id);
    
    if (index !== -1) {
      settings.whatsappNumbers[index] = number;
      await SettingsService.save(settings);
    }
  },

  /**
   * حذف رقم واتساب
   * Deletes a WhatsApp number
   */
  deleteWhatsAppNumber: async (id: string): Promise<void> => {
    const settings = await SettingsService.get();
    settings.whatsappNumbers = settings.whatsappNumbers.filter(n => n.id !== id);
    await SettingsService.save(settings);
  },

  /**
   * تفعيل/تعطيل رقم واتساب
   * Enables or disables a WhatsApp number
   */
  toggleWhatsAppNumber: async (id: string, enabled: boolean): Promise<void> => {
    const settings = await SettingsService.get();
    const number = settings.whatsappNumbers.find(n => n.id === id);
    
    if (number) {
      number.enabled = enabled;
      await SettingsService.save(settings);
    }
  },

  /**
   * جلب أرقام واتساب المفعلة فقط
   * Gets only enabled WhatsApp numbers
   */
  getEnabledWhatsAppNumbers: async (): Promise<WhatsAppNumber[]> => {
    const settings = await SettingsService.get();
    return settings.whatsappNumbers.filter(n => n.enabled);
  },

  /**
   * جلب أرقام واتساب حسب النوع
   * Gets WhatsApp numbers by type
   */
  getWhatsAppNumbersByType: async (type: WhatsAppType): Promise<WhatsAppNumber[]> => {
    const settings = await SettingsService.get();
    return settings.whatsappNumbers.filter(n => n.type === type && n.enabled);
  },

  /**
   * حفظ قالب إشعار مخصص
   * Saves a custom notification template
   */
  saveNotificationTemplate: async (type: NotificationTemplateType, template: string): Promise<void> => {
    const settings = await SettingsService.get();
    
    if (!settings.notificationTemplates) {
      settings.notificationTemplates = {} as Record<NotificationTemplateType, string>;
    }
    
    settings.notificationTemplates[type] = template;
    await SettingsService.save(settings);
  },

  /**
   * حذف قالب إشعار مخصص (العودة للافتراضي)
   * Deletes a custom notification template (revert to default)
   */
  deleteNotificationTemplate: async (type: NotificationTemplateType): Promise<void> => {
    const settings = await SettingsService.get();
    
    if (settings.notificationTemplates) {
      delete settings.notificationTemplates[type];
      await SettingsService.save(settings);
    }
  },

  /**
   * تهيئة الإعدادات الافتراضية (للاستخدام مرة واحدة)
   * Initializes default settings (one-time use)
   */
  initializeDefaults: async (): Promise<void> => {
    try {
      const existing = await SettingsService.get();
      
      // Only initialize if no settings exist
      if (!existing.whatsappNumbers || existing.whatsappNumbers.length === 0) {
        await SettingsService.save(DEFAULT_SETTINGS);
        console.log('✅ Default settings initialized');
      }
    } catch (error) {
      console.error('Failed to initialize default settings:', error);
    }
  }
};
