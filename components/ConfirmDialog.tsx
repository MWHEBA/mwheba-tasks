import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  onConfirm,
  onCancel,
  type = 'danger'
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const iconConfig = {
    danger: { icon: 'fa-solid fa-trash', color: 'text-red-600', bgColor: 'bg-red-50' },
    warning: { icon: 'fa-solid fa-exclamation-triangle', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    info: { icon: 'fa-solid fa-info-circle', color: 'text-blue-600', bgColor: 'bg-blue-50' }
  };

  const config = iconConfig[type];

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onCancel();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center`}>
                  <i className={`${config.icon} ${config.color} text-xl`}></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                  <p className="text-sm text-slate-600">{message}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-slate-50 border-t border-slate-100 justify-end">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  type === 'danger' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : type === 'warning'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin ml-2"></i>
                    جاري الحذف...
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
