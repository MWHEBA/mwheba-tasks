import { NotificationTemplate, NotificationTemplateType, TemplateVariable, AppSettings, ValidationResult, ImportResult, ExportData } from '../types';
import { SettingsService } from './settingsService';

// Template metadata (synced with Backend as source of truth)
const TEMPLATE_METADATA: Record<NotificationTemplateType, NotificationTemplate> = {
  [NotificationTemplateType.NEW_PROJECT]: {
    id: NotificationTemplateType.NEW_PROJECT,
    name: 'مشروع جديد',
    description: 'يُرسل عند إضافة مشروع رئيسي جديد',
    defaultTemplate: `🆕 *مشروع جديد*

📌 المشروع: {taskTitle}
👤 العميل: {clientName}
🔢 كود العميل: {clientCode}
📊 الحالة: {status}
⚡ الأولوية: {urgency}`,
    requiredVariables: ['clientName', 'clientCode', 'taskTitle', 'status', 'urgency'],
    availableVariables: [
      { key: 'clientName', description: 'اسم العميل', example: 'شركة ABC', required: true },
      { key: 'taskTitle', description: 'عنوان المشروع', example: 'تصميم هوية بصرية', required: true },
      { key: 'clientCode', description: 'كود العميل', example: 'C-001', required: true },
      { key: 'taskDescription', description: 'وصف المشروع', example: 'تصميم شعار وبطاقات', required: false },
      { key: 'status', description: 'حالة المشروع', example: 'قيد التنفيذ', required: true },
      { key: 'urgency', description: 'درجة الأهمية', example: 'عاجل', required: true }
    ],
    category: 'task'
  },

  [NotificationTemplateType.NEW_SUBTASK]: {
    id: NotificationTemplateType.NEW_SUBTASK,
    name: 'بند جديد',
    description: 'يُرسل عند إضافة بند جديد',
    defaultTemplate: `➕ *بند جديد*

📋 البند: {taskTitle}
👤 العميل: {clientName}
🔢 كود العميل: {clientCode}
📊 الحالة: {status}`,
    requiredVariables: ['taskTitle', 'clientName', 'clientCode', 'status'],
    availableVariables: [
      { key: 'taskTitle', description: 'عنوان البند', example: 'بطاقات عمل', required: true },
      { key: 'clientName', description: 'اسم العميل', example: 'شركة ABC', required: true },
      { key: 'clientCode', description: 'كود العميل', example: 'C-001', required: true },
      { key: 'taskDescription', description: 'وصف البند', example: 'بطاقات عمل ملونة', required: false },
      { key: 'status', description: 'حالة البند', example: 'قيد التنفيذ', required: true },
      { key: 'urgency', description: 'درجة الأهمية', example: 'عاجل', required: false }
    ],
    category: 'task'
  },

  [NotificationTemplateType.SUBTASK_UPDATE]: {
    id: NotificationTemplateType.SUBTASK_UPDATE,
    name: 'تعديل بند',
    description: 'يُرسل عند تعديل بند',
    defaultTemplate: `✏️ *تعديل بند*

📋 البند: {taskTitle}
👤 العميل: {clientName}
🔢 كود العميل: {clientCode}
📏 المقاس: {size}
🖨️ نوع الطباعة: {printingType}`,
    requiredVariables: ['taskTitle', 'clientName', 'clientCode', 'size', 'printingType'],
    availableVariables: [
      { key: 'taskTitle', description: 'عنوان البند', example: 'بطاقات عمل', required: true },
      { key: 'clientName', description: 'اسم العميل', example: 'شركة ABC', required: true },
      { key: 'clientCode', description: 'كود العميل', example: 'C-001', required: true },
      { key: 'size', description: 'المقاس', example: '9×5 سم', required: true },
      { key: 'printingType', description: 'نوع الطباعة', example: 'أوفست', required: true }
    ],
    category: 'task'
  },

  [NotificationTemplateType.SUBTASK_SPECS_UPDATE]: {
    id: NotificationTemplateType.SUBTASK_SPECS_UPDATE,
    name: 'تعديل مواصفات',
    description: 'يُرسل عند تعديل مواصفات بند (المقاس أو نوع الطباعة)',
    defaultTemplate: `⚙️ *تعديل مواصفات*

📋 البند: {taskTitle}
👤 العميل: {clientName}
🔢 كود العميل: {clientCode}
📏 المقاس: {size}
🖨️ نوع الطباعة: {printingType}`,
    requiredVariables: ['taskTitle', 'clientName', 'clientCode', 'size', 'printingType'],
    availableVariables: [
      { key: 'taskTitle', description: 'عنوان البند', example: 'بطاقات عمل', required: true },
      { key: 'clientName', description: 'اسم العميل', example: 'شركة ABC', required: true },
      { key: 'clientCode', description: 'كود العميل', example: 'C-001', required: true },
      { key: 'size', description: 'المقاس', example: '9×5 سم', required: true },
      { key: 'printingType', description: 'نوع الطباعة', example: 'أوفست', required: true }
    ],
    category: 'task'
  },

  [NotificationTemplateType.STATUS_CHANGE]: {
    id: NotificationTemplateType.STATUS_CHANGE,
    name: 'تغيير الحالة',
    description: 'يُرسل عند تغيير حالة مهمة أو بند',
    defaultTemplate: `🔄 *تحديث الحالة*

📋 البند: {taskTitle}
👤 العميل: {clientName}
🔢 كود العميل: {clientCode}
✅ {statusMessage}
📊 الحالة السابقة: {oldStatus}
📊 الحالة الجديدة: {newStatus}`,
    requiredVariables: ['taskTitle', 'clientName', 'clientCode', 'statusMessage', 'oldStatus', 'newStatus'],
    availableVariables: [
      { key: 'taskTitle', description: 'عنوان البند', example: 'بطاقات عمل', required: true },
      { key: 'clientName', description: 'اسم العميل', example: 'شركة ABC', required: true },
      { key: 'clientCode', description: 'كود العميل', example: 'C-001', required: true },
      { key: 'statusMessage', description: 'رسالة الحالة', example: 'تم إتمام التصميم', required: true },
      { key: 'oldStatus', description: 'الحالة السابقة', example: 'قيد التصميم', required: true },
      { key: 'newStatus', description: 'الحالة الجديدة', example: 'تم التصميم', required: true }
    ],
    category: 'status'
  },

  [NotificationTemplateType.COMMENT_ADDED]: {
    id: NotificationTemplateType.COMMENT_ADDED,
    name: 'ملاحظة جديدة',
    description: 'يُرسل عند إضافة ملاحظة جديدة',
    defaultTemplate: `💬 *ملاحظة جديدة*

📋 {taskLabel}: {taskTitle}
👤 العميل: {clientName}
🔢 كود العميل: {clientCode}
📝 الملاحظة: {commentText}
🔢 عدد الملاحظات: {commentCount}`,
    requiredVariables: ['taskTitle', 'clientName', 'clientCode', 'taskLabel', 'commentText', 'commentCount'],
    availableVariables: [
      { key: 'taskTitle', description: 'عنوان المهمة/البند', example: 'بطاقات عمل', required: true },
      { key: 'clientName', description: 'اسم العميل', example: 'شركة ABC', required: true },
      { key: 'clientCode', description: 'كود العميل', example: 'C-001', required: true },
      { key: 'taskLabel', description: 'نوع المهمة (المهمة/البند)', example: 'البند', required: true },
      { key: 'commentText', description: 'نص الملاحظة (أول 50 حرف)', example: 'يرجى تعديل اللون...', required: true },
      { key: 'commentCount', description: 'عدد الملاحظات', example: '3', required: true }
    ],
    category: 'comment'
  },

  [NotificationTemplateType.REPLY_ADDED]: {
    id: NotificationTemplateType.REPLY_ADDED,
    name: 'رد جديد',
    description: 'يُرسل عند إضافة رد على ملاحظة',
    defaultTemplate: `↩️ *رد جديد*

📋 {taskLabel}: {taskTitle}
👤 العميل: {clientName}
🔢 كود العميل: {clientCode}
💬 الرد: {commentText}`,
    requiredVariables: ['taskTitle', 'clientName', 'clientCode', 'taskLabel', 'commentText'],
    availableVariables: [
      { key: 'taskTitle', description: 'عنوان المهمة/البند', example: 'بطاقات عمل', required: true },
      { key: 'clientName', description: 'اسم العميل', example: 'شركة ABC', required: true },
      { key: 'clientCode', description: 'كود العميل', example: 'C-001', required: true },
      { key: 'taskLabel', description: 'نوع المهمة (المهمة/البند)', example: 'البند', required: true },
      { key: 'commentText', description: 'نص الرد (أول 50 حرف)', example: 'تم التعديل...', required: true }
    ],
    category: 'comment'
  },

  [NotificationTemplateType.COMMENT_RESOLVED]: {
    id: NotificationTemplateType.COMMENT_RESOLVED,
    name: 'حل ملاحظة',
    description: 'يُرسل عند حل ملاحظة',
    defaultTemplate: `✅ *تم حل الملاحظة*

📋 {taskLabel}: {taskTitle}
👤 العميل: {clientName}
🔢 كود العميل: {clientCode}
🎉 تم حل الملاحظة بنجاح`,
    requiredVariables: ['taskTitle', 'clientName', 'clientCode', 'taskLabel'],
    availableVariables: [
      { key: 'taskTitle', description: 'عنوان المهمة/البند', example: 'بطاقات عمل', required: true },
      { key: 'clientName', description: 'اسم العميل', example: 'شركة ABC', required: true },
      { key: 'clientCode', description: 'كود العميل', example: 'C-001', required: true },
      { key: 'taskLabel', description: 'نوع المهمة (المهمة/البند)', example: 'البند', required: true }
    ],
    category: 'comment'
  },

  [NotificationTemplateType.ATTACHMENT_ADDED]: {
    id: NotificationTemplateType.ATTACHMENT_ADDED,
    name: 'مرفقات جديدة',
    description: 'يُرسل عند إضافة مرفقات',
    defaultTemplate: `📎 *مرفقات جديدة*

📋 {taskLabel}: {taskTitle}
👤 العميل: {clientName}
🔢 كود العميل: {clientCode}
📁 عدد المرفقات: {attachmentCount}
📄 الملفات: {attachmentNames}`,
    requiredVariables: ['taskTitle', 'clientName', 'clientCode', 'taskLabel', 'attachmentCount', 'attachmentNames'],
    availableVariables: [
      { key: 'taskTitle', description: 'عنوان المهمة/البند', example: 'بطاقات عمل', required: true },
      { key: 'clientName', description: 'اسم العميل', example: 'شركة ABC', required: true },
      { key: 'clientCode', description: 'كود العميل', example: 'C-001', required: true },
      { key: 'taskLabel', description: 'نوع المهمة (المهمة/البند)', example: 'البند', required: true },
      { key: 'attachmentCount', description: 'عدد المرفقات', example: '2', required: true },
      { key: 'attachmentNames', description: 'أسماء المرفقات', example: 'logo.png, design.pdf', required: true }
    ],
    category: 'comment'
  }
};

