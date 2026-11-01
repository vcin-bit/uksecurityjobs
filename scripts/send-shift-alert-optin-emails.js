#!/usr/bin/env node
/**
 * scripts/send-shift-alert-optin-emails.js
 *
 * Sends "Want shifts near you?" opt-in invite emails to candidates who:
 *   - Have a VERIFIED SIA licence row
 *   - Have not already opted in (shift_alerts_opt_in = false)
 *   - Have not already been sent this email (guard_emails has no row for
 *     (candidate_id, 'shift_optin'))
 *   - Are not opted out of all emails (email_optouts.opted_out_at IS NOT NULL)
 *   - Have a non-empty email address and are not suspended
 *
 * Dry-run by default. Pass --send to live-send.
 *
 * --test-to=<email>
 *   Sends ONE email to the given address, using the first eligible
 *   candidate's real token. Nothing is written to guard_emails.
 *   Does not consume the token (guard_emails not updated → re-runnable).
 *   Requires --send.
 *
 * Usage:
 *   node scripts/send-shift-alert-optin-emails.js              # dry run
 *   node scripts/send-shift-alert-optin-emails.js --send       # live send
 *   node scripts/send-shift-alert-optin-emails.js --send --test-to=you@example.com
 */

'use strict';

const path   = require('path');
const crypto = require('crypto');

require(path.join(__dirname, '../api/node_modules/dotenv')).config({
  path: path.join(__dirname, '../api/.env'),
});

const { createClient } = require(
  path.join(__dirname, '../api/node_modules/@supabase/supabase-js')
);
const { sendShiftAlertOptIn } = require(
  path.join(__dirname, '../api/src/lib/email')
);

