/**
 * Shared API Client
 * Centralizes base URL configuration, JWT authentication header injection,
 * and standard JSON request/response error handling across the entire app.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function apiClient(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    ...customConfig
  } = options;

  // Retrieve stored JWT token if the user is authenticated
  const token = localStorage.getItem('auth_token');

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const config = {
    method,
    headers: defaultHeaders,
    ...customConfig,
  };

  // Automatically stringify JSON body if present
  if (body) {
    config.body = JSON.stringify(body);
  }}

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Parse JSON response body if content exists
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Standardize error message extraction from API.md error format
      const errorMessage =
        data?.error?.message ||
        data?.message ||
        `Request failed with status: ${response.status}`;

      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    // Avoid leaking PHI in console logs; log only method and endpoint
    console.error(`API Client Error [${method} ${endpoint}]:`, err.message);
    throw err;
  }
