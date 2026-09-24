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

export function getShortlist(getToken, { licenceType, city } = {}) {
  const params = new URLSearchParams();
  if (licenceType) params.set('licence_type', licenceType);
  if (city)        params.set('city', city);
  const qs = params.toString();
  return apiRequest(`/api/talent-pool/shortlist${qs ? '?' + qs : ''}`, 'GET', null, getToken);
}

export function sendInvite(getToken, candidateId) {
  return apiRequest('/api/talent-pool/invites', 'POST', { candidate_id: candidateId }, getToken);
}

export function getCandidateInvites(getToken) {
  return apiRequest('/api/candidates/me/invites', 'GET', null, getToken);
}

export function getInviteByToken(getToken, token) {
  return apiRequest(`/api/candidates/me/invites/${token}`, 'GET', null, getToken);
}

export function acceptInvite(getToken, token, wordingVersion) {
  return apiRequest(`/api/candidates/me/invites/${token}/accept`, 'POST', { wording_version: wordingVersion }, getToken);
}

export function declineInvite(getToken, token) {
  return apiRequest(`/api/candidates/me/invites/${token}/decline`, 'POST', {}, getToken);
}

export function getAcceptedInvites(getToken) {
  return apiRequest('/api/talent-pool/accepted', 'GET', null, getToken);
}

export function recordOutcome(getToken, inviteId, outcome, outcomeNotes) {
  return apiRequest(`/api/talent-pool/invites/${inviteId}/outcome`, 'POST', { outcome, outcome_notes: outcomeNotes || null }, getToken);
}

export function getPoolMemberships(getToken) {
  return apiRequest('/api/candidates/me/pool-memberships', 'GET', null, getToken);
}

export function leavePool(getToken, employerId) {
  return apiRequest(`/api/candidates/me/pool-membership/${employerId}/leave`, 'POST', {}, getToken);
}

export function getPoolMembers(getToken, { licenceType, city } = {}) {
  const params = new URLSearchParams();
  if (licenceType) params.set('licence_type', licenceType);
  if (city)        params.set('city', city);
  const qs = params.toString();
  return apiRequest(`/api/talent-pool/members${qs ? '?' + qs : ''}`, 'GET', null, getToken);
}

export function sendCallout(getToken, body) {
  return apiRequest('/api/talent-pool/callouts', 'POST', body, getToken);
}

export function getCallouts(getToken) {
  return apiRequest('/api/talent-pool/callouts', 'GET', null, getToken);
}

export function getCalloutDetail(getToken, calloutId) {
  return apiRequest(`/api/talent-pool/callouts/${calloutId}`, 'GET', null, getToken);
}

export function closeCallout(getToken, calloutId) {
  return apiRequest(`/api/talent-pool/callouts/${calloutId}/close`, 'POST', {}, getToken);
}

export async function getCalloutPublic(token) {
  const res = await fetch(`${API_URL}/api/callout/${token}`);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(errBody.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function respondToCallout(token, response) {
  const res = await fetch(`${API_URL}/api/callout/${token}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(errBody.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