const SEND_LIVE  = process.argv.includes('--send');
const TEST_TO    = (process.argv.find(a => a.startsWith('--test-to=')) || '').replace('--test-to=', '').trim() || null;
const today      = new Date().toISOString().slice(0, 10);
const EXPIRES_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getUnsubscribeUrl(email) {
  const { data: existing } = await supabase
    .from('email_optouts')
    .select('token')
    .eq('email', email)
    .maybeSingle();

  if (existing?.token) {
    return `https://app.uksecurityjobs.co.uk/unsubscribe/${existing.token}`;
  }
  // Create a new row (token field is uuid, we generate one here).
  const token = crypto.randomUUID();
  await supabase.from('email_optouts').insert({ email, token, source: 'shift_optin_send' });
  return `https://app.uksecurityjobs.co.uk/unsubscribe/${token}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nsend-shift-alert-optin-emails — ${SEND_LIVE ? (TEST_TO ? `TEST SEND → ${TEST_TO}` : 'LIVE SEND') : 'DRY RUN'}`);
  console.log(`Today: ${today}\n`);

  if (TEST_TO && !SEND_LIVE) {
    console.error('--test-to requires --send');
    process.exit(1);
  }

  // 1. Eligible candidates: verified licence, not opted in, not opted out,
  //    not already sent this email.
  const { data: candidates, error: cErr } = await supabase
    .from('candidates')
    .select('id, email')
    .eq('shift_alerts_opt_in', false)
    .not('email', 'is', null)
    .neq('email', '')
    .or('suspended.is.null,suspended.eq.false');

  if (cErr) { console.error('candidates query failed:', cErr.message); process.exit(1); }
  if (!candidates || candidates.length === 0) { console.log('No candidates found.'); return; }

  const allIds = candidates.map(c => c.id);

  // 2. Must have a verified SIA licence.
  const { data: verifiedLicences } = await supabase
    .from('sia_licences')
    .select('candidate_id')
    .eq('verified', true)
    .in('candidate_id', allIds);

  const verifiedSet = new Set((verifiedLicences || []).map(l => l.candidate_id));
  const withLicence = candidates.filter(c => verifiedSet.has(c.id));
  console.log(`Candidates with verified licence: ${withLicence.length}`);

  // 3. Exclude opted-out emails.
  const emails = withLicence.map(c => c.email);
  const { data: optouts } = await supabase
    .from('email_optouts')
    .select('email')
    .in('email', emails)
    .not('opted_out_at', 'is', null);
  const optedOutSet = new Set((optouts || []).map(r => r.email));

  // 4. Exclude already-sent.
  const { data: alreadySent } = await supabase
    .from('guard_emails')
    .select('candidate_id')
    .eq('email_type', 'shift_optin')
    .in('candidate_id', withLicence.map(c => c.id));
  const alreadySentSet = new Set((alreadySent || []).map(r => r.candidate_id));

  const pending = withLicence.filter(c => !optedOutSet.has(c.email) && !alreadySentSet.has(c.id));
  console.log(`Opted-out or already-sent excluded: ${withLicence.length - pending.length}`);
  console.log(`Pending: ${pending.length}\n`);

  if (pending.length === 0) { console.log('Nothing to send.'); return; }

  // 5. Fetch first names.
  const pendingIds = pending.map(c => c.id);
  const { data: personalRows } = await supabase
    .from('personal_details')
    .select('candidate_id, first_name')
    .in('candidate_id', pendingIds);
  const personalMap = Object.fromEntries((personalRows || []).map(p => [p.candidate_id, p.first_name]));

  // 6. Print first 3 first names for dry-run reporting.
  const preview = pending.slice(0, 3).map(c => personalMap[c.id] || '(no name)');
  console.log(`First 3 recipients' first names: ${preview.join(', ')}`);

  if (!SEND_LIVE) {
    console.log(`\nDRY RUN complete — ${pending.length} would be sent. Pass --send to send.`);
    return;
  }

  // ── Test-to mode ──────────────────────────────────────────────────────────
  if (TEST_TO) {
    const candidate = pending[0];
    const firstName = personalMap[candidate.id] || 'there';
    const token     = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + EXPIRES_MS).toISOString();

    const { error: insertErr } = await supabase
      .from('shift_alert_opt_in_tokens')
      .insert({ candidate_id: candidate.id, token, expires_at: expiresAt });

    if (insertErr) { console.error('Token insert failed:', insertErr.message); process.exit(1); }

    const optInUrl  = `https://app.uksecurityjobs.co.uk/shift-alerts/${token}`;
    const unsubUrl  = await getUnsubscribeUrl(TEST_TO);

    const ok = await sendShiftAlertOptIn({ to: TEST_TO, firstName, optInUrl, unsubUrl });
    console.log(`Test email ${ok ? 'sent' : 'FAILED'} → ${TEST_TO} (token for candidate ${candidate.id.slice(0, 8)})`);
    console.log('guard_emails NOT updated (test mode).');
    return;
  }

  // ── Live send ─────────────────────────────────────────────────────────────
  console.log('\n--- LIVE SEND ---');
  let sent = 0, failed = 0;

  for (const candidate of pending) {
    try {
      const firstName = personalMap[candidate.id] || 'there';
      const token     = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + EXPIRES_MS).toISOString();

      const { error: tokenErr } = await supabase
        .from('shift_alert_opt_in_tokens')
        .insert({ candidate_id: candidate.id, token, expires_at: expiresAt });

      if (tokenErr) throw tokenErr;

      const optInUrl = `https://app.uksecurityjobs.co.uk/shift-alerts/${token}`;
      const unsubUrl = await getUnsubscribeUrl(candidate.email);

      const ok = await sendShiftAlertOptIn({ to: candidate.email, firstName, optInUrl, unsubUrl });
      if (!ok) throw new Error('sendShiftAlertOptIn returned false');

      // Dedup lock — prevents re-send if script is run again.
      const { error: geErr } = await supabase
        .from('guard_emails')
        .insert({ candidate_id: candidate.id, email_type: 'shift_optin' });

      if (geErr && geErr.code !== '23505') {
        console.error(`  guard_emails insert failed for ${candidate.id.slice(0, 8)}:`, geErr.message);
      }

      console.log(`  Sent ${candidate.id.slice(0, 8)} → ${candidate.email}`);
      sent++;
    } catch (err) {
      console.error(`  FAILED ${candidate.id.slice(0, 8)}:`, err.message);
      failed++;
    }
  }

  console.log(`\nDone — sent: ${sent}, failed: ${failed}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
