import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../pages/Login';
import { useAuthContext } from '../../contexts/AuthContext';

// Mock useAuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuthContext: vi.fn(),
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

describe('Login Page', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthContext).mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
      user: null,
      logout: vi.fn(),
    });
  });

  it('renders login form correctly', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: 'تسجيل الدخول' })).toBeInTheDocument();
    expect(screen.getByLabelText('اسم المستخدم')).toBeInTheDocument();
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تسجيل الدخول/i })).toBeInTheDocument();
  });

  it('displays logo', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const logo = screen.getByAltText('MWHEBA Creative Agency');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/Logo.png');
  });

  it('handles input changes', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText('اسم المستخدم') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('كلمة المرور') as HTMLInputElement;

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(usernameInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('password123');
  });

  it('submits form with correct credentials', async () => {
    mockLogin.mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText('اسم المستخدم');
    const passwordInput = screen.getByLabelText('كلمة المرور');
    const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('displays error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('بيانات الدخول غير صحيحة'));

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText('اسم المستخدم');
    const passwordInput = screen.getByLabelText('كلمة المرور');
    const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });

    fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('بيانات الدخول غير صحيحة')).toBeInTheDocument();
    });
  });

  it('disables form during loading', () => {
    vi.mocked(useAuthContext).mockReturnValue({
      login: mockLogin,
      loading: true,
      error: null,
      user: null,
      logout: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText('اسم المستخدم');
    const passwordInput = screen.getByLabelText('كلمة المرور');
    const submitButton = screen.getByRole('button');

    expect(usernameInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('جاري تسجيل الدخول...')).toBeInTheDocument();
  });

  it('displays footer with current year', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
  });

  it('has proper input attributes for accessibility', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText('اسم المستخدم');
    const passwordInput = screen.getByLabelText('كلمة المرور');

    expect(usernameInput).toHaveAttribute('type', 'text');
    expect(usernameInput).toHaveAttribute('autoComplete', 'username');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
  });
});
