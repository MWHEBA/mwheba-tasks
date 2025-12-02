import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../../components/ConfirmDialog';

describe('ConfirmDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="تأكيد الحذف"
        message="هل أنت متأكد؟"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('تأكيد الحذف')).toBeInTheDocument();
    expect(screen.getByText('هل أنت متأكد؟')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        title="تأكيد الحذف"
        message="هل أنت متأكد؟"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('تأكيد الحذف')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="تأكيد"
        message="رسالة"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const buttons = screen.getAllByText('تأكيد');
    const confirmButton = buttons[1]; // Second one is the button

    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="تأكيد"
        message="رسالة"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('إلغاء'));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('renders custom button text', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="تأكيد"
        message="رسالة"
        confirmText="موافق"
        cancelText="رجوع"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('موافق')).toBeInTheDocument();
    expect(screen.getByText('رجوع')).toBeInTheDocument();
  });

  it('renders danger type with correct styling', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        title="حذف"
        message="رسالة"
        type="danger"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByText('تأكيد');
    expect(confirmButton).toHaveClass('bg-red-600');
  });

  it('renders warning type with correct styling', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        title="تحذير"
        message="رسالة"
        type="warning"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByText('تأكيد');
    expect(confirmButton).toHaveClass('bg-yellow-600');
  });

  it('renders info type with correct styling', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        title="معلومة"
        message="رسالة"
        type="info"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByText('تأكيد');
    expect(confirmButton).toHaveClass('bg-blue-600');
  });

  it('has proper accessibility attributes', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="تأكيد"
        message="رسالة"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('closes when clicking backdrop', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="تأكيد"
        message="رسالة"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
