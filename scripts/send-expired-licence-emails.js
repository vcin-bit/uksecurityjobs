#!/usr/bin/env node
/**
 * scripts/send-expired-licence-emails.js
 *
 * One-off mailer for candidates whose verified SIA licence has already expired.
 * The daily cron (licenceReminders.js) handles future expiries; this script
 * back-fills the cohort that expired before the reminder system existed.
 *
 * Two email versions:
 *   blocking     — candidate has no other valid in-date verified licence.
 *                  Cannot apply until they renew. Urgent copy.
 *   informational — candidate also holds a valid in-date verified licence.
 *                  Can still apply. Softer renewal nudge.
 *
 * Skips:
 *   - Candidates already in licence_reminders with reminder_type='expired'
 *   - Candidates where email_optouts.opted_out_at IS NOT NULL
 *
 * Dry-run by default. Pass --send to actually send and record.
 *
 * Usage:
 *   node scripts/send-expired-licence-emails.js           # dry run
 *   node scripts/send-expired-licence-emails.js --send    # live send
 */

'use strict';

const path = require('path');
const fs   = require('fs');

// ── Env + deps from api/ ─────────────────────────────────────────────────────
require(path.join(__dirname, '../api/node_modules/dotenv')).config({
  path: path.join(__dirname, '../api/.env'),
});

const { createClient } = require(
  path.join(__dirname, '../api/node_modules/@supabase/supabase-js')
);
const sgMail = require(
  path.join(__dirname, '../api/node_modules/@sendgrid/mail')
);

const SEND_LIVE = process.argv.includes('--send');
const today = new Date().toISOString().slice(0, 10);

