import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingOverlay } from '../../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders spinner with default size', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'جاري التحميل');
  });

  it('renders with custom text', () => {
    render(<LoadingSpinner text="جاري التحميل..." />);
    
    expect(screen.getByText('جاري التحميل...')).toBeInTheDocument();
  });

  it('renders small size', () => {
    const { container } = render(<LoadingSpinner size="small" />);
    
    const spinner = container.querySelector('.w-4');
    expect(spinner).toBeInTheDocument();
  });

  it('renders large size', () => {
    const { container } = render(<LoadingSpinner size="large" />);
    
    const spinner = container.querySelector('.w-12');
    expect(spinner).toBeInTheDocument();
  });

  it('renders fullscreen mode', () => {
    const { container } = render(<LoadingSpinner fullScreen />);
    
    const fullscreenDiv = container.querySelector('.fixed.inset-0');
    expect(fullscreenDiv).toBeInTheDocument();
  });
});

describe('LoadingOverlay', () => {
  it('renders overlay', () => {
    const { container } = render(<LoadingOverlay />);
    
    const overlay = container.querySelector('.absolute.inset-0');
    expect(overlay).toBeInTheDocument();
  });

  it('renders with text', () => {
    render(<LoadingOverlay text="جاري الحفظ..." />);
    
    expect(screen.getByText('جاري الحفظ...')).toBeInTheDocument();
  });
});
