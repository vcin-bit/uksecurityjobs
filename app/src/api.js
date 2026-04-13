const API_URL = 'https://uksecurityjobs-api.onrender.com';

export async function apiRequest(path, method = 'GET', body = null, getToken, retries = 2) {
  const token = await getToken();
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  if (body) options.body = JSON.stringify(body);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_URL}${path}`, options);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
      }
      return res.json();
    } catch (err) {
      if (attempt < retries && (err.message === 'Failed to fetch' || err.name === 'TypeError')) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw err;
    }
  }
}

export async function wakeApi() {
  try { await fetch(`${API_URL}/health`); } catch(e) {}
}
