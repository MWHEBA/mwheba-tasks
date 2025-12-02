import React, { useMemo } from 'react';
import { NotificationTemplateType } from '../types';
import { TemplateService } from '../services/templateService';
import { motion } from 'framer-motion';

interface TemplatePreviewProps {
  template: string;
  type: NotificationTemplateType;
  isLoading?: boolean;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, type, isLoading = false }) => {
  // Generate sample data for the preview based on template type
  const sampleData = useMemo(() => {
    const variables = TemplateService.getAvailableVariables(type);
    const data: Record<string, string> = {};
    
    // Use example values from available variables
    variables.forEach(variable => {
      data[variable.key] = variable.example;
    });
    
    return data;
  }, [type]);

  // Render the template with sample data
  const previewText = useMemo(() => {
    if (!template) return '';
    
    // Replace all placeholders with sample data
    const rendered = template.replace(/\{(\w+)\}/g, (match, variableName) => {
      // Use sample data if available, otherwise show the placeholder
      return sampleData[variableName] || match;
    });
    
    return rendered;
  }, [template, sampleData]);

  // Convert WhatsApp formatting to HTML
  // * for bold, _ for italic
  const formattedPreview = useMemo(() => {
    if (!previewText) return '';
    
    let formatted = previewText;
    
    // Convert *text* to bold
    // Match *text* but not ** (which would be empty bold)
    formatted = formatted.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    
    // Convert _text_ to italic
    // Match _text_ but not __ (which would be empty italic)
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Convert line breaks to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }, [previewText]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-4 relative overflow-hidden"
    >
      {/* Background pattern for WhatsApp feel */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} aria-hidden="true"></div>
      
      <div className="relative z-10">
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <i className="fa-brands fa-whatsapp text-green-600 text-lg" aria-hidden="true"></i>
          معاينة الرسالة
        </h4>
        
        {/* Loading state */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 min-h-[120px] flex items-center justify-center">
            <div className="text-center">
              <div className="spinner border-brand-600 mx-auto mb-2"></div>
              <p className="text-xs text-slate-500">جاري التحميل...</p>
            </div>
          </div>
        ) : (
          <>
            {/* WhatsApp-like message bubble */}
            <motion.div
              key={formattedPreview}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="whatsapp-message"
              role="article"
              aria-label="معاينة رسالة واتساب"
            >
              {formattedPreview ? (
                <>
                  <div 
                    className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words"
                    style={{ direction: 'rtl' }}
                    dangerouslySetInnerHTML={{ __html: formattedPreview }}
                  />
                  
                  {/* WhatsApp-like timestamp */}
                  <div className="flex items-center justify-end gap-1 mt-2 text-xs text-slate-400">
                    <span>{new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                    <i className="fa-solid fa-check-double text-blue-500" aria-label="تم التسليم" title="تم التسليم"></i>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <i className="fa-solid fa-message text-3xl mb-2 opacity-50" aria-hidden="true"></i>
                  <p className="text-sm">لا يوجد محتوى للمعاينة</p>
                </div>
              )}
            </motion.div>
            
            {/* Helper text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-3 pt-3 border-t border-slate-200"
            >
              <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-2">
                <i className="fa-solid fa-info-circle text-brand-500" aria-hidden="true"></i>
                <span>هذه معاينة توضح كيف ستظهر الرسالة في واتساب</span>
              </p>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
};
