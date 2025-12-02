import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { AuthService } from '../../services/authService';

// Mock AuthService
vi.mock('../../services/authService', () => ({
  AuthService: {
    getStoredUser: vi.fn(),
    logout: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children correctly', () => {
    vi.mocked(AuthService.getStoredUser).mockReturnValue({
      id: 1,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      role: 'designer',
    });

    render(
      <BrowserRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('displays navigation links', () => {
    vi.mocked(AuthService.getStoredUser).mockReturnValue({
      id: 1,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      role: 'designer',
    });

    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    );

    expect(screen.getByText('لوحة المهام')).toBeInTheDocument();
    expect(screen.getByText('العملاء')).toBeInTheDocument();
    expect(screen.getByText('الأصناف')).toBeInTheDocument();
    expect(screen.getByText('مهمة جديدة')).toBeInTheDocument();
  });

  it('displays user info when logged in', () => {
    vi.mocked(AuthService.getStoredUser).mockReturnValue({
      id: 1,
      username: 'testuser',
      first_name: 'أحمد',
      last_name: 'محمد',
      role: 'designer',
    });

    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    );

    expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
  });

  it('opens user menu on button click', async () => {
    vi.mocked(AuthService.getStoredUser).mockReturnValue({
      id: 1,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      role: 'admin',
    });

    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    );

    const userButton = screen.getByRole('button', { name: /Test User/i });
    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.getByText('إدارة المستخدمين')).toBeInTheDocument();
      expect(screen.getByText('إدارة الحالات')).toBeInTheDocument();
      expect(screen.getByText('تسجيل الخروج')).toBeInTheDocument();
    });
  });

  it('shows admin menu items only for admin users', async () => {
    vi.mocked(AuthService.getStoredUser).mockReturnValue({
      id: 1,
      username: 'admin',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
    });

    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    );

    const userButton = screen.getByRole('button', { name: /Admin User/i });
    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.getByText('إدارة المستخدمين')).toBeInTheDocument();
      expect(screen.getByText('إدارة الحالات')).toBeInTheDocument();
    });
  });

  it('handles logout correctly', async () => {
    vi.mocked(AuthService.getStoredUser).mockReturnValue({
      id: 1,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      role: 'designer',
    });
    vi.mocked(AuthService.logout).mockResolvedValue();

    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    );

    const userButton = screen.getByRole('button', { name: /Test User/i });
    fireEvent.click(userButton);

    await waitFor(() => {
      const logoutButton = screen.getByText('تسجيل الخروج');
      fireEvent.click(logoutButton);
    });

    await waitFor(() => {
      expect(AuthService.logout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('displays footer with current year', () => {
    vi.mocked(AuthService.getStoredUser).mockReturnValue({
      id: 1,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      role: 'designer',
    });

    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    );

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
  });
});
