/**
 * API utility for making authenticated requests with automatic token refresh
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Refresh the access token using the refresh token (httpOnly cookie)
export const refreshAccessToken = async () => {
  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Send cookies
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  } catch (error) {
    // If refresh fails, clear token and redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw error;
  }
};

// Make an authenticated API request with automatic token refresh
export const authenticatedFetch = async (url, options = {}) => {
  const accessToken = localStorage.getItem('accessToken');

  // Add authorization header
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Make the request
  let response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include', // Always send cookies
  });

  // If unauthorized (401), try to refresh the token
  if (response.status === 401 && accessToken) {
    // Try to refresh the access token
    const newAccessToken = await refreshAccessToken();

    // Retry the original request with new token
    headers['Authorization'] = `Bearer ${newAccessToken}`;
    response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  }

  return response;
};

// Helper to get API URL
export const getApiUrl = () => API_URL;
