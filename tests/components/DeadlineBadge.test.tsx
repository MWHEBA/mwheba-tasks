import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeadlineBadge } from '../../components/DeadlineBadge';

// Mock dateUtils
vi.mock('../../utils/dateUtils', () => ({
  formatRelativeDate: vi.fn((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-EG');
  }),
}));

describe('DeadlineBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders deadline badge', () => {
    const futureDate = Date.now() + 86400000 * 3; // 3 days from now
    render(<DeadlineBadge deadline={futureDate} isFinished={false} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows safe styling for deadline more than 48 hours away', () => {
    const futureDate = Date.now() + 86400000 * 3; // 3 days
    const { container } = render(<DeadlineBadge deadline={futureDate} isFinished={false} />);

    expect(container.querySelector('.bg-emerald-50')).toBeInTheDocument();
  });

  it('shows warning styling for deadline less than 48 hours', () => {
    const futureDate = Date.now() + 86400000 * 1.5; // 36 hours
    const { container } = render(<DeadlineBadge deadline={futureDate} isFinished={false} />);

    expect(container.querySelector('.bg-amber-50')).toBeInTheDocument();
  });

  it('shows urgent styling for deadline less than 24 hours', () => {
    const futureDate = Date.now() + 3600000 * 12; // 12 hours
    const { container } = render(<DeadlineBadge deadline={futureDate} isFinished={false} />);

    expect(container.querySelector('.bg-orange-50')).toBeInTheDocument();
  });

  it('shows overdue styling for past deadline', () => {
    const pastDate = Date.now() - 86400000; // 1 day ago
    const { container } = render(<DeadlineBadge deadline={pastDate} isFinished={false} />);

    expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
  });

  it('shows safe styling when task is finished', () => {
    const pastDate = Date.now() - 86400000; // 1 day ago
    const { container } = render(<DeadlineBadge deadline={pastDate} isFinished={true} />);

    expect(container.querySelector('.bg-emerald-50')).toBeInTheDocument();
  });

  it('renders small size variant', () => {
    const futureDate = Date.now() + 86400000;
    const { container } = render(<DeadlineBadge deadline={futureDate} isFinished={false} size="small" />);

    expect(container.querySelector('.text-\\[9px\\]')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    const futureDate = Date.now() + 86400000;
    render(<DeadlineBadge deadline={futureDate} isFinished={false} />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label');
  });
});
