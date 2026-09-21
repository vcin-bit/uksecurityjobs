const API_URL = 'https://uksecurityjobs-api.onrender.com';

export async function apiRequest(path, method = 'GET', body = null, getToken) {
  const token = await getToken();
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, options);
  if (res.status === 401) {
    // Session expired or invalid — send the user to sign in.
    if (window.location.pathname !== '/sign-in') {
      window.location.href = '/sign-in';
    }
    throw new Error('Your session has expired. Please sign in again.');
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(errBody.error || `Request failed (${res.status})`);
    err.code   = errBody.code;
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Ping the API every 10 minutes to prevent Render free tier sleeping
export function startApiKeepAlive() {
  fetch(`${API_URL}/health`).catch(() => {});
  setInterval(() => {
    fetch(`${API_URL}/health`).catch(() => {});
  }, 10 * 60 * 1000);
}

export function getDiscoverability(getToken) {
  return apiRequest('/api/candidates/me/discoverability', 'GET', null, getToken);
}

export function updateDiscoverability(getToken, body) {
  return apiRequest('/api/candidates/me/discoverability', 'PUT', body, getToken);
}

export function updateVisibilityRules(getToken, rules) {
  return apiRequest('/api/candidates/me/visibility-rules', 'PUT', { rules }, getToken);
}

export async function getPoolEmployers() {
  const res = await fetch(`${API_URL}/api/pool/employers/public`);
  if (!res.ok) return [];
  return res.json();
}
