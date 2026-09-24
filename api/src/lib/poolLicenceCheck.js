'use strict';

// ── Nightly pool licence expiry check ───────────────────────────────────────
// Called by the 02:00 UTC cron in server.js.
//
// For every talent_pool_members row with status 'active' or 'paused'
// (only rows where paused_reason IS NULL or 'licence_expired' — never touches
// 'do_not_use' or 'left' or any other manual pause reason):
//
//   No in-date verified licence (expiry_date IS NULL or < today):
//     active  → pause:   status='paused', paused_reason='licence_expired', paused_at=now()
//     paused  → no-op   (idempotent: paused_at not overwritten on re-run)
//
//   Has in-date verified licence (soonest expiry >= today):
//     paused (by licence_expired) → unpause: status='active', paused_reason=null, paused_at=null
//     active                      → update nearest_licence_expiry (idempotent: same value each run)
//
// Audit log written for every pause and unpause. No emails in this phase.
//
// Safe to run twice in a row with no further DB changes:
//   - Pause path:   already-paused row is a no-op (paused_at not overwritten).
//   - Unpause path: after first run the member is active; second run just
//                   refreshes nearest_licence_expiry (same value).
//   - Flag path:    nearest_licence_expiry written with same date each run.

const { supabase, auditLog } = require('./supabase');

async function runLicenceCheck() {
  console.log(`[licenceCheck] Run started at ${new Date().toISOString()}`);

  // 1. Fetch all members we are permitted to touch.
  //    Excludes 'do_not_use', 'left', and any paused_reason other than
  //    'licence_expired' (e.g. employer manual pauses).
  const { data: members, error: mErr } = await supabase
    .from('talent_pool_members')
    .select('id, candidate_id, employer_id, status, paused_reason, paused_at')
    .in('status', ['active', 'paused'])
    .or('paused_reason.is.null,paused_reason.eq.licence_expired');

  if (mErr) throw mErr;
  if (!members || members.length === 0) {
    console.log('[licenceCheck] No members to check.');
    return { paused: 0, unpaused: 0, flagged: 0 };
  }

  // 2. Bulk-fetch verified licences with expiry dates.
  const candidateIds = [...new Set(members.map(m => m.candidate_id))];

  const { data: licences, error: lErr } = await supabase
    .from('sia_licences')
    .select('candidate_id, expiry_date')
    .eq('verified', true)
    .not('expiry_date', 'is', null)
    .in('candidate_id', candidateIds);

  if (lErr) throw lErr;

  // For each candidate: find the soonest expiry_date that is >= today (YYYY-MM-DD).
  const todayStr = new Date().toISOString().slice(0, 10);

  // Map: candidate_id → soonest in-date expiry string, or null if none.
  const soonestExpiry = {};
  (licences || []).forEach(l => {
    if (!l.expiry_date || l.expiry_date < todayStr) return; // expired or missing
    if (!soonestExpiry[l.candidate_id] || l.expiry_date < soonestExpiry[l.candidate_id]) {
      soonestExpiry[l.candidate_id] = l.expiry_date;
    }
  });

  let paused = 0, unpaused = 0, flagged = 0;

  for (const member of members) {
    const expiry          = soonestExpiry[member.candidate_id] || null;
    const hasInDateLicence = expiry !== null;

    if (!hasInDateLicence) {
      // ── No in-date licence ───────────────────────────────────────────────
      if (member.status === 'active') {
        const { error: uErr } = await supabase
          .from('talent_pool_members')
          .update({
            status:                 'paused',
            paused_reason:          'licence_expired',
            paused_at:              new Date().toISOString(),
            nearest_licence_expiry: null,
          })
          .eq('id', member.id);

        if (uErr) {
          console.error(`[licenceCheck] Failed to pause member ${member.id}:`, uErr.message);
        } else {
          paused++;
          await auditLog({
            tableName:   'talent_pool_members',
            recordId:    member.id,
            action:      'UPDATE',
            performedBy: 'system:licence_check',
            changes:     { status: 'paused', paused_reason: 'licence_expired' },
          });
        }
      }
      // already paused → no-op (idempotent: paused_at not overwritten)

    } else {
      // ── Has in-date licence ──────────────────────────────────────────────
      if (member.status === 'paused' && member.paused_reason === 'licence_expired') {
        // Licence renewed — un-pause.
        const { error: uErr } = await supabase
          .from('talent_pool_members')
          .update({
            status:                 'active',
            paused_reason:          null,
            paused_at:              null,
            nearest_licence_expiry: expiry,
          })
          .eq('id', member.id);

        if (uErr) {
          console.error(`[licenceCheck] Failed to unpause member ${member.id}:`, uErr.message);
        } else {
          unpaused++;
          await auditLog({
            tableName:   'talent_pool_members',
            recordId:    member.id,
            action:      'UPDATE',
            performedBy: 'system:licence_check',
            changes:     { status: 'active', paused_reason: null },
          });
        }
      } else {
        // Already active — refresh nearest_licence_expiry (idempotent).
        const { error: uErr } = await supabase
          .from('talent_pool_members')
          .update({ nearest_licence_expiry: expiry })
          .eq('id', member.id);

        if (!uErr) flagged++;
        else console.error(`[licenceCheck] Failed to update expiry for ${member.id}:`, uErr.message);
      }
    }
  }

  console.log(
    `[licenceCheck] Done. Paused: ${paused}, Unpaused: ${unpaused}, Expiry flags updated: ${flagged}`
  );
  console.log(`[licenceCheck] Run complete at ${new Date().toISOString()}`);
  return { paused, unpaused, flagged };
}

