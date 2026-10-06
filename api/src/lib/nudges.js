'use strict';

// ── Incomplete-profile nudge runner ─────────────────────────────────────────
// Called daily by the node-cron job in server.js.
//
// Sends personalised reminder emails to candidates who signed up but haven't
// completed their profile:
//   24h nudge — friendly reminder, 20-28h after created_at
//   72h nudge — more urgent, 68-76h after created_at
//
// Also handles the SIA-licence enforcement lifecycle:
//   sendFinalWarnings() — day-7: email candidates who still have no SIA licence
//   runRemoval()        — day-14: delete accounts that ignored the final warning
//
// Dedup: candidate_nudges table (UNIQUE on candidate_id + nudge_type) ensures
// each nudge type is sent at most once per candidate, even if the cron fires
// slightly off-schedule or the server restarts mid-run.

const { supabase, auditLog } = require('./supabase');
const { isBS7858Ready, canApply } = require('../routes/candidates');
const email = require('./email');
const { createClerkClient } = require('@clerk/backend');

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

// Maps canApply() missing keys to display strings used in nudge emails.
// Driven by canApply() return values — won't drift from the apply gate.
const APPLY_LABEL = { sia: 'Verified SIA licence', personal: 'Personal details' };

async function nudgeOne(candidate, nudgeType) {
  try {
    // Re-check completeness at send time — profile may have been completed
    // between the window query and now.
    // Run both checks in parallel — canApply() drives the blocking split;
    // isBS7858Ready() provides the full badge-missing list.
    const [applyCheck, badgeCheck] = await Promise.all([
      canApply(supabase, candidate.id),
      isBS7858Ready(supabase, candidate.id),
    ]);
    if (badgeCheck.missing.length === 0) {
      console.log(`[nudges] Skipping ${candidate.id} — profile now complete.`);
      return;
    }

    // blocking: derived from canApply() — correct by construction, won't drift.
    // If a key has no label, canApply() has grown a new case we haven't handled —
    // log clearly and skip rather than silently sending the wrong email.
    const unmapped = applyCheck.missing.filter(m => !APPLY_LABEL[m]);
    if (unmapped.length > 0) {
      console.error(`[nudges] Unknown canApply() key(s) for ${candidate.id}: ${unmapped.join(', ')} — skipping nudge`);
      return;
    }
    const blocking = applyCheck.missing.map(m => APPLY_LABEL[m]);
    // badge: everything isBS7858Ready() flags that isn't already in blocking
    const blockingSet = new Set(blocking);
    const badge = badgeCheck.missing.filter(m => !blockingSet.has(m));

    // Get first name for personalisation (may be null if personal_details not yet saved).
    const { data: personal } = await supabase
      .from('personal_details')
      .select('first_name')
      .eq('candidate_id', candidate.id)
      .maybeSingle();

    const firstName = personal?.first_name || 'there';

    const sendFn = nudgeType === '24h' ? email.sendNudge24h : email.sendNudge72h;
    const sent = await sendFn({ toEmail: candidate.email, firstName, blocking, badge });

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

// ── Final warning: candidates with no SIA licence 7+ days after signup ───────
//
// Selects candidates who:
//   - created_at >= 7 days ago (no upper bound — catches anyone long overdue)
//   - have no row in sia_licences (any status) — detected via embedded relation
//   - have not already received a 'final_warning' nudge
//
// Sends the final-warning email and records nudge_type='final_warning'.
// Returns the number of warning emails successfully sent.

async function sendFinalWarnings() {
  console.log(`[nudges] sendFinalWarnings started at ${new Date().toISOString()}`);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Load candidates created 7+ days ago with sia_licences embedded.
  // An empty sia_licences array means no licence exists for that candidate.
  const { data: candidates, error: candErr } = await supabase
    .from('candidates')
    .select('id, email, created_at, sia_licences(id)')
    .not('email', 'is', null)
    .neq('email', '')
    .lte('created_at', sevenDaysAgo);

  if (candErr) {
    console.error('[nudges] sendFinalWarnings: candidates query failed — aborting:', candErr.message);
    return 0;
  }
  if (!candidates || candidates.length === 0) {
    console.log('[nudges] sendFinalWarnings: no candidates found.');
    return 0;
  }

  // Keep only candidates with no SIA licence row.
  const unlicensed = candidates.filter(c => c.sia_licences.length === 0);
  if (unlicensed.length === 0) {
    console.log('[nudges] sendFinalWarnings: all candidates already have a licence.');
    return 0;
  }

  // Which of the unlicensed have already received a final_warning?
  const unlicensedIds = unlicensed.map(c => c.id);
  const { data: alreadyWarned, error: warnErr } = await supabase
    .from('candidate_nudges')
    .select('candidate_id')
    .eq('nudge_type', 'final_warning')
    .in('candidate_id', unlicensedIds);

  if (warnErr) {
    console.error('[nudges] sendFinalWarnings: nudge lookup failed — aborting:', warnErr.message);
    return 0;
  }

  const warnedSet = new Set((alreadyWarned || []).map(r => r.candidate_id));
  const toWarn = unlicensed.filter(c => !warnedSet.has(c.id));

  console.log(
    `[nudges] sendFinalWarnings: ${toWarn.length} to warn ` +
    `(${candidates.length - unlicensed.length} have licences, ${warnedSet.size} already warned).`
  );

  // Deadline is 7 days from today (day of send).
  const deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  let warnedCount = 0;

  for (const candidate of toWarn) {
    try {
      const { data: personal } = await supabase
        .from('personal_details')
        .select('first_name')
        .eq('candidate_id', candidate.id)
        .maybeSingle();

      const firstName = personal?.first_name || 'there';

      const sent = await email.sendFinalWarningEmail({
        toEmail: candidate.email,
        firstName,
        deadlineDate,
      });

      if (!sent) continue; // send() already logged; skip recording so it retries

      const { error: insertError } = await supabase
        .from('candidate_nudges')
        .insert({ candidate_id: candidate.id, nudge_type: 'final_warning' });

      if (insertError && insertError.code !== '23505') {
        console.error(`[nudges] Failed to record final_warning for ${candidate.id}:`, insertError.message);
      } else {
        console.log(`[nudges] Sent final_warning → candidate ${candidate.id}`);
        warnedCount++;
      }
    } catch (err) {
      console.error(`[nudges] sendFinalWarnings: unexpected error for ${candidate.id}:`, err.message);
    }
  }

  console.log(`[nudges] sendFinalWarnings complete — ${warnedCount} sent at ${new Date().toISOString()}`);
  return warnedCount;
}

// ── Removal job: delete accounts that ignored the final warning ───────────────
//
// Selects candidates who:
//   - received a 'final_warning' nudge >= 7 days ago
//   - still have no SIA licence row — detected via embedded sia_licences(id)
//
// Skips any with rows in interview_slots or interview_feedback (manual review).
// Gated by CANDIDATE_REMOVAL_ENABLED env var (default: dry-run only).
//
// Returns { removed, wouldRemove, skipped } where:
//   removed     — count of successfully deleted accounts (live mode)
//   wouldRemove — array of { id, email, created_at } (dry-run mode only)
//   skipped     — count skipped due to interview activity

async function runRemoval() {
  const enabled = process.env.CANDIDATE_REMOVAL_ENABLED === 'true';
  console.log(`[nudges] runRemoval started at ${new Date().toISOString()} (${enabled ? 'LIVE' : 'DRY RUN'})`);

  const EMPTY = { removed: 0, wouldRemove: [], skipped: 0 };
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Candidates whose final_warning was sent >= 7 days ago.
  const { data: warnedNudges, error: nudgeErr } = await supabase
    .from('candidate_nudges')
    .select('candidate_id, created_at')
    .eq('nudge_type', 'final_warning')
    .lte('created_at', sevenDaysAgo);

  if (nudgeErr) {
    console.error('[nudges] runRemoval: nudge query failed — aborting:', nudgeErr.message);
    return EMPTY;
  }
  if (!warnedNudges || warnedNudges.length === 0) {
    console.log('[nudges] runRemoval: no expired final warnings.');
    return EMPTY;
  }

  const warnedIds = warnedNudges.map(r => r.candidate_id);

  // Load candidate rows with sia_licences embedded.
  // An empty sia_licences array means the candidate still has no licence.
  const { data: candidateRows, error: candErr } = await supabase
    .from('candidates')
    .select('id, email, clerk_user_id, created_at, sia_licences(id)')
    .in('id', warnedIds);

  if (candErr) {
    console.error('[nudges] runRemoval: candidates query failed — aborting:', candErr.message);
    return EMPTY;
  }

  // Keep only candidates still without a licence.
  const unlicensed = (candidateRows || []).filter(c => c.sia_licences.length === 0);

  if (unlicensed.length === 0) {
    console.log('[nudges] runRemoval: all warned candidates have since added a licence.');
    return EMPTY;
  }

  const unlicensedIds = unlicensed.map(c => c.id);

  // Check for interview activity — skip those for manual review.
  const { data: withSlots, error: slotsErr } = await supabase
    .from('interview_slots')
    .select('candidate_id')
    .in('candidate_id', unlicensedIds);

  if (slotsErr) {
    console.error('[nudges] runRemoval: interview_slots query failed — aborting:', slotsErr.message);
    return EMPTY;
  }

  const { data: withFeedback, error: feedbackErr } = await supabase
    .from('interview_feedback')
    .select('candidate_id')
    .in('candidate_id', unlicensedIds);

  if (feedbackErr) {
    console.error('[nudges] runRemoval: interview_feedback query failed — aborting:', feedbackErr.message);
    return EMPTY;
  }

  const skipSet = new Set([
    ...(withSlots || []).map(r => r.candidate_id),
    ...(withFeedback || []).map(r => r.candidate_id),
  ]);

  const toRemove = unlicensed.filter(c => !skipSet.has(c.id));
  const skippedCount = unlicensed.length - toRemove.length;

  if (skippedCount > 0) {
    const skippedIds = unlicensed.filter(c => skipSet.has(c.id)).map(c => c.id);
    console.warn(
      `[nudges] runRemoval: ${skippedCount} candidate(s) skipped (interview activity — manual review needed): ${skippedIds.join(', ')}`
    );
  }

  if (!enabled) {
    const wouldRemove = toRemove.map(c => ({ id: c.id, email: c.email, created_at: c.created_at }));
    console.log(`[nudges] runRemoval DRY RUN — would remove ${wouldRemove.length} candidate(s):`);
    for (const c of wouldRemove) {
      console.log(`  id=${c.id} email=${c.email} created_at=${c.created_at}`);
    }
    return { removed: 0, wouldRemove, skipped: skippedCount };
  }

  // Live removal.
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  let removedCount = 0;

  for (const candidate of toRemove) {
    try {
      // Delete only the candidates row — FK ON DELETE CASCADE handles:
      // candidate_nudges, candidate_employer_visibility, talent_pool_invites,
      // talent_pool_members, talent_pool_callout_recipients.
      const { error: delErr } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidate.id);

      if (delErr) {
        console.error(`[nudges] runRemoval: delete failed for candidate ${candidate.id}:`, delErr.message);
        continue; // leave this candidate in place; try again next run
      }

      // Delete Clerk user only after the DB row is confirmed gone.
      if (candidate.clerk_user_id) {
        try {
          await clerk.users.deleteUser(candidate.clerk_user_id);
        } catch (clerkErr) {
          console.error(
            `[nudges] runRemoval: Clerk delete failed for ${candidate.clerk_user_id}:`,
            clerkErr.message
          );
          // Continue — Supabase row is already gone; a Clerk orphan is preferable to leaving the row.
        }
      }

      // Audit log — written only after the DB delete succeeded.
      await auditLog({
        tableName:   'candidates',
        recordId:    candidate.id,
        action:      'candidate_auto_removed',
        performedBy: 'system',
        ipAddress:   null,
        changes: {
          reason:     'No SIA licence added within 7 days of final warning email',
          email:      candidate.email,
          created_at: candidate.created_at,
        },
      });

      console.log(`[nudges] runRemoval: removed candidate ${candidate.id} (${candidate.email})`);
      removedCount++;
    } catch (err) {
      console.error(`[nudges] runRemoval: unexpected error for candidate ${candidate.id}:`, err.message);
    }
  }

  console.log(`[nudges] runRemoval complete — ${removedCount} removed at ${new Date().toISOString()}`);
  return { removed: removedCount, wouldRemove: [], skipped: skippedCount };
}

module.exports = { runNudges, sendFinalWarnings, runRemoval };
