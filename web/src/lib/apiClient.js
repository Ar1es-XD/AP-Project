// 1. our backend runs on localhost port 3000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
/**
 * Universal API helper function
 * @param {string} endpoint - The route to call, for example: '/queues/join'
 * @param {object} options - Details like HTTP method, data body, or custom headers
 */


 // JavaScript destructuring. If the caller doesn't specify a method, it defaults to a 'GET' request.
export async function apiClient(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    ...customConfig
  } = options;

  // When a doctor or receptionist logs in, their JWT session token is stored in the browser's localStorage. We read it here.
  const token = localStorage.getItem('auth_token');


  // If token exists, inject the standard HTTP header Authorization: Bearer <token>. If the user is not logged in (like on the login page), don't send anything.
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  // Include any additional settings from the caller
  const requestConfig = {
    method,
    headers: defaultHeaders,
    ...otherSettings,
  };

  // Automatically stringify JSON body if present
  if (body) {
    requestConfig.body = JSON.stringify(body);
  }

  // Calls the browser's native fetch() function to send the packet across the network and pauses until the server replies.
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestConfig);

  // HTTP endpoints (like deleting a ticket or returning HTTP 204) return an empty body. Calling .json() on an empty body would cause a crash. Adding .catch(() => null) prevents crashes and safely returns null
    const data = await response.json().catch(() => null);


    // We must manually check !response.ok (which means status was outside 200–299) and throw a real error so React can handle it.
    if (!response.ok) {

      // Reads the clean error message sent by our Express backend,  bundles it into an Error object, and sends it up to the UI.
      const errorMessage =
        data?.error?.message ||
        data?.message ||
        `Request failed with status code: ${response.status}`;

      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;

    // we never log patient names or medical conditions to the browser console. We only log the HTTP method and the endpoint name.

  } catch (err) {
    console.error(`API Client Error [${method} ${endpoint}]:`, err.message);
    throw err;
  }
}