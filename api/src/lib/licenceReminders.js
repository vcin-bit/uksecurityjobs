'use strict';

// ── SIA licence expiry reminder emails ───────────────────────────────────────
//
// Gated by LICENCE_REMINDERS_ENABLED=true (default: off).
//
// Sends three reminder types, each at most once per licence (UNIQUE constraint
// on licence_reminders(licence_id, reminder_type)):
//
//   '60d' — 60 days before expiry_date
//   '30d' — 30 days before expiry_date
//   'expired' — within 7 days after expiry (grace window for the one-off script
//               but also caught by the daily cron for any that slip through)
//
// Skips candidates where email_optouts.opted_out_at IS NOT NULL.
// Uses baseTemplate() from email.js with an unsubscribe link.
//
// Called daily from the 09:00 UTC cron in server.js.

const { supabase } = require('./supabase');
const { baseTemplate, send, isOptedOut } = require('./email');

// ── Unsubscribe URL helper ────────────────────────────────────────────────────
// email_optouts stores a per-email token; we use it as the unsubscribe key.
// If no token exists yet, we create one now so the link always works.
async function getUnsubscribeUrl(email) {
  const { data: existing } = await supabase
    .from('email_optouts')
    .select('token')
    .eq('email', email)
    .maybeSingle();

  if (existing?.token) {
    return `https://app.uksecurityjobs.co.uk/unsubscribe/${existing.token}`;
  }

  const { createClient } = require('@supabase/supabase-js');
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const token = require('crypto').randomUUID();
  await admin.from('email_optouts').insert({ email, token, source: 'licence_reminder' });
  return `https://app.uksecurityjobs.co.uk/unsubscribe/${token}`;
}

// ── Email builders ────────────────────────────────────────────────────────────

