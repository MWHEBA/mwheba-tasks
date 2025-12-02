import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { Urgency } from '../../types';

describe('UrgencyBadge', () => {
  it('renders urgent badge', () => {
    render(<UrgencyBadge level={Urgency.URGENT} />);

    expect(screen.getByText('عاجل')).toBeInTheDocument();
  });

  it('does not render for normal urgency', () => {
    const { container } = render(<UrgencyBadge level={Urgency.NORMAL} />);

    expect(container.firstChild).toBeNull();
  });

  it('does not render for critical urgency', () => {
    const { container } = render(<UrgencyBadge level={Urgency.CRITICAL} />);

    expect(container.firstChild).toBeNull();
  });

  it('has proper accessibility attributes', () => {
    render(<UrgencyBadge level={Urgency.URGENT} />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', 'مهمة عاجلة');
  });

  it('has correct styling for urgent', () => {
    const { container } = render(<UrgencyBadge level={Urgency.URGENT} />);

    const badge = container.querySelector('.bg-red-50');
    expect(badge).toBeInTheDocument();
  });
});
