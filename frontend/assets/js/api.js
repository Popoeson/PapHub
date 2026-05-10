/**
 * API Utility
 * Centralises all backend communication.
 * Handles access token in memory and silent refresh via refresh token cookie.
 */

const API_BASE = 'https://paphub-lav4.onrender.com/api';

let _accessToken = null;

// ─── Token management ──────────────────────────────────────────────────────

function setAccessToken(token) {
  _accessToken = token;
}

function clearAccessToken() {
  _accessToken = null;
}

function getAccessToken() {
  return _accessToken;
}

// ─── Core request function ─────────────────────────────────────────────────

async function request(endpoint, options = {}, retry = true) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  // Silent refresh: if 401, parse body once, check for TOKEN_EXPIRED,
  // then reconstruct a fake response so the caller can still read the body.
  if (res.status === 401 && retry) {
    const body = await res.json().catch(() => ({}));

    if (body.code === 'TOKEN_EXPIRED') {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        return request(endpoint, options, false);
      } else {
        handleSessionExpired();
        return null;
      }
    }

    // Not a TOKEN_EXPIRED 401 — reconstruct response so caller can read body
    return new Response(JSON.stringify(body), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return res;
}

async function attemptTokenRefresh() {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) return false;

    const data = await res.json();
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

function handleSessionExpired() {
  clearAccessToken();
  showToast('Session expired. Please log in again.', 'error');
  setTimeout(() => {
    window.location.href = '/admin/login.html';
  }, 1500);
}

// ─── Auth API ──────────────────────────────────────────────────────────────

const Auth = {
  async login(email, password) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return res;
  },

  async logout() {
    await request('/auth/logout', { method: 'POST' });
    clearAccessToken();
  },

  async refresh() {
    return attemptTokenRefresh();
  },

  async getMe() {
    const res = await request('/auth/me');
    return res;
  },
};

// ─── Protect admin pages ───────────────────────────────────────────────────

async function requireAuth() {
  if (!_accessToken) {
    const refreshed = await attemptTokenRefresh();
    if (!refreshed) {
      window.location.href = '/admin/login.html';
      return false;
    }
  }

  const res = await Auth.getMe();
  if (!res || !res.ok) {
    window.location.href = '/admin/login.html';
    return false;
  }

  return true;
}

window.API_BASE = API_BASE;
window.setAccessToken = setAccessToken;
window.clearAccessToken = clearAccessToken;
window.getAccessToken = getAccessToken;
window.request = request;
window.Auth = Auth;
window.requireAuth = requireAuth;
