'use strict';

// ── Admin notification helpers ───────────────────────────────────────────────
//
// sendNewCandidateCompleteAlert({ firstName, lastInitial, city, licenceTypes })
//   Fired by refreshBadge() only on the false→true transition of profile_complete.
//   Sends an instant alert to admin with name, town and licence types.
//
// sendNewEmployerAlert({ companyName, contactName, postcode })
//   Fired fire-and-forget from POST /api/employers/me on every new registration.
//
// runRegistrationDigest()
//   Queries candidates and employers created in the last 24 hours.
//   Sends a single digest email to admin if count > 0; silent otherwise.
//   Called from the 09:00 UTC cron in server.js alongside runNudges().

const { supabase } = require('./supabase');
const { baseTemplate, send, escHtml } = require('./email');

// ── Constants ────────────────────────────────────────────────────────────────

const ADMIN_EMAIL     = 'admin@uksecurityjobs.co.uk';
const ADMIN_PANEL_URL = 'https://www.uksecurityjobs.co.uk/admin.html';

const COPY = {
  candidateSubject: (firstName, lastInitial, city) =>
    `New BS7858-ready candidate \u2014 ${firstName} ${lastInitial}., ${city}`,

  candidateBody: (firstName, lastInitial, city, licenceTypes) => `
    <h1>New BS7858-ready candidate</h1>
    <p><strong>Name:</strong> ${escHtml(firstName)} ${escHtml(lastInitial)}.</p>
    <p><strong>Town/city:</strong> ${escHtml(city)}</p>
    <p><strong>Licence type(s):</strong> ${escHtml(licenceTypes)}</p>
    <a href="${ADMIN_PANEL_URL}" class="btn">Go to Admin Panel \u2192</a>
  `,

  employerSubject: (companyName) =>
    `New company registration \u2014 ${companyName}`,

  employerBody: (companyName, contactName, postcode) => `
    <h1>New company registration</h1>
    <p><strong>Company:</strong> ${escHtml(companyName)}</p>
    <p><strong>Contact:</strong> ${escHtml(contactName)}</p>
    <p><strong>Postcode:</strong> ${escHtml(postcode || 'Not provided')}</p>
    <a href="${ADMIN_PANEL_URL}" class="btn">Go to Admin Panel \u2192</a>
  `,

  digestSubject: (total) =>
    `Registration digest \u2014 ${total} new registration${total === 1 ? '' : 's'} in the last 24 hours`,

  digestIntro: (total) =>
    `${total} new registration${total === 1 ? '' : 's'} in the last 24 hours.`,
};

// ── Instant: BS7858-ready candidate ─────────────────────────────────────────

async function sendNewCandidateCompleteAlert({ firstName, lastInitial, city, licenceTypes }) {
  const subject = COPY.candidateSubject(firstName, lastInitial, city);
  const html    = baseTemplate(COPY.candidateBody(firstName, lastInitial, city, licenceTypes));
  return send(ADMIN_EMAIL, subject, html);
}

// ── Instant: new employer ────────────────────────────────────────────────────

async function sendNewEmployerAlert({ companyName, contactName, postcode }) {
  const subject = COPY.employerSubject(companyName);
  const html    = baseTemplate(COPY.employerBody(companyName, contactName, postcode));
  return send(ADMIN_EMAIL, subject, html);
}

// ── Daily digest ─────────────────────────────────────────────────────────────

async function runRegistrationDigest() {
  console.log(`[adminNotify] Digest run started at ${new Date().toISOString()}`);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [candRes, empRes] = await Promise.all([
    supabase
      .from('candidates')
      .select('id, email, created_at, personal_details(first_name, last_name, city)')
      .gte('created_at', since)
      .order('created_at', { ascending: false }),

    supabase
      .from('employers')
      .select('id, company_name, contact_name, postcode, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
  ]);

  const candidates = candRes.data || [];
  const employers  = empRes.data  || [];
  const total      = candidates.length + employers.length;

  if (total === 0) {
    console.log('[adminNotify] Digest: no registrations in last 24h — nothing sent.');
    return;
  }

  // Build candidate rows.
  let candRows = '';
  if (candidates.length > 0) {
    candRows = `
      <h2 style="font-size:1rem;font-weight:700;color:#0b1222;margin:1.5rem 0 0.5rem;">Candidates (${candidates.length})</h2>
      ${candidates.map(c => {
        const pd        = c.personal_details;
        const name      = (pd?.first_name && pd?.last_name)
          ? `${escHtml(pd.first_name)} ${escHtml(pd.last_name)}`
          : escHtml(c.email);
        const location  = pd?.city ? escHtml(pd.city) : 'Town not yet set';
        const time      = new Date(c.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
        return `<div style="background:#f8fafc;border-radius:6px;padding:0.6rem 0.875rem;margin-bottom:0.4rem;font-size:0.88rem;color:#0b1222;">
          ${name} \u2014 ${location} <span style="color:#94a3b8;font-size:0.8rem;">(${time})</span>
        </div>`;
      }).join('')}
    `;
  }

  // Build employer rows.
  let empRows = '';
  if (employers.length > 0) {
    empRows = `
      <h2 style="font-size:1rem;font-weight:700;color:#0b1222;margin:1.5rem 0 0.5rem;">Companies (${employers.length})</h2>
      ${employers.map(e => {
        const time = new Date(e.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
        return `<div style="background:#f8fafc;border-radius:6px;padding:0.6rem 0.875rem;margin-bottom:0.4rem;font-size:0.88rem;color:#0b1222;">
          ${escHtml(e.company_name)} \u2014 ${escHtml(e.contact_name)} \u2014 ${escHtml(e.postcode || 'No postcode')} <span style="color:#94a3b8;font-size:0.8rem;">(${time})</span>
        </div>`;
      }).join('')}
    `;
  }

  const subject = COPY.digestSubject(total);
  const html    = baseTemplate(`
    <h1>Registration digest</h1>
    <p>${COPY.digestIntro(total)}</p>
    ${candRows}
    ${empRows}
    <hr class="divider"/>
    <a href="${ADMIN_PANEL_URL}" class="btn">Go to Admin Panel \u2192</a>
  `);

  const ok = await send(ADMIN_EMAIL, subject, html);
  console.log(`[adminNotify] Digest sent (${total} registrations): ${ok ? 'OK' : 'FAILED'}`);
}

module.exports = { sendNewCandidateCompleteAlert, sendNewEmployerAlert, runRegistrationDigest };
