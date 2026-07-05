// Secure API client for communicating with the backend Express server

const TOKEN_KEY = 'lumiere_admin_auth_token';

export function getAdminToken() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed.token || (parsed.isAuthenticated ? raw : null);
    } catch (e) {
      return raw;
    }
  } catch (err) {
    return null;
  }
}

export function setAdminToken(token) {
  try {
    const data = {
      isAuthenticated: true,
      token: token,
      timestamp: Date.now()
    };
    localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
  } catch (err) {
    // Ignore storage errors
  }
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    // Ignore storage errors
  }
}

export async function apiFetch(endpoint, options = {}) {
  const headers = options.headers || {};
  
  const token = getAdminToken();
  if (token && (endpoint.startsWith('/api/admin') || options.requireAuth)) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-admin-token'] = token;
  }

  // If body is not FormData and not already a string, stringify and add JSON header
  if (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') {
    options.body = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }

  let baseUrl = import.meta.env.VITE_API_URL || '';
  if (baseUrl) {
    baseUrl = baseUrl.replace(/\/$/, '');
  }
  
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function apiGet(endpoint) {
  return apiFetch(endpoint, { method: 'GET' });
}

export async function apiPost(endpoint, body) {
  return apiFetch(endpoint, { method: 'POST', body });
}

export async function apiPut(endpoint, body) {
  return apiFetch(endpoint, { method: 'PUT', body });
}

export async function apiPatch(endpoint, body) {
  return apiFetch(endpoint, { method: 'PATCH', body });
}

export async function apiDelete(endpoint) {
  return apiFetch(endpoint, { method: 'DELETE' });
}