export const TemplateService = {
  /**
   * Get template text (custom or default - synced with Backend)
   */
  async getTemplate(type: NotificationTemplateType): Promise<string> {
    const settings = await SettingsService.get();
    const customTemplate = settings.notificationTemplates?.[type];
    
    // Return custom template or default (must match Backend)
    return customTemplate || TEMPLATE_METADATA[type].defaultTemplate;
  },

  /**
   * Save custom template
   */
  async saveTemplate(type: NotificationTemplateType, template: string): Promise<void> {
    const settings = await SettingsService.get();
    
    if (!settings.notificationTemplates) {
      settings.notificationTemplates = {} as Record<NotificationTemplateType, string>;
    }
    
    settings.notificationTemplates[type] = template;
    await SettingsService.save(settings);
  },

  /**
   * Reset template to default
   */
  async resetTemplate(type: NotificationTemplateType): Promise<void> {
    const settings = await SettingsService.get();
    
    if (settings.notificationTemplates && settings.notificationTemplates[type]) {
      delete settings.notificationTemplates[type];
      await SettingsService.save(settings);
    }
  },

  /**
   * Get all templates metadata
   */
  async getAllTemplates(): Promise<NotificationTemplate[]> {
    const settings = await SettingsService.get();
    
    return Object.values(TEMPLATE_METADATA).map(template => ({
      ...template,
      customTemplate: settings.notificationTemplates?.[template.id]
    }));
  },

  /**
   * Get available variables for a template type
   */
  getAvailableVariables(type: NotificationTemplateType): TemplateVariable[] {
    return TEMPLATE_METADATA[type].availableVariables;
  },

  /**
   * Render template with data, replacing placeholders
   * Handles missing data gracefully and preserves WhatsApp formatting
   * Falls back to default template on errors
   */
  async renderTemplate(type: NotificationTemplateType, data: Record<string, any>): Promise<string> {
    try {
      // Get the template (custom or default)
      const template = await this.getTemplate(type);
      
      // Replace all placeholders with actual data
      // Regex matches {variableName} pattern
      const rendered = template.replace(/\{(\w+)\}/g, (match, variableName) => {
        // Check if data has this variable
        if (data.hasOwnProperty(variableName) && data[variableName] != null) {
          return String(data[variableName]);
        }
        
        // Handle missing data gracefully - return empty string
        return '';
      });
      
      return rendered;
    } catch (error) {
      // On any error, fallback to default template
      console.error(`Error rendering template ${type}:`, error);
      
      try {
        const defaultTemplate = TEMPLATE_METADATA[type].defaultTemplate;
        
        // Try to render with default template
        const rendered = defaultTemplate.replace(/\{(\w+)\}/g, (_match: string, variableName: string) => {
          if (data.hasOwnProperty(variableName) && data[variableName] != null) {
            return String(data[variableName]);
          }
          return '';
        });
        
        return rendered;
      } catch (fallbackError) {
        // If even fallback fails, return the raw default template
        console.error(`Error rendering default template ${type}:`, fallbackError);
        return TEMPLATE_METADATA[type].defaultTemplate;
      }
    }
  },

  /**
   * Validate template for correctness
   * Checks for required placeholders, invalid syntax, and unknown placeholders
   * Returns ValidationResult with errors, warnings, and missing required fields
   */
  validateTemplate(type: NotificationTemplateType, template: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingRequired: string[] = [];
    
    const templateMetadata = TEMPLATE_METADATA[type];
    const requiredVariables = templateMetadata.requiredVariables;
    const availableVariables = templateMetadata.availableVariables.map(v => v.key);
    
    // Extract all placeholders from the template
    // Match valid placeholders: {variableName} where variableName is word characters
    const validPlaceholderRegex = /\{(\w+)\}/g;
    const foundPlaceholders = new Set<string>();
    let match;
    
    while ((match = validPlaceholderRegex.exec(template)) !== null) {
      foundPlaceholders.add(match[1]);
    }
    
    // Check for invalid placeholder syntax
    // Look for any opening brace that's not part of a valid placeholder
    const allBracePatterns = /\{[^}]*\}/g;
    const invalidPlaceholders = new Set<string>();
    
    let braceMatch;
    while ((braceMatch = allBracePatterns.exec(template)) !== null) {
      const placeholder = braceMatch[0];
      // Check if it's NOT a valid placeholder format
      if (!/^\{\w+\}$/.test(placeholder)) {
        invalidPlaceholders.add(placeholder);
      }
    }
    
    // Add errors for invalid placeholders
    for (const invalidPlaceholder of invalidPlaceholders) {
      errors.push(`صيغة متغير غير صحيحة: ${invalidPlaceholder}`);
    }
    
    // Check for unclosed braces
    const unclosedBraces = template.match(/\{(?![^}]*\})/g);
    if (unclosedBraces) {
      for (const unclosed of unclosedBraces) {
        if (!invalidPlaceholders.has(unclosed)) {
          errors.push(`قوس متغير غير مغلق: ${unclosed}`);
        }
      }
    }
    
    // Check for required placeholders presence
    for (const requiredVar of requiredVariables) {
      if (!foundPlaceholders.has(requiredVar)) {
        missingRequired.push(requiredVar);
        errors.push(`المتغير المطلوب مفقود: {${requiredVar}}`);
      }
    }
    
    // Identify unknown placeholders (not in available variables)
    for (const placeholder of foundPlaceholders) {
      if (!availableVariables.includes(placeholder)) {
        warnings.push(`متغير غير معروف: {${placeholder}}`);
      }
    }
    
    const valid = errors.length === 0;
    
    return {
      valid,
      errors,
      warnings,
      missingRequired
    };
  },

  /**
   * Export all custom templates to JSON
   * Generates JSON with all custom templates and metadata (version, exportDate)
   * Returns JSON string ready for download
   */
  async exportTemplates(): Promise<string> {
    const settings = await SettingsService.get();
    const customTemplates = settings.notificationTemplates || {} as Record<NotificationTemplateType, string>;
    
    const exportData: ExportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      templates: customTemplates
    };
    
    return JSON.stringify(exportData, null, 2);
  },

  /**
   * Import templates from JSON
   * Parses and validates imported JSON before applying
   * Handles errors gracefully - skips corrupted templates, imports valid ones
   * Returns ImportResult with success status, count of imported templates, and errors
   */
  async importTemplates(json: string): Promise<ImportResult> {
    const errors: string[] = [];
    let imported = 0;
    
    try {
      // Parse JSON
      let data: any;
      try {
        data = JSON.parse(json);
      } catch (parseError) {
        return {
          success: false,
          imported: 0,
          errors: ['ملف غير صالح: تنسيق JSON خاطئ']
        };
      }
      
      // Validate file format
      if (!data || typeof data !== 'object') {
        return {
          success: false,
          imported: 0,
          errors: ['ملف غير صالح: البنية غير صحيحة']
        };
      }
      
      // Check for required fields
      if (!data.templates || typeof data.templates !== 'object') {
        return {
          success: false,
          imported: 0,
          errors: ['ملف غير صالح: حقل القوالب مفقود']
        };
      }
      
      // Warn about version mismatch (but continue)
      if (data.version && data.version !== '1.0') {
        errors.push(`تحذير: إصدار القالب مختلف (${data.version})، قد تحدث مشاكل`);
      }
      
      // Get current settings
      const settings = await SettingsService.get();
      if (!settings.notificationTemplates) {
        settings.notificationTemplates = {} as Record<NotificationTemplateType, string>;
      }
      
      // Import each template
      const templates = data.templates;
      for (const [templateType, templateText] of Object.entries(templates)) {
        // Validate that this is a known template type
        if (!Object.values(NotificationTemplateType).includes(templateType as NotificationTemplateType)) {
          errors.push(`تخطي قالب غير معروف: ${templateType}`);
          continue;
        }
        
        // Validate that template text is a string
        if (typeof templateText !== 'string') {
          errors.push(`بيانات قالب تالفة: ${templateType}`);
          continue;
        }
        
        // Validate the template
        const validation = this.validateTemplate(templateType as NotificationTemplateType, templateText);
        if (!validation.valid) {
          errors.push(`قالب غير صالح (${templateType}): ${validation.errors.join(', ')}`);
          continue;
        }
        
        // Import the template
        settings.notificationTemplates[templateType as NotificationTemplateType] = templateText;
        imported++;
      }
      
      // Save settings if any templates were imported
      if (imported > 0) {
        await SettingsService.save(settings);
      }
      
      // Return result
      return {
        success: imported > 0,
        imported,
        errors
      };
      
    } catch (error) {
      return {
        success: false,
        imported: 0,
        errors: [`خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`]
      };
    }
  }
};