// ── Supabase service client ──────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function expiryStr(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function baseTemplate(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f9fafb;color:#0b1222;}
.wrap{max-width:580px;margin:0 auto;padding:2rem 1rem;}
.logo{text-align:center;padding:1.5rem 0;}
.logo a{font-size:1.25rem;font-weight:800;text-decoration:none;}
.logo .uk{color:#1a52a8;}.logo .sec{color:#0b1222;}.logo .job{color:#1a52a8;}
.card{background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:2rem;}
h1{font-size:1.25rem;font-weight:800;color:#0b1222;margin-bottom:0.75rem;line-height:1.3;}
p{font-size:0.92rem;color:#4a5568;line-height:1.75;margin-bottom:1rem;}
p:last-child{margin-bottom:0;}
.btn{display:inline-block;background:#1a52a8;color:#fff;font-size:0.92rem;font-weight:700;padding:0.75rem 2rem;border-radius:8px;text-decoration:none;margin:1.25rem 0;}
.divider{border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0;}
.footer{text-align:center;padding:1.5rem 0;font-size:0.75rem;color:#94a3b8;line-height:1.7;}
.footer a{color:#94a3b8;}
</style>
</head>
<body>
<div class="wrap">
  <div class="logo"><a href="https://www.uksecurityjobs.co.uk"><span class="uk">UK</span><span class="sec">Security</span><span class="job">Jobs</span></a></div>
  <div class="card">${content}</div>
  <div class="footer">
    &copy; 2026 UKSecurityJobs.co.uk &mdash; Digital Software Group Ltd<br>
    Registered in England &amp; Wales<br>
    <a href="https://www.uksecurityjobs.co.uk/privacy">Privacy Policy</a> &middot; <a href="https://www.uksecurityjobs.co.uk/terms">Terms</a>
  </div>
</div>
</body>
</html>`;
}

function buildBlockingHtml({ firstName, licenceType, expiryDate, unsubUrl }) {
  const expStr = expiryStr(expiryDate);
  return baseTemplate(`
    <h1>Your SIA licence has expired</h1>
    <p>Hi ${esc(firstName)},</p>
    <p>Your <strong>${esc(licenceType)}</strong> SIA licence expired on <strong>${expStr}</strong>.</p>
    <p>Until you add a valid, renewed licence to your profile, you will not be able to apply for security roles on UKSecurityJobs.</p>
    <p>Renew through the <a href="https://www.sia.homeoffice.gov.uk" style="color:#1a52a8;">SIA website</a>, then add your new licence number to your profile. Once our team verifies it, your profile will be live again.</p>
    <a href="https://app.uksecurityjobs.co.uk/profile" class="btn">Add My Renewed Licence →</a>
    <hr class="divider"/>
    <p style="font-size:0.82rem;color:#64748b;">If you believe this is an error, reply to this email or contact <a href="mailto:admin@uksecurityjobs.co.uk" style="color:#1a52a8;">admin@uksecurityjobs.co.uk</a>.</p>
    <p style="font-size:0.75rem;color:#94a3b8;margin-top:1rem;"><a href="${unsubUrl}" style="color:#94a3b8;">Unsubscribe from licence reminders</a></p>
  `);
}

function buildInformationalHtml({ firstName, licenceType, expiryDate, unsubUrl }) {
  const expStr = expiryStr(expiryDate);
  return baseTemplate(`
    <h1>One of your SIA licences has expired</h1>
    <p>Hi ${esc(firstName)},</p>
    <p>Your <strong>${esc(licenceType)}</strong> SIA licence expired on <strong>${expStr}</strong>.</p>
    <p>You still hold a valid in-date licence so you can continue applying for roles — but we recommend renewing the expired licence to keep your profile fully current.</p>
    <p>Renew through the <a href="https://www.sia.homeoffice.gov.uk" style="color:#1a52a8;">SIA website</a>, then add the new licence number to your UKSecurityJobs profile.</p>
    <a href="https://app.uksecurityjobs.co.uk/profile" class="btn">Update My Licences →</a>
    <hr class="divider"/>
    <p style="font-size:0.82rem;color:#64748b;">If you have already renewed this licence, log in and update the licence number on your profile.</p>
    <p style="font-size:0.75rem;color:#94a3b8;margin-top:1rem;"><a href="${unsubUrl}" style="color:#94a3b8;">Unsubscribe from licence reminders</a></p>
  `);
}

// Ensure an unsubscribe token exists for this email; return the URL.
async function getUnsubscribeUrl(email) {
  const { data: existing } = await supabase
    .from('email_optouts')
    .select('token')
    .eq('email', email)
    .maybeSingle();

  if (existing?.token) {
    return `https://app.uksecurityjobs.co.uk/unsubscribe/${existing.token}`;
  }

  const crypto = require('crypto');
  const token  = crypto.randomUUID();
  await supabase.from('email_optouts').insert({ email, token, source: 'expired_licence_send' });
  return `https://app.uksecurityjobs.co.uk/unsubscribe/${token}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nsend-expired-licence-emails — ${SEND_LIVE ? 'LIVE SEND' : 'DRY RUN'}`);
  console.log(`Today: ${today}\n`);

  // 1. All expired verified licences
  const { data: licences, error: licErr } = await supabase
    .from('sia_licences')
    .select('id, candidate_id, licence_type, expiry_date')
    .eq('verified', true)
    .lt('expiry_date', today);

  if (licErr) { console.error('sia_licences query failed:', licErr.message); process.exit(1); }
  if (!licences || licences.length === 0) {
    console.log('No expired verified licences found.'); return;
  }
  console.log(`Expired verified licences found: ${licences.length}`);

  // 2. Already sent this reminder type
  const licenceIds = licences.map(l => l.id);
  const { data: alreadySent } = await supabase
    .from('licence_reminders')
    .select('licence_id')
    .eq('reminder_type', 'expired')
    .in('licence_id', licenceIds);

  const sentSet = new Set((alreadySent || []).map(r => r.licence_id));
  const pending = licences.filter(l => !sentSet.has(l.id));
  console.log(`Already sent: ${sentSet.size} | Pending: ${pending.length}`);

  if (pending.length === 0) { console.log('Nothing to do.'); return; }

  // 3. Fetch candidate emails in one query
  const candidateIds = [...new Set(pending.map(l => l.candidate_id))];
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, email')
    .in('id', candidateIds);

  const candidateMap = Object.fromEntries((candidates || []).map(c => [c.id, c]));

  // 4. Genuine opt-outs
  const emails = (candidates || []).map(c => c.email).filter(Boolean);
  const { data: optouts } = await supabase
    .from('email_optouts')
    .select('email')
    .in('email', emails)
    .not('opted_out_at', 'is', null);

  const optedOutSet = new Set((optouts || []).map(r => r.email));

  // 5. Personal details (first name) in one query
  const { data: personalRows } = await supabase
    .from('personal_details')
    .select('candidate_id, first_name')
    .in('candidate_id', candidateIds);

  const personalMap = Object.fromEntries((personalRows || []).map(p => [p.candidate_id, p]));

  // 6. Determine which candidates have another valid in-date licence
  //    (so we know blocking vs informational for each expired licence)
  const { data: allLicences } = await supabase
    .from('sia_licences')
    .select('candidate_id, expiry_date, verified')
    .in('candidate_id', candidateIds)
    .eq('verified', true)
    .gte('expiry_date', today);

  const hasValidSet = new Set((allLicences || []).map(l => l.candidate_id));

  // 7. Build the send list
  const toSend = [];
  for (const licence of pending) {
    const candidate = candidateMap[licence.candidate_id];
    if (!candidate?.email) continue;
    if (optedOutSet.has(candidate.email)) continue;

    const version  = hasValidSet.has(licence.candidate_id) ? 'informational' : 'blocking';
    const personal = personalMap[licence.candidate_id];
    toSend.push({
      licence,
      candidate,
      firstName: personal?.first_name || 'there',
      version,
    });
  }

  const blocking      = toSend.filter(r => r.version === 'blocking');
  const informational = toSend.filter(r => r.version === 'informational');
  const skipped       = pending.length - toSend.length;

  console.log(`\nOpted-out / no-email skipped: ${skipped}`);
  console.log(`\nVersion: blocking      — ${blocking.length} to send`);
  for (const r of blocking) {
    console.log(`  ${r.licence.id.slice(0, 8)}  ${r.candidate.email}  expired ${r.licence.expiry_date}`);
  }
  console.log(`\nVersion: informational — ${informational.length} to send`);
  for (const r of informational) {
    console.log(`  ${r.licence.id.slice(0, 8)}  ${r.candidate.email}  expired ${r.licence.expiry_date}`);
  }

  // 8. Save sample HTML for each version (dry-run always; live run also)
  const sampleBlocking = blocking[0] || informational[0];
  const sampleInfo     = informational[0] || blocking[0];

  if (sampleBlocking) {
    const unsubUrl = await getUnsubscribeUrl(sampleBlocking.candidate.email);
    const html = buildBlockingHtml({
      firstName:   sampleBlocking.firstName,
      licenceType: sampleBlocking.licence.licence_type,
      expiryDate:  sampleBlocking.licence.expiry_date,
      unsubUrl,
    });
    fs.writeFileSync('/tmp/expired-blocking.html', html);
    console.log('\nSaved: /tmp/expired-blocking.html');
  }

  if (sampleInfo && sampleInfo !== sampleBlocking) {
    const unsubUrl = await getUnsubscribeUrl(sampleInfo.candidate.email);
    const html = buildInformationalHtml({
      firstName:   sampleInfo.firstName,
      licenceType: sampleInfo.licence.licence_type,
      expiryDate:  sampleInfo.licence.expiry_date,
      unsubUrl,
    });
    fs.writeFileSync('/tmp/expired-informational.html', html);
    console.log('Saved: /tmp/expired-informational.html');
  } else if (sampleInfo && blocking.length === 0) {
    // Only informational — still save blocking template with placeholder
    const html = buildBlockingHtml({
      firstName:   'Alex',
      licenceType: 'Security Guard',
      expiryDate:  today,
      unsubUrl:    'https://app.uksecurityjobs.co.uk/unsubscribe/example',
    });
    fs.writeFileSync('/tmp/expired-blocking.html', html);
    console.log('Saved: /tmp/expired-blocking.html  (placeholder — no blocking candidates)');
  }

  if (SEND_LIVE && toSend.length === 0) {
    console.log('\nNothing to send.'); return;
  }

  if (!SEND_LIVE) {
    console.log(`\nDRY RUN complete — ${toSend.length} would be sent. Pass --send to send.`);
    return;
  }

  // ── Live send ────────────────────────────────────────────────────────────
  console.log('\n--- LIVE SEND ---');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const FROM = { email: 'admin@uksecurityjobs.co.uk', name: 'UKSecurityJobs' };

  let sent = 0, failed = 0;

  for (const row of toSend) {
    try {
      const unsubUrl = await getUnsubscribeUrl(row.candidate.email);
      const html = row.version === 'blocking'
        ? buildBlockingHtml({ firstName: row.firstName, licenceType: row.licence.licence_type, expiryDate: row.licence.expiry_date, unsubUrl })
        : buildInformationalHtml({ firstName: row.firstName, licenceType: row.licence.licence_type, expiryDate: row.licence.expiry_date, unsubUrl });

      const subject = row.version === 'blocking'
        ? 'Your SIA licence has expired — renew to keep applying on UKSecurityJobs'
        : 'One of your SIA licences has expired — UKSecurityJobs';

      await sgMail.send({ from: FROM, to: row.candidate.email, subject, html });

      const { error: insertErr } = await supabase
        .from('licence_reminders')
        .insert({
          candidate_id:  row.licence.candidate_id,
          licence_id:    row.licence.id,
          reminder_type: 'expired',
        });

      if (insertErr && insertErr.code !== '23505') {
        console.error(`  Failed to record for licence ${row.licence.id}:`, insertErr.message);
      } else {
        console.log(`  Sent [${row.version}] ${row.licence.id.slice(0, 8)} → ${row.candidate.email}`);
        sent++;
      }
    } catch (err) {
      console.error(`  FAILED ${row.licence.id.slice(0, 8)}:`, err?.response?.body || err.message);
      failed++;
    }
  }

  console.log(`\nDone — sent: ${sent}, failed: ${failed}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
