import React, { useRef, useEffect, useState } from 'react';
import { TemplateVariable, ValidationResult } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  variables: TemplateVariable[];
  onInsertVariable: (variable: string) => void;
  validation?: ValidationResult;
  isLoading?: boolean;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  value,
  onChange,
  variables,
  onInsertVariable,
  validation,
  isLoading = false
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);

  // Track cursor position
  const handleSelectionChange = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  };

  // Insert variable at cursor position
  const insertVariable = (variableKey: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = value.substring(0, start);
    const textAfter = value.substring(end);
    const variableText = `{${variableKey}}`;
    
    const newValue = textBefore + variableText + textAfter;
    onChange(newValue);

    // Set cursor position after the inserted variable
    const newCursorPos = start + variableText.length;
    
    // Focus and set cursor position after React updates
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      setCursorPosition(newCursorPos);
    }, 0);

    // Call the parent handler
    onInsertVariable(variableKey);
  };

  // Highlight placeholders in the text
  const highlightedText = React.useMemo(() => {
    if (!value) return '';
    
    // Replace placeholders with highlighted spans
    // Valid placeholders: {variableName}
    const highlighted = value.replace(/\{(\w+)\}/g, (match, variableName) => {
      // Check if this is a known variable
      const isKnown = variables.some(v => v.key === variableName);
      const isInvalid = validation?.warnings.some(w => w.includes(`{${variableName}}`));
      
      if (isInvalid) {
        return `<span class="text-amber-600 font-semibold">${match}</span>`;
      } else if (isKnown) {
        return `<span class="text-brand-600 font-semibold">${match}</span>`;
      } else {
        return match;
      }
    });

    // Highlight invalid syntax
    let result = highlighted;
    if (validation?.errors) {
      validation.errors.forEach(error => {
        // Extract the invalid placeholder from error message
        const match = error.match(/صيغة متغير غير صحيحة: (.+)/);
        if (match) {
          const invalidPlaceholder = match[1];
          // Escape special regex characters
          const escaped = invalidPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          result = result.replace(new RegExp(escaped, 'g'), 
            `<span class="text-red-600 font-semibold bg-red-50">${invalidPlaceholder}</span>`);
        }
      });
    }

    return result;
  }, [value, variables, validation]);

  // Character count
  const characterCount = value.length;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Editor container with syntax highlighting */}
      <div className="relative">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <div className="spinner border-brand-600"></div>
          </div>
        )}
        
        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onSelect={handleSelectionChange}
          onClick={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          disabled={isLoading}
          className="relative w-full min-h-[200px] p-3 font-mono text-sm leading-relaxed border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-y bg-transparent template-editor-scroll transition-all duration-200 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ direction: 'rtl' }}
          placeholder="اكتب القالب هنا..."
          aria-label="محرر القالب"
          aria-describedby="character-count validation-feedback"
        />
      </div>

      {/* Character count */}
      <div id="character-count" className="flex items-center justify-between text-xs text-slate-500" role="status" aria-live="polite">
        <span>عدد الأحرف: {characterCount}</span>
        {characterCount > 1000 && (
          <span className="text-amber-600 flex items-center gap-1">
            <i className="fa-solid fa-triangle-exclamation"></i>
            رسالة طويلة
          </span>
        )}
      </div>

      {/* Validation feedback */}
      <AnimatePresence mode="wait">
        {validation && (
          <motion.div
            id="validation-feedback"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
            role="alert"
            aria-live="assertive"
          >
            {/* Errors */}
            {validation.errors.length > 0 && (
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-red-50 border border-red-200 rounded-lg p-3 validation-error"
              >
                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-circle-exclamation text-red-600 mt-0.5" aria-hidden="true"></i>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 mb-1">أخطاء:</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-amber-50 border border-amber-200 rounded-lg p-3"
              >
                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-amber-600 mt-0.5" aria-hidden="true"></i>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 mb-1">تحذيرات:</p>
                    <ul className="text-sm text-amber-700 space-y-1">
                      {validation.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Success */}
            {validation.valid && validation.errors.length === 0 && validation.warnings.length === 0 && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-green-50 border border-green-200 rounded-lg p-3 validation-success"
              >
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-green-600" aria-hidden="true"></i>
                  <p className="text-sm text-green-700">القالب صحيح ✓</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available variables panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-50 border border-slate-200 rounded-lg p-4"
      >
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <i className="fa-solid fa-code text-brand-600" aria-hidden="true"></i>
          المتغيرات المتاحة:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list" aria-label="قائمة المتغيرات المتاحة">
          {variables.map((variable) => (
            <div key={variable.key} className="tooltip" role="listitem">
              <button
                onClick={() => insertVariable(variable.key)}
                disabled={isLoading}
                className="w-full flex items-start gap-2 p-2 text-right bg-white border border-slate-200 rounded hover:border-brand-400 hover:bg-brand-50 transition-all duration-200 group variable-button hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`إدراج متغير ${variable.key}: ${variable.description}`}
              >
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-center gap-1">
                    <code className="text-xs font-mono text-brand-600 font-semibold">
                      {`{${variable.key}}`}
                    </code>
                    {variable.required && (
                      <span className="text-xs text-red-500" aria-label="مطلوب">*</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{variable.description}</p>
                </div>
                <i className="fa-solid fa-plus text-xs text-slate-400 group-hover:text-brand-600 mt-1 transition-all duration-200 group-hover:scale-110 relative z-10" aria-hidden="true"></i>
              </button>
              <span className="tooltip-text">
                مثال: {variable.example}
              </span>
            </div>
          ))}
        </div>
        
        {/* Helper text */}
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-500 flex items-start gap-2">
            <i className="fa-solid fa-lightbulb text-amber-500 mt-0.5" aria-hidden="true"></i>
            <span>انقر على أي متغير لإدراجه في موضع المؤشر، أو مرر الماوس لرؤية مثال</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