function expiryDateStr(expiryDate) {
  return new Date(expiryDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

async function sendExpiryReminder({ toEmail, firstName, licenceType, expiryDate, reminderType }) {
  const unsub = await getUnsubscribeUrl(toEmail);
  const expStr = expiryDateStr(expiryDate);
  const safeName = String(firstName || 'there')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let subject, body;

  if (reminderType === '60d') {
    subject = 'Your SIA licence expires in 60 days — UKSecurityJobs';
    body = `
      <h1>Your SIA licence expires soon</h1>
      <p>Hi ${safeName},</p>
      <p>Your <strong>${licenceType}</strong> SIA licence expires on <strong>${expStr}</strong> — that is in approximately 60 days.</p>
      <p>Renew through the <a href="https://www.sia.homeoffice.gov.uk" style="color:#1a52a8;">SIA website</a> before it expires. Once renewed, add the new licence number to your UKSecurityJobs profile so employers can see your up-to-date status.</p>
      <a href="https://app.uksecurityjobs.co.uk/profile" class="btn">Update My Licence →</a>
      <hr class="divider"/>
      <p style="font-size:0.82rem;color:#64748b;">If you have already renewed, log in and update your licence number. An expired licence will prevent you from applying for roles.</p>
      <p style="font-size:0.75rem;color:#94a3b8;margin-top:1rem;"><a href="${unsub}" style="color:#94a3b8;">Unsubscribe from licence reminders</a></p>
    `;
  } else if (reminderType === '30d') {
    subject = 'Your SIA licence expires in 30 days — UKSecurityJobs';
    body = `
      <h1>30 days until your SIA licence expires</h1>
      <p>Hi ${safeName},</p>
      <p>Your <strong>${licenceType}</strong> SIA licence expires on <strong>${expStr}</strong>. You have 30 days left.</p>
      <p>If you have not already renewed, apply now through the <a href="https://www.sia.homeoffice.gov.uk" style="color:#1a52a8;">SIA website</a>. Once renewed, update your UKSecurityJobs profile with the new licence number.</p>
      <a href="https://app.uksecurityjobs.co.uk/profile" class="btn">Update My Licence →</a>
      <hr class="divider"/>
      <p style="font-size:0.82rem;color:#64748b;">An expired licence will prevent you from applying for roles. Employers can see when your licence expires — keeping it current keeps you employable.</p>
      <p style="font-size:0.75rem;color:#94a3b8;margin-top:1rem;"><a href="${unsub}" style="color:#94a3b8;">Unsubscribe from licence reminders</a></p>
    `;
  } else {
    // 'expired'
    subject = 'Your SIA licence has expired — renew to keep applying on UKSecurityJobs';
    body = `
      <h1>Your SIA licence has expired</h1>
      <p>Hi ${safeName},</p>
      <p>Your <strong>${licenceType}</strong> SIA licence expired on <strong>${expStr}</strong>.</p>
      <p>Until you add a valid, renewed licence to your profile, you will not be able to apply for security roles on UKSecurityJobs.</p>
      <p>Renew through the <a href="https://www.sia.homeoffice.gov.uk" style="color:#1a52a8;">SIA website</a>, then add your new licence number to your profile. Once our team verifies it, your profile will be live again.</p>
      <a href="https://app.uksecurityjobs.co.uk/profile" class="btn">Add My Renewed Licence →</a>
      <hr class="divider"/>
      <p style="font-size:0.82rem;color:#64748b;">If you believe this is an error, reply to this email or contact <a href="mailto:admin@uksecurityjobs.co.uk" style="color:#1a52a8;">admin@uksecurityjobs.co.uk</a>.</p>
      <p style="font-size:0.75rem;color:#94a3b8;margin-top:1rem;"><a href="${unsub}" style="color:#94a3b8;">Unsubscribe from licence reminders</a></p>
    `;
  }

  return send(toEmail, subject, baseTemplate(body));
}

// ── Main runner ───────────────────────────────────────────────────────────────

async function runLicenceReminders() {
  if (process.env.LICENCE_REMINDERS_ENABLED !== 'true') {
    console.log('[licenceReminders] Disabled — set LICENCE_REMINDERS_ENABLED=true to enable.');
    return;
  }

  console.log(`[licenceReminders] Run started at ${new Date().toISOString()}`);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Window dates
  const in60d  = new Date(today); in60d.setDate(in60d.getDate() + 60);
  const in30d  = new Date(today); in30d.setDate(in30d.getDate() + 30);

  // Ranges for each bucket (±3 days to tolerate cron drift)
  const windows = [
    {
      type:     '60d',
      from:     addDays(todayStr, 57),  // 57–63 days out
      to:       addDays(todayStr, 63),
    },
    {
      type:     '30d',
      from:     addDays(todayStr, 27),  // 27–33 days out
      to:       addDays(todayStr, 33),
    },
    {
      type:     'expired',
      from:     addDays(todayStr, -7),  // expired 0–7 days ago
      to:       todayStr,
    },
  ];

  let totalSent = 0;

  for (const window of windows) {
    // Fetch verified licences expiring in this window
    const { data: licences, error: licErr } = await supabase
      .from('sia_licences')
      .select('id, candidate_id, licence_type, expiry_date')
      .eq('verified', true)
      .gte('expiry_date', window.from)
      .lte('expiry_date', window.to);

    if (licErr) {
      console.error(`[licenceReminders] ${window.type}: licence query failed:`, licErr.message);
      continue;
    }
    if (!licences || licences.length === 0) {
      console.log(`[licenceReminders] ${window.type}: no licences in window.`);
      continue;
    }

    // Which of these have already had this reminder type sent?
    const licenceIds = licences.map(l => l.id);
    const { data: alreadySent } = await supabase
      .from('licence_reminders')
      .select('licence_id')
      .eq('reminder_type', window.type)
      .in('licence_id', licenceIds);

    const sentSet = new Set((alreadySent || []).map(r => r.licence_id));
    const toSend = licences.filter(l => !sentSet.has(l.id));

    console.log(
      `[licenceReminders] ${window.type}: ${toSend.length} to send` +
      ` (${sentSet.size} already sent)`
    );

    for (const licence of toSend) {
      try {
        // Fetch candidate email and first name
        const { data: candidate } = await supabase
          .from('candidates')
          .select('id, email')
          .eq('id', licence.candidate_id)
          .maybeSingle();

        if (!candidate?.email) {
          console.warn(`[licenceReminders] No email for candidate ${licence.candidate_id} — skipping`);
          continue;
        }

        // Check genuine opt-out
        if (await isOptedOut(supabase, candidate.email)) {
          console.log(`[licenceReminders] ${candidate.email} opted out — skipping`);
          continue;
        }

        const { data: personal } = await supabase
          .from('personal_details')
          .select('first_name')
          .eq('candidate_id', licence.candidate_id)
          .maybeSingle();

        const firstName = personal?.first_name || 'there';

        const sent = await sendExpiryReminder({
          toEmail:      candidate.email,
          firstName,
          licenceType:  licence.licence_type,
          expiryDate:   licence.expiry_date,
          reminderType: window.type,
        });

        if (!sent) continue; // send() already logged; skip recording so it retries

        // Record the send (UNIQUE on licence_id + reminder_type — 23505 = already done)
        const { error: insertErr } = await supabase
          .from('licence_reminders')
          .insert({
            candidate_id:  licence.candidate_id,
            licence_id:    licence.id,
            reminder_type: window.type,
          });

        if (insertErr && insertErr.code !== '23505') {
          console.error(`[licenceReminders] Failed to record for licence ${licence.id}:`, insertErr.message);
        } else {
          console.log(`[licenceReminders] Sent ${window.type} → ${candidate.email}`);
          totalSent++;
        }
      } catch (err) {
        console.error(`[licenceReminders] Unexpected error for licence ${licence.id}:`, err.message);
      }
    }
  }

  console.log(`[licenceReminders] Run complete — ${totalSent} sent at ${new Date().toISOString()}`);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

module.exports = { runLicenceReminders };
