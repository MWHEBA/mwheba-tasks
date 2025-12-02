import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage, NetworkError, PermissionError, NotFoundError } from '../../components/ErrorMessage';

describe('ErrorMessage', () => {
  it('renders error message', () => {
    render(<ErrorMessage message="خطأ في التحميل" />);

    expect(screen.getByText('خطأ في التحميل')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(<ErrorMessage message="رسالة" title="عنوان الخطأ" />);

    expect(screen.getByText('عنوان الخطأ')).toBeInTheDocument();
    expect(screen.getByText('رسالة')).toBeInTheDocument();
  });

  it('renders error variant by default', () => {
    const { container } = render(<ErrorMessage message="خطأ" />);

    expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
  });

  it('renders warning variant', () => {
    const { container } = render(<ErrorMessage message="تحذير" variant="warning" />);

    expect(container.querySelector('.bg-orange-50')).toBeInTheDocument();
  });

  it('renders info variant', () => {
    const { container } = render(<ErrorMessage message="معلومة" variant="info" />);

    expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
  });

  it('shows retry button when onRetry provided', () => {
    const mockRetry = vi.fn();
    render(<ErrorMessage message="خطأ" onRetry={mockRetry} />);

    const retryButton = screen.getByText('إعادة المحاولة');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('shows dismiss button when onDismiss provided', () => {
    const mockDismiss = vi.fn();
    render(<ErrorMessage message="خطأ" onDismiss={mockDismiss} />);

    const dismissButton = screen.getByLabelText('إغلاق');
    expect(dismissButton).toBeInTheDocument();

    fireEvent.click(dismissButton);
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility role', () => {
    render(<ErrorMessage message="خطأ" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ErrorMessage message="خطأ" className="custom-class" />);

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('NetworkError', () => {
  it('renders network error message', () => {
    render(<NetworkError />);

    expect(screen.getByText('خطأ في الاتصال')).toBeInTheDocument();
    expect(screen.getByText(/تعذر الاتصال بالخادم/)).toBeInTheDocument();
  });

  it('shows retry button when provided', () => {
    const mockRetry = vi.fn();
    render(<NetworkError onRetry={mockRetry} />);

    const retryButton = screen.getByText('إعادة المحاولة');
    fireEvent.click(retryButton);

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});

describe('PermissionError', () => {
  it('renders permission error message', () => {
    render(<PermissionError />);

    expect(screen.getByText('غير مصرح')).toBeInTheDocument();
    expect(screen.getByText(/ليس لديك صلاحية/)).toBeInTheDocument();
  });
});

describe('NotFoundError', () => {
  it('renders not found error message', () => {
    render(<NotFoundError />);

    expect(screen.getByText('غير موجود')).toBeInTheDocument();
    expect(screen.getByText(/المحتوى المطلوب غير موجود/)).toBeInTheDocument();
  });
});
