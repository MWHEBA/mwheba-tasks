import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onRetry }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-triangle-exclamation text-red-600 text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            عذراً، حدث خطأ غير متوقع
          </h1>
          <p className="text-slate-600">
            نعتذر عن الإزعاج. حدث خطأ أثناء تحميل هذه الصفحة.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-slate-50 rounded-md text-right">
            <p className="text-sm text-slate-700 font-mono break-words">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors font-medium"
          >
            <i className="fa-solid fa-rotate-right ml-2"></i>
            إعادة المحاولة
          </button>
          <Link
            to="/"
            className="px-6 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors font-medium"
          >
            <i className="fa-solid fa-house ml-2"></i>
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
