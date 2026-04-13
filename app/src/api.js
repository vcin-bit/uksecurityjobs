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
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Request failed (${res.status})`);
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
