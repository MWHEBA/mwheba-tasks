import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '../../contexts/AuthContext';
import { AuthService } from '../../services/authService';

// Mock AuthService
vi.mock('../../services/authService', () => ({
  AuthService: {
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
    getStoredUser: vi.fn(),
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with stored user', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'designer' as const,
      is_staff: false,
      is_active: true,
      date_joined: '2025-01-01',
    };

    vi.mocked(AuthService.getStoredUser).mockReturnValue(mockUser);

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('initializes with no user when storage is empty', () => {
    vi.mocked(AuthService.getStoredUser).mockReturnValue(null);

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles successful login', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'designer' as const,
      is_staff: false,
      is_active: true,
      date_joined: '2025-01-01',
    };

    vi.mocked(AuthService.getStoredUser).mockReturnValue(null);
    vi.mocked(AuthService.login).mockResolvedValue({
      access: 'token',
      refresh: 'refresh',
      user: mockUser,
    });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.login({ username: 'testuser', password: 'password' });
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('handles login failure', async () => {
    vi.mocked(AuthService.getStoredUser).mockReturnValue(null);
    vi.mocked(AuthService.login).mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      try {
        await result.current.login({ username: 'wrong', password: 'wrong' });
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('handles logout', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'designer' as const,
      is_staff: false,
      is_active: true,
      date_joined: '2025-01-01',
    };

    vi.mocked(AuthService.getStoredUser).mockReturnValue(mockUser);
    vi.mocked(AuthService.logout).mockResolvedValue();

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears user even if logout API fails', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'designer' as const,
      is_staff: false,
      is_active: true,
      date_joined: '2025-01-01',
    };

    vi.mocked(AuthService.getStoredUser).mockReturnValue(mockUser);
    vi.mocked(AuthService.logout).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });

  it('handles token refresh', async () => {
    vi.mocked(AuthService.getStoredUser).mockReturnValue(null);
    vi.mocked(AuthService.refreshToken).mockResolvedValue('new_token');

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(AuthService.refreshToken).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('logs out user when token refresh fails', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'designer' as const,
      is_staff: false,
      is_active: true,
      date_joined: '2025-01-01',
    };

    vi.mocked(AuthService.getStoredUser).mockReturnValue(mockUser);
    vi.mocked(AuthService.refreshToken).mockRejectedValue(new Error('Token expired'));

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      try {
        await result.current.refreshToken();
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.user).toBeNull();
  });

  it('handles user refresh', async () => {
    const initialUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'designer' as const,
      is_staff: false,
      is_active: true,
      date_joined: '2025-01-01',
    };

    const updatedUser = {
      ...initialUser,
      first_name: 'Updated',
      last_name: 'Name',
    };

    vi.mocked(AuthService.getStoredUser).mockReturnValue(initialUser);
    vi.mocked(AuthService.getCurrentUser).mockResolvedValue(updatedUser);

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toEqual(updatedUser);
  });

  it('sets loading state during operations', async () => {
    vi.mocked(AuthService.getStoredUser).mockReturnValue(null);
    vi.mocked(AuthService.login).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    expect(result.current.loading).toBe(false);

    act(() => {
      result.current.login({ username: 'test', password: 'test' });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useAuthContext());
    }).toThrow('useAuthContext must be used within an AuthProvider');
  });
});
