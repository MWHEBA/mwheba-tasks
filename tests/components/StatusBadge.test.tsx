import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StatusBadge } from '../../components/StatusBadge';
import { StatusService } from '../../services/statusService';

vi.mock('../../services/statusService', () => ({
  StatusService: {
    getById: vi.fn(),
    getThemeStyles: vi.fn(),
  },
}));

describe('StatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    vi.mocked(StatusService.getById).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<StatusBadge status="Pending" />);
    
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('renders status badge with correct data', async () => {
    const mockStatus = {
      id: 'Pending',
      label: 'قيد الانتظار',
      color: 'slate' as const,
      icon: 'fa-clock',
      orderIndex: 0,
      isFinished: false,
    };

    vi.mocked(StatusService.getById).mockResolvedValueOnce(mockStatus);
    vi.mocked(StatusService.getThemeStyles).mockReturnValue('bg-slate-50 text-slate-600');

    render(<StatusBadge status="Pending" />);

    await waitFor(() => {
      expect(screen.getByText('قيد الانتظار')).toBeInTheDocument();
    });
  });

  it('renders small size variant', async () => {
    const mockStatus = {
      id: 'Pending',
      label: 'قيد الانتظار',
      color: 'slate' as const,
      icon: 'fa-clock',
      orderIndex: 0,
      isFinished: false,
    };

    vi.mocked(StatusService.getById).mockResolvedValueOnce(mockStatus);
    vi.mocked(StatusService.getThemeStyles).mockReturnValue('bg-slate-50');

    const { container } = render(<StatusBadge status="Pending" size="small" />);

    await waitFor(() => {
      const badge = container.querySelector('.text-\\[9px\\]');
      expect(badge).toBeInTheDocument();
    });
  });

  it('shows fallback for unknown status', async () => {
    vi.mocked(StatusService.getById).mockResolvedValueOnce(undefined);

    render(<StatusBadge status="Unknown" />);

    await waitFor(() => {
      expect(screen.getByText('غير معروف')).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', async () => {
    const mockStatus = {
      id: 'Pending',
      label: 'قيد الانتظار',
      color: 'slate' as const,
      icon: 'fa-clock',
      orderIndex: 0,
      isFinished: false,
    };

    vi.mocked(StatusService.getById).mockResolvedValueOnce(mockStatus);
    vi.mocked(StatusService.getThemeStyles).mockReturnValue('bg-slate-50');

    render(<StatusBadge status="Pending" />);

    await waitFor(() => {
      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'الحالة: قيد الانتظار');
    });
  });
});