// ── Nightly stale-invite purge ───────────────────────────────────────────────
// Called by the 02:00 UTC cron in server.js, sequentially after runLicenceCheck.
//
// Deletes talent_pool_invites rows where:
//   status IN ('declined', 'not_for_us', 'expired')
//   AND COALESCE(outcome_at, responded_at) < NOW() - INTERVAL '12 months'
//
// Rows with no outcome date (both columns NULL) are never touched.
// Rows with status 'invited', 'accepted', or 'passed' are never touched.
// The FK talent_pool_members.invite_id is ON DELETE SET NULL, so membership
// rows are left intact with invite_id nulled — confirmed delete_rule = SET NULL.
//
// Audit log written for every deleted row. Returns { purged: count }.

async function runInvitePurge() {
  console.log(`[invitePurge] Run started at ${new Date().toISOString()}`);

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffIso = cutoff.toISOString();

  // Supabase JS does not support COALESCE in filters, so use raw RPC / raw SQL
  // via the postgrest .rpc approach — or fetch eligible IDs first then delete.
  // We use a two-step approach: SELECT ids, then DELETE by id list, to stay
  // within the Supabase client's supported filter surface.

  // Step 1: find eligible rows.
  const { data: rows, error: sErr } = await supabase
    .from('talent_pool_invites')
    .select('id, employer_id, candidate_id, status, outcome_at, responded_at')
    .in('status', ['declined', 'not_for_us', 'expired']);

  if (sErr) throw sErr;

  // Apply the COALESCE(outcome_at, responded_at) < cutoff filter in JS.
  const eligible = (rows || []).filter(r => {
    const outcomeDate = r.outcome_at || r.responded_at;
    return outcomeDate && outcomeDate < cutoffIso;
  });

  if (eligible.length === 0) {
    console.log('[invitePurge] No stale invites to purge.');
    console.log(`[invitePurge] Run complete at ${new Date().toISOString()}`);
    return { purged: 0 };
  }

  const ids = eligible.map(r => r.id);

  // Step 2: delete by id list.
  const { error: dErr } = await supabase
    .from('talent_pool_invites')
    .delete()
    .in('id', ids);

  if (dErr) throw dErr;

  // Step 3: audit log each deletion (silent on individual failures).
  for (const row of eligible) {
    await auditLog({
      tableName:   'talent_pool_invites',
      recordId:    row.id,
      action:      'DELETE',
      performedBy: 'system:invite_purge',
      changes:     { status: row.status, purge_reason: 'stale_>12m' },
    });
  }

  console.log(`[invitePurge] Purged ${eligible.length} stale invite(s).`);
  console.log(`[invitePurge] Run complete at ${new Date().toISOString()}`);
  return { purged: eligible.length };
}

module.exports = { runLicenceCheck, runInvitePurge };
