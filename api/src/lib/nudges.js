'use strict';

// ── Incomplete-profile nudge runner ─────────────────────────────────────────
// Called daily by the node-cron job in server.js.
//
// Sends personalised reminder emails to candidates who signed up but haven't
// completed their profile:
//   24h nudge — friendly reminder, 20-28h after created_at
//   72h nudge — more urgent, 68-76h after created_at
//
// Dedup: candidate_nudges table (UNIQUE on candidate_id + nudge_type) ensures
// each nudge type is sent at most once per candidate, even if the cron fires
// slightly off-schedule or the server restarts mid-run.

const { supabase } = require('./supabase');
const { isProfileComplete } = require('../routes/candidates');
const email = require('./email');

const NUDGE_WINDOWS = [
  { type: '24h', minHours: 20, maxHours: 28 },
  { type: '72h', minHours: 68, maxHours: 76 },
];

async function runNudges() {
  console.log(`[nudges] Run started at ${new Date().toISOString()}`);
  for (const window of NUDGE_WINDOWS) {
    await sendNudgesForWindow(window.type, window.minHours, window.maxHours);
  }
  console.log(`[nudges] Run complete at ${new Date().toISOString()}`);
}

async function sendNudgesForWindow(nudgeType, minHours, maxHours) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - maxHours * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(now.getTime() - minHours * 60 * 60 * 1000).toISOString();

  // Fetch incomplete candidates who signed up in the time window.
  // profile_complete can be false or NULL (candidates created before the
  // backfill migration, or who never advanced past step 0).
  const { data: candidates, error } = await supabase
    .from('candidates')
    .select('id, email, profile_step')
    .or('profile_complete.eq.false,profile_complete.is.null')
    .not('email', 'is', null)
    .neq('email', '')
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd);

  if (error) {
    console.error(`[nudges] ${nudgeType}: query failed:`, error.message);
    return;
  }

  if (!candidates || candidates.length === 0) {
    console.log(`[nudges] ${nudgeType}: no candidates in window.`);
    return;
  }

  // Which of these have already received this nudge type?
  const candidateIds = candidates.map(c => c.id);
  const { data: alreadySent } = await supabase
    .from('candidate_nudges')
    .select('candidate_id')
    .eq('nudge_type', nudgeType)
    .in('candidate_id', candidateIds);

  const sentSet = new Set((alreadySent || []).map(r => r.candidate_id));
  const toNudge = candidates.filter(c => !sentSet.has(c.id));

  console.log(`[nudges] ${nudgeType}: ${toNudge.length} to send (${sentSet.size} already sent, ${candidates.length - toNudge.length - sentSet.size} filtered).`);

  for (const candidate of toNudge) {
    await nudgeOne(candidate, nudgeType);
  }
}

async function nudgeOne(candidate, nudgeType) {
  try {
    // Re-check completeness at send time — profile may have been completed
    // between the window query and now.
    const { missing } = await isProfileComplete(supabase, candidate.id);
    if (missing.length === 0) {
      console.log(`[nudges] Skipping ${candidate.id} — profile now complete.`);
      return;
    }

    // Get first name for personalisation (may be null if personal_details not yet saved).
    const { data: personal } = await supabase
      .from('personal_details')
      .select('first_name')
      .eq('candidate_id', candidate.id)
      .maybeSingle();

    const firstName = personal?.first_name || 'there';

    const sendFn = nudgeType === '24h' ? email.sendNudge24h : email.sendNudge72h;
    const sent = await sendFn({ toEmail: candidate.email, firstName, missing });

    if (!sent) {
      // send() already logged the SendGrid error — don't record the nudge so
      // it can be retried on the next cron run.
      return;
    }

    // Record the send. If the UNIQUE constraint fires (23505) another process
    // beat us to it — that's fine, not an error.
    const { error: insertError } = await supabase
      .from('candidate_nudges')
      .insert({ candidate_id: candidate.id, nudge_type: nudgeType });

    if (insertError && insertError.code !== '23505') {
      console.error(`[nudges] Failed to record nudge for ${candidate.id}:`, insertError.message);
    } else {
      console.log(`[nudges] Sent ${nudgeType} nudge → candidate ${candidate.id}`);
    }
  } catch (err) {
    console.error(`[nudges] Unexpected error for candidate ${candidate.id}:`, err.message);
  }
}

module.exports = { runNudges };
