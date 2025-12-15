import React, { useState, useEffect, useMemo } from 'react';
import { NotificationTemplate, NotificationTemplateType, ValidationResult } from '../types';
import { TemplateService } from '../services/templateService';
import { TemplateEditor } from './TemplateEditor';
import { TemplatePreview } from './TemplatePreview';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_LABELS = {
  task: { label: 'المهام', icon: 'fa-solid fa-tasks', color: 'text-blue-600' },
  comment: { label: 'الملحوظات', icon: 'fa-solid fa-comment', color: 'text-purple-600' },
  status: { label: 'الحالات', icon: 'fa-solid fa-circle-check', color: 'text-green-600' }
};

export const NotificationTemplatesTab: React.FC = () => {
  // State management
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplateType | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult | undefined>(undefined);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Modal states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  // Feedback states
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const allTemplates = await TemplateService.getAllTemplates();
    setTemplates(allTemplates);
    
    // Select first template if none selected
    if (!selectedTemplate && allTemplates.length > 0) {
      await selectTemplate(allTemplates[0].id);
    }
  };

  // Select a template
  const selectTemplate = async (templateType: NotificationTemplateType) => {
    // Warn about unsaved changes
    if (hasUnsavedChanges) {
      const confirm = window.confirm('لديك تغييرات غير محفوظة. هل تريد المتابعة؟');
      if (!confirm) return;
    }

    setSelectedTemplate(templateType);
    const template = await TemplateService.getTemplate(templateType);
    setEditingTemplate(template);
    setHasUnsavedChanges(false);
    
    // Validate the template
    const validationResult = TemplateService.validateTemplate(templateType, template);
    setValidation(validationResult);
  };

  // Handle template text change
  const handleTemplateChange = (newText: string) => {
    setEditingTemplate(newText);
    setHasUnsavedChanges(true);
    
    // Validate on change
    if (selectedTemplate) {
      const validationResult = TemplateService.validateTemplate(selectedTemplate, newText);
      setValidation(validationResult);
    }
  };

  // Handle variable insertion
  const handleInsertVariable = (variable: string) => {
    // Variable is already inserted by TemplateEditor
    // Just mark as changed
    setHasUnsavedChanges(true);
  };

  // Save template
  const handleSave = async () => {
    if (!selectedTemplate) return;
    
    setIsSaving(true);
    
    // Validate before saving
    const validationResult = TemplateService.validateTemplate(selectedTemplate, editingTemplate);
    setValidation(validationResult);
    
    if (!validationResult.valid) {
      setIsSaving(false);
      // Show validation errors - already displayed in TemplateEditor
      return;
    }
    
    // Save the template
    await TemplateService.saveTemplate(selectedTemplate, editingTemplate);
    setHasUnsavedChanges(false);
    
    // Reload templates to update the list
    await loadTemplates();
    
    setIsSaving(false);
    
    // Show success feedback
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Reset template
  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    if (!selectedTemplate) return;
    
    setIsResetting(true);
    
    // Reset to default
    await TemplateService.resetTemplate(selectedTemplate);
    
    // Reload the template
    const template = await TemplateService.getTemplate(selectedTemplate);
    setEditingTemplate(template);
    setHasUnsavedChanges(false);
    
    // Validate the default template
    const validationResult = TemplateService.validateTemplate(selectedTemplate, template);
    setValidation(validationResult);
    
    // Reload templates list
    await loadTemplates();
    
    setIsResetting(false);
    setShowResetConfirm(false);
  };

  // Export templates
  const handleExport = async () => {
    setIsExporting(true);
    
    const json = await TemplateService.exportTemplates();
    
    // Create downloadable file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `notification-templates-${timestamp}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setIsExporting(false);
    
    // Show success feedback
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  // Import templates
  const handleImportClick = () => {
    setShowImportModal(true);
    setImportFile(null);
    setImportErrors([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const file = files?.[0];
    if (file) {
      setImportFile(file);
      setImportErrors([]);
    }
  };

  const confirmImport = async () => {
    if (!importFile) return;
    
    setIsImporting(true);
    
    try {
      const text = await importFile.text();
      
      const result = await TemplateService.importTemplates(text);
      
      if (result.success) {
        // Reload templates
        await loadTemplates();
        
        // If current template was updated, reload it
        if (selectedTemplate) {
          const template = await TemplateService.getTemplate(selectedTemplate);
          setEditingTemplate(template);
          setHasUnsavedChanges(false);
          
          const validationResult = TemplateService.validateTemplate(selectedTemplate, template);
          setValidation(validationResult);
        }
        
        setIsImporting(false);
        
        // Show success message
        alert(`تم استيراد ${result.imported} قالب بنجاح`);
        setShowImportModal(false);
      } else {
        setIsImporting(false);
        // Show errors
        setImportErrors(result.errors);
      }
    } catch (error) {
      setIsImporting(false);
      setImportErrors(['خطأ في قراءة الملف']);
    }
  };

  // Filter templates by search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return templates;
    }
    
    const query = searchQuery.toLowerCase();
    return templates.filter(template => 
      template.name.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const groups: Record<'task' | 'comment' | 'status', NotificationTemplate[]> = {
      task: [],
      comment: [],
      status: []
    };
    
    filteredTemplates.forEach(template => {
      groups[template.category].push(template);
    });
    
    return groups;
  }, [filteredTemplates]);

  // Get current template metadata
  const currentTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplate);
  }, [templates, selectedTemplate]);

  // Get available variables for current template
  const availableVariables = useMemo(() => {
    if (!selectedTemplate) return [];
    return TemplateService.getAvailableVariables(selectedTemplate);
  }, [selectedTemplate]);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Skip to content link for accessibility */}
      <a href="#main-content" className="skip-to-content">
        الانتقال إلى المحتوى الرئيسي
      </a>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <i className="fa-solid fa-bell text-brand-600" aria-hidden="true"></i>
          قوالب الإشعارات
        </h1>
        <p className="text-slate-500 mt-1">تخصيص نصوص الإشعارات المرسلة عبر واتساب</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-6 no-print" role="toolbar" aria-label="أدوات إدارة القوالب">
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges || !selectedTemplate || (validation && !validation.valid) || isSaving}
          className={`bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md ${isSaving ? 'loading' : ''}`}
          aria-label="حفظ التغييرات"
        >
          {!isSaving && <i className="fa-solid fa-save" aria-hidden="true"></i>}
          حفظ التغييرات
        </button>
        
        <button
          onClick={handleResetClick}
          disabled={!selectedTemplate || isResetting}
          className={`bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-sm ${isResetting ? 'loading' : ''}`}
          aria-label="إعادة تعيين القالب للإعدادات الافتراضية"
        >
          {!isResetting && <i className="fa-solid fa-rotate-left" aria-hidden="true"></i>}
          إعادة تعيين
        </button>
        
        <div className="flex-1"></div>
        
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center gap-2 border border-blue-200 transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isExporting ? 'loading' : ''}`}
          aria-label="تصدير القوالب"
        >
          {!isExporting && <i className="fa-solid fa-download" aria-hidden="true"></i>}
          تصدير
        </button>
        
        <button
          onClick={handleImportClick}
          disabled={isImporting}
          className={`bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-100 flex items-center gap-2 border border-green-200 transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isImporting ? 'loading' : ''}`}
          aria-label="استيراد القوالب"
        >
          {!isImporting && <i className="fa-solid fa-upload" aria-hidden="true"></i>}
          استيراد
        </button>
      </div>

      {/* Success feedback */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2"
          >
            <i className="fa-solid fa-circle-check text-green-600"></i>
            <span className="text-sm text-green-700">تم حفظ القالب بنجاح</span>
          </motion.div>
        )}
        
        {exportSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-2"
          >
            <i className="fa-solid fa-circle-check text-blue-600"></i>
            <span className="text-sm text-blue-700">تم تصدير القوالب بنجاح</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="main-content" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar - Templates list */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-4 card-hover">
            {/* Search bar */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <label htmlFor="template-search" className="sr-only">بحث في القوالب</label>
                <i className="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true"></i>
                <input
                  id="template-search"
                  type="text"
                  placeholder="بحث في القوالب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all duration-200"
                  aria-label="بحث في القوالب"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200"
                    aria-label="مسح البحث"
                  >
                    <i className="fa-solid fa-times text-xs" aria-hidden="true"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Templates list by category */}
            <div className="max-h-[600px] overflow-y-auto template-editor-scroll" role="navigation" aria-label="قائمة القوالب">
              {filteredTemplates.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-8 text-center text-slate-500 text-sm"
                >
                  <i className="fa-solid fa-search text-2xl mb-2 text-slate-300" aria-hidden="true"></i>
                  <p>لا توجد نتائج</p>
                </motion.div>
              ) : (
                (Object.entries(groupedTemplates) as [string, NotificationTemplate[]][]).map(([category, categoryTemplates]) => {
                  if (categoryTemplates.length === 0) return null;
                  
                  const categoryInfo = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS];
                  
                  return (
                    <div key={category} className="border-b border-slate-100 last:border-b-0">
                      <div className="px-4 py-2 bg-slate-50 flex items-center gap-2">
                        <i className={`${categoryInfo.icon} ${categoryInfo.color} text-sm`}></i>
                        <span className="text-xs font-semibold text-slate-600">{categoryInfo.label}</span>
                      </div>
                      
                      {categoryTemplates.map((template, index) => (
                        <motion.button
                          key={template.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => selectTemplate(template.id)}
                          className={`w-full text-right p-3 hover:bg-slate-50 transition-all duration-200 border-r-4 ${
                            selectedTemplate === template.id
                              ? 'bg-brand-50 border-brand-600'
                              : 'border-transparent hover:border-slate-200'
                          }`}
                          aria-label={`اختيار قالب ${template.name}`}
                          aria-current={selectedTemplate === template.id ? 'true' : 'false'}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-slate-800 mb-0.5">
                                {template.name}
                              </h4>
                              <p className="text-xs text-slate-500 line-clamp-2">
                                {template.description}
                              </p>
                            </div>
                            {template.customTemplate && (
                              <span className="text-xs text-brand-600 flex-shrink-0 tooltip">
                                <i className="fa-solid fa-pen" aria-hidden="true"></i>
                                <span className="tooltip-text">تم التخصيص</span>
                              </span>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right content - Editor and Preview */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTemplate && currentTemplate ? (
            <>
              {/* Template details */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 card-hover"
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      {currentTemplate.name}
                      {hasUnsavedChanges && (
                        <span className="text-xs text-amber-600 font-normal flex items-center gap-1">
                          <i className="fa-solid fa-circle text-[6px]" aria-hidden="true"></i>
                          غير محفوظ
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">{currentTemplate.description}</p>
                  </div>
                  {currentTemplate.customTemplate && (
                    <span className="bg-brand-100 text-brand-700 text-xs px-3 py-1 rounded-full border border-brand-200 flex items-center gap-1 flex-shrink-0">
                      <i className="fa-solid fa-pen text-[10px]" aria-hidden="true"></i>
                      مخصص
                    </span>
                  )}
                </div>

                {/* Editor */}
                <TemplateEditor
                  value={editingTemplate}
                  onChange={handleTemplateChange}
                  variables={availableVariables}
                  onInsertVariable={handleInsertVariable}
                  validation={validation}
                  isLoading={isSaving || isResetting}
                />
              </motion.div>

              {/* Preview */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 card-hover"
              >
                <TemplatePreview
                  template={editingTemplate}
                  type={selectedTemplate}
                  isLoading={isSaving || isResetting}
                />
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-2xl">
                <i className="fa-solid fa-file-lines" aria-hidden="true"></i>
              </div>
              <p className="text-slate-500">اختر قالباً من القائمة للبدء في التعديل</p>
              <p className="text-xs text-slate-400 mt-2">يمكنك استخدام البحث للعثور على القالب المطلوب</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 text-2xl">
                  <i className="fa-solid fa-rotate-left" aria-hidden="true"></i>
                </div>
                <h3 id="reset-modal-title" className="text-lg font-bold text-slate-800 mb-2">إعادة تعيين القالب</h3>
                <p className="text-sm text-slate-500">
                  هل أنت متأكد من إعادة تعيين هذا القالب للإعدادات الافتراضية؟
                  <br />
                  سيتم فقدان التخصيصات الحالية.
                </p>
              </div>
              <div className="flex border-t border-slate-100 bg-slate-50 p-4 gap-3 justify-center">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isResetting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="إلغاء إعادة التعيين"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmReset}
                  disabled={isResetting}
                  className={`px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isResetting ? 'loading' : ''}`}
                  aria-label="تأكيد إعادة التعيين"
                >
                  {!isResetting && 'إعادة تعيين'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 border-b border-slate-100">
                <h3 id="import-modal-title" className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-upload text-green-600" aria-hidden="true"></i>
                  استيراد القوالب
                </h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={isImporting}
                  className="text-slate-400 hover:text-slate-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="إغلاق"
                >
                  <i className="fa-solid fa-times" aria-hidden="true"></i>
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="import-file" className="block text-sm font-medium text-slate-700 mb-2">
                    اختر ملف JSON
                  </label>
                  <input
                    id="import-file"
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    disabled={isImporting}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 file:transition-all file:duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-describedby="import-help"
                  />
                </div>

                {importFile && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-2"
                  >
                    <i className="fa-solid fa-file-code text-slate-400" aria-hidden="true"></i>
                    <span className="text-sm text-slate-700 flex-1 truncate">{importFile.name}</span>
                    <span className="text-xs text-slate-500">{(importFile.size / 1024).toFixed(1)} KB</span>
                  </motion.div>
                )}

                {importErrors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-lg p-3"
                    role="alert"
                  >
                    <p className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                      <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                      أخطاء الاستيراد:
                    </p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {importErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                <div id="import-help" className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800 flex items-start gap-2">
                    <i className="fa-solid fa-info-circle mt-0.5" aria-hidden="true"></i>
                    <span>سيتم استبدال القوالب المخصصة الحالية بالقوالب المستوردة</span>
                  </p>
                </div>
              </div>

              <div className="flex border-t border-slate-100 bg-slate-50 p-4 gap-3 justify-end">
                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={isImporting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="إلغاء الاستيراد"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmImport}
                  disabled={!importFile || isImporting}
                  className={`px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isImporting ? 'loading' : ''}`}
                  aria-label="تأكيد الاستيراد"
                >
                  {!isImporting && 'استيراد'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
