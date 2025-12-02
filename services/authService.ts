/**
 * Authentication Service
 * Handles user authentication, token management, and user session
 */

import { apiCall, API_URL } from '../config/api';

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'designer' | 'print_manager';
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  profile?: {
    role: string;
    phone_number?: string;
    created_at: string;
    updated_at: string;
  };
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

/**
 * Authentication Service
 */
export const AuthService = {
  /**
   * Login user with username and password
   */
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    const response = await apiCall<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store tokens and user info
    localStorage.setItem(ACCESS_TOKEN_KEY, response.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));

    return response;
  },

  /**
   * Logout current user
   */
  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    try {
      if (refreshToken) {
        await apiCall('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh: refreshToken }),
          headers: {
            'Authorization': `Bearer ${AuthService.getAccessToken()}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear local storage
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (): Promise<string> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is invalid or expired
      AuthService.logout();
      throw new Error('Session expired. Please login again.');
    }

    const data = await response.json();
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
    
    // If a new refresh token is provided, update it
    if (data.refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
    }

    return data.access;
  },

  /**
   * Get current user information
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiCall<User>('/auth/me', {
      headers: {
        'Authorization': `Bearer ${AuthService.getAccessToken()}`,
      },
    });

    // Update stored user info
    localStorage.setItem(USER_KEY, JSON.stringify(response));

    return response;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    return !!accessToken;
  },

  /**
   * Get access token from storage
   */
  getAccessToken: (): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /**
   * Get refresh token from storage
   */
  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Get stored user information
   */
  getStoredUser: (): User | null => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Check if user has specific role
   */
  hasRole: (role: 'admin' | 'designer' | 'print_manager'): boolean => {
    const user = AuthService.getStoredUser();
    return user?.role === role;
  },

  /**
   * Check if user is admin
   */
  isAdmin: (): boolean => {
    return AuthService.hasRole('admin');
  },

  /**
   * Check if user is designer
   */
  isDesigner: (): boolean => {
    return AuthService.hasRole('designer');
  },

  /**
   * Check if user is print manager
   */
  isPrintManager: (): boolean => {
    return AuthService.hasRole('print_manager');
  },
};
