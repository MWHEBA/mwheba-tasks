// API Configuration
// Use VITE_USE_DJANGO to switch between Node.js and Django backends
const USE_DJANGO = import.meta.env.VITE_USE_DJANGO === 'true';

// Default URLs for each backend
const NODE_API_URL = 'http://localhost:3001/api';
const DJANGO_API_URL = 'http://localhost:8000/api';

// Select the appropriate backend based on environment variable
export const API_URL = import.meta.env.VITE_API_URL || (USE_DJANGO ? DJANGO_API_URL : NODE_API_URL);

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * Refresh the access token
 */
async function refreshAccessToken(): Promise<string> {
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
    // Refresh token is invalid or expired - clear storage and redirect to login
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = '/login';
    
    throw new Error('Session expired. Please login again.');
  }

  const data = await response.json();
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
  
  // If a new refresh token is provided, update it
  if (data.refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
  }

  return data.access;
}

// Helper function for API calls with automatic token management
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Ensure endpoint ends with / for Django compatibility (but not if it has query params)
  const hasQueryParams = endpoint.includes('?');
  const normalizedEndpoint = (endpoint.endsWith('/') || hasQueryParams) ? endpoint : `${endpoint}/`;
  
  // Get access token
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  
  // Add Authorization header if token exists
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  // Make the request
  let response = await fetch(`${API_URL}${normalizedEndpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && accessToken) {
    try {
      // Prevent multiple simultaneous refresh attempts
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken();
      }
      
      // Wait for token refresh
      const newAccessToken = await refreshPromise!;
      
      // Retry the original request with new token
      response = await fetch(`${API_URL}${normalizedEndpoint}`, {
        ...options,
        headers: {
          ...headers,
          'Authorization': `Bearer ${newAccessToken}`,
        },
      });
    } catch (error) {
      // Token refresh failed - user will be redirected to login
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }

  // Handle 403 Forbidden - Permission Denied
  if (response.status === 403) {
    const error = await response.json().catch(() => ({ 
      error: 'ليس لديك صلاحية للقيام بهذا الإجراء' 
    }));
    const errorMessage = error.error || error.detail || 'ليس لديك صلاحية للقيام بهذا الإجراء';
    throw new Error(errorMessage);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  // Handle empty responses (204 No Content, DELETE requests, etc.)
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json') || response.status === 204) {
    return {} as T;
  }

  return response.json();
}
