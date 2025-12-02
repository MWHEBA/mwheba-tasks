import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../../services/authService';

// Mock apiCall
vi.mock('../../config/api', () => ({
  apiCall: vi.fn(),
  API_URL: 'http://localhost:8000/api',
}));

// Mock fetch for refreshToken test
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('AuthService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('stores tokens and user data on successful login', async () => {
      const { apiCall } = await import('../../config/api');
      
      const mockResponse = {
        access: 'access_token_123',
        refresh: 'refresh_token_456',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'designer' as const,
          is_staff: false,
          is_active: true,
          date_joined: '2025-01-01',
        },
      };

      vi.mocked(apiCall).mockResolvedValueOnce(mockResponse);

      const result = await AuthService.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(result).toEqual(mockResponse);
      expect(localStorageMock.getItem('access_token')).toBe('access_token_123');
      expect(localStorageMock.getItem('refresh_token')).toBe('refresh_token_456');
      expect(JSON.parse(localStorageMock.getItem('user')!)).toEqual(mockResponse.user);
    });
  });

  describe('logout', () => {
    it('clears local storage on logout', async () => {
      const { apiCall } = await import('../../config/api');
      
      localStorageMock.setItem('access_token', 'token123');
      localStorageMock.setItem('refresh_token', 'refresh123');
      localStorageMock.setItem('user', JSON.stringify({ id: 1, username: 'test' }));

      vi.mocked(apiCall).mockResolvedValueOnce({});

      await AuthService.logout();

      expect(localStorageMock.getItem('access_token')).toBeNull();
      expect(localStorageMock.getItem('refresh_token')).toBeNull();
      expect(localStorageMock.getItem('user')).toBeNull();
    });

    it('clears storage even if API call fails', async () => {
      const { apiCall } = await import('../../config/api');
      
      localStorageMock.setItem('access_token', 'token123');
      localStorageMock.setItem('refresh_token', 'refresh123');

      vi.mocked(apiCall).mockRejectedValueOnce(new Error('Network error'));

      await AuthService.logout();

      expect(localStorageMock.getItem('access_token')).toBeNull();
      expect(localStorageMock.getItem('refresh_token')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when access token exists', () => {
      localStorageMock.setItem('access_token', 'token123');
      expect(AuthService.isAuthenticated()).toBe(true);
    });

    it('returns false when no access token', () => {
      expect(AuthService.isAuthenticated()).toBe(false);
    });
  });

  describe('getStoredUser', () => {
    it('returns user object when stored', () => {
      const user = {
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

      localStorageMock.setItem('user', JSON.stringify(user));
      expect(AuthService.getStoredUser()).toEqual(user);
    });

    it('returns null when no user stored', () => {
      expect(AuthService.getStoredUser()).toBeNull();
    });

    it('returns null when stored data is invalid JSON', () => {
      localStorageMock.setItem('user', 'invalid json');
      expect(AuthService.getStoredUser()).toBeNull();
    });
  });

  describe('role checks', () => {
    it('hasRole returns true for matching role', () => {
      const user = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin' as const,
        is_staff: true,
        is_active: true,
        date_joined: '2025-01-01',
      };

      localStorageMock.setItem('user', JSON.stringify(user));
      expect(AuthService.hasRole('admin')).toBe(true);
      expect(AuthService.hasRole('designer')).toBe(false);
    });

    it('isAdmin returns true for admin users', () => {
      const user = {
        id: 1,
        username: 'admin',
        role: 'admin' as const,
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        is_staff: true,
        is_active: true,
        date_joined: '2025-01-01',
      };

      localStorageMock.setItem('user', JSON.stringify(user));
      expect(AuthService.isAdmin()).toBe(true);
    });

    it('isDesigner returns true for designer users', () => {
      const user = {
        id: 2,
        username: 'designer',
        role: 'designer' as const,
        email: 'designer@example.com',
        first_name: 'Designer',
        last_name: 'User',
        is_staff: false,
        is_active: true,
        date_joined: '2025-01-01',
      };

      localStorageMock.setItem('user', JSON.stringify(user));
      expect(AuthService.isDesigner()).toBe(true);
    });

    it('isPrintManager returns true for print_manager users', () => {
      const user = {
        id: 3,
        username: 'printmgr',
        role: 'print_manager' as const,
        email: 'print@example.com',
        first_name: 'Print',
        last_name: 'Manager',
        is_staff: false,
        is_active: true,
        date_joined: '2025-01-01',
      };

      localStorageMock.setItem('user', JSON.stringify(user));
      expect(AuthService.isPrintManager()).toBe(true);
    });
  });

  describe('token management', () => {
    it('getAccessToken returns stored token', () => {
      localStorageMock.setItem('access_token', 'token123');
      expect(AuthService.getAccessToken()).toBe('token123');
    });

    it('getRefreshToken returns stored token', () => {
      localStorageMock.setItem('refresh_token', 'refresh123');
      expect(AuthService.getRefreshToken()).toBe('refresh123');
    });

    it('refreshToken updates access token', async () => {
      localStorageMock.setItem('refresh_token', 'refresh123');

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access: 'new_access_token' }),
      } as Response);

      const newToken = await AuthService.refreshToken();

      expect(newToken).toBe('new_access_token');
      expect(localStorageMock.getItem('access_token')).toBe('new_access_token');
    });

    it('refreshToken throws error when no refresh token', async () => {
      await expect(AuthService.refreshToken()).rejects.toThrow('No refresh token available');
    });
  });
});
