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
//
// warningsSent  — number of final-warning emails sent this run (from sendFinalWarnings).
// removalResult — { removed, wouldRemove, skipped } from runRemoval.
//   removed     — accounts deleted (live mode)
//   wouldRemove — array of { id, email, created_at } (dry-run mode)
//   skipped     — count skipped for manual review

async function runRegistrationDigest({
  warningsSent  = 0,
  removalResult = { removed: 0, wouldRemove: [], skipped: 0 },
} = {}) {
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

  const candidates     = candRes.data || [];
  const employers      = empRes.data  || [];
  const total          = candidates.length + employers.length;
  const removalEnabled = process.env.CANDIDATE_REMOVAL_ENABLED === 'true';

  const { removed, wouldRemove, skipped } = removalResult;
  const hasEnforcement = warningsSent > 0 || removed > 0 || wouldRemove.length > 0 || skipped > 0;

  if (total === 0 && !hasEnforcement) {
    console.log('[adminNotify] Digest: no activity in last 24h — nothing sent.');
    return;
  }

  // Build candidate rows.
  let candRows = '';
  if (candidates.length > 0) {
    candRows = `
      <h2 style="font-size:1rem;font-weight:700;color:#0b1222;margin:1.5rem 0 0.5rem;">Candidates (${candidates.length})</h2>
      ${candidates.map(c => {
        const pd       = c.personal_details;
        const name     = (pd?.first_name && pd?.last_name)
          ? `${escHtml(pd.first_name)} ${escHtml(pd.last_name)}`
          : escHtml(c.email);
        const location = pd?.city ? escHtml(pd.city) : 'Town not yet set';
        const time     = new Date(c.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
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

  // Build enforcement section.
  let enforcementRows = '';
  if (hasEnforcement) {
    // Removal row: red if accounts were actually removed, yellow for dry-run, grey if zero.
    let removalBg, removalBorder, removalText;
    if (removalEnabled && removed > 0) {
      removalBg = '#fee2e2'; removalBorder = '#fca5a5';
      removalText = `${removed} account${removed === 1 ? '' : 's'} removed today`;
    } else if (!removalEnabled && wouldRemove.length > 0) {
      removalBg = '#fef9c3'; removalBorder = '#fde047';
      removalText = `${wouldRemove.length} would be removed today (dry run — set CANDIDATE_REMOVAL_ENABLED=true to enable)`;
    } else {
      removalBg = '#f8fafc'; removalBorder = '#e2e8f0';
      removalText = removalEnabled ? '0 accounts removed today' : '0 would be removed today (dry run)';
    }

    // Dry-run list of would-remove candidates.
    const wouldRemoveList = (!removalEnabled && wouldRemove.length > 0)
      ? wouldRemove.map(c =>
          `<div style="background:#fefce8;border-radius:4px;padding:0.35rem 0.75rem;margin-top:0.25rem;font-size:0.82rem;color:#0b1222;">
            ${escHtml(c.email)} <span style="color:#94a3b8;">(id: ${c.id}, registered: ${new Date(c.created_at).toLocaleDateString('en-GB')})</span>
          </div>`
        ).join('')
      : '';

    const skippedRow = skipped > 0
      ? `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:0.6rem 0.875rem;margin-bottom:0.4rem;font-size:0.88rem;color:#0b1222;">
          ${skipped} candidate${skipped === 1 ? '' : 's'} skipped — interview activity found, manual review needed
        </div>`
      : '';

    enforcementRows = `
      <h2 style="font-size:1rem;font-weight:700;color:#0b1222;margin:1.5rem 0 0.5rem;">SIA Licence Enforcement</h2>
      <div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:0.6rem 0.875rem;margin-bottom:0.4rem;font-size:0.88rem;color:#0b1222;">
        Final warnings sent today: <strong>${warningsSent}</strong>
      </div>
      <div style="background:${removalBg};border:1px solid ${removalBorder};border-radius:6px;padding:0.6rem 0.875rem;margin-bottom:0.4rem;font-size:0.88rem;color:#0b1222;">
        ${removalText}${wouldRemoveList}
      </div>
      ${skippedRow}
    `;
  }

  const subject = COPY.digestSubject(total);
  const html    = baseTemplate(`
    <h1>Registration digest</h1>
    <p>${COPY.digestIntro(total)}</p>
    ${candRows}
    ${empRows}
    ${enforcementRows}
    <hr class="divider"/>
    <a href="${ADMIN_PANEL_URL}" class="btn">Go to Admin Panel \u2192</a>
  `);

  const ok = await send(ADMIN_EMAIL, subject, html);
  console.log(`[adminNotify] Digest sent (${total} registrations): ${ok ? 'OK' : 'FAILED'}`);
}

module.exports = { sendNewCandidateCompleteAlert, sendNewEmployerAlert, runRegistrationDigest };
