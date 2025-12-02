import React from 'react';

interface ErrorMessageProps {
  message: string;
  title?: string;
  variant?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  title,
  variant = 'error',
  onRetry,
  onDismiss,
  className = '',
}) => {
  const variantStyles = {
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'fa-circle-exclamation text-red-500',
      title: 'text-red-900',
      message: 'text-red-700',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      container: 'bg-orange-50 border-orange-200',
      icon: 'fa-triangle-exclamation text-orange-500',
      title: 'text-orange-900',
      message: 'text-orange-700',
      button: 'bg-orange-600 hover:bg-orange-700 text-white',
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'fa-circle-info text-blue-500',
      title: 'text-blue-900',
      message: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={`border rounded-lg p-4 ${styles.container} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <i className={`fa-solid ${styles.icon} text-lg`}></i>
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`font-semibold mb-1 ${styles.title}`}>
              {title}
            </h3>
          )}
          <p className={`text-sm ${styles.message}`}>
            {message}
          </p>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${styles.button}`}
            >
              <i className="fa-solid fa-rotate-right ml-1 text-xs"></i>
              إعادة المحاولة
            </button>
          )}
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              aria-label="إغلاق"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Preset error messages for common scenarios
export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <ErrorMessage
      variant="error"
      title="خطأ في الاتصال"
      message="تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى."
      onRetry={onRetry}
    />
  );
};

export const PermissionError: React.FC = () => {
  return (
    <ErrorMessage
      variant="warning"
      title="غير مصرح"
      message="ليس لديك صلاحية للوصول إلى هذا المحتوى."
    />
  );
};

export const NotFoundError: React.FC = () => {
  return (
    <ErrorMessage
      variant="info"
      title="غير موجود"
      message="المحتوى المطلوب غير موجود أو تم حذفه."
    />
  );
};
