#!/usr/bin/env node
/**
 * scripts/remove-unlicensed-candidates.js
 *
 * One-off bulk removal of candidates who have completed the winback sequence
 * without adding an SIA licence:
 *   - no row in sia_licences, AND
 *   - their latest guard_emails winback2 was sent more than 7 days ago
 *
 * Dry-run by default. Pass --live to perform actual deletions.
 *
 * Per-candidate order (live mode):
 *   1. Skip-check: abort if interview_slots or interview_feedback rows exist
 *   2. Delete candidates row (CASCADE: nudges, visibility, pool tables)
 *   3. Delete Storage files (candidate-photos bucket) if photo_url is set
 *   4. Delete Clerk user
 *   5. Write audit_log entry
 *
 * Usage:
 *   node scripts/remove-unlicensed-candidates.js           # dry run (default)
 *   node scripts/remove-unlicensed-candidates.js --live    # live deletions
 */

'use strict';

const path = require('path');

// ── Env + deps from api/ ─────────────────────────────────────────────────────
require(path.join(__dirname, '../api/node_modules/dotenv')).config({
  path: path.join(__dirname, '../api/.env'),
});

const { createClient } = require(
  path.join(__dirname, '../api/node_modules/@supabase/supabase-js')
);
const { createClerkClient } = require(
  path.join(__dirname, '../api/node_modules/@clerk/backend')
);
const { deleteCandidateAccount } = require(
  path.join(__dirname, '../api/src/lib/candidateDeletion')
);

// ── Config ───────────────────────────────────────────────────────────────────
const LIVE = process.argv.includes('--live');
const STORAGE_BUCKET = 'candidate-photos';

for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'CLERK_SECRET_KEY']) {
  if (!process.env[key]) {
    console.error(`[remove-unlicensed-candidates] Missing env var: ${key}`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the storage object path from a Supabase photo_url.
 * Handles both public and signed URL formats:
 *   .../storage/v1/object/public/candidate-photos/<path>
 *   .../storage/v1/object/sign/candidate-photos/<path>?token=...
 * Returns null if the URL doesn't reference candidate-photos.
 */
function extractStoragePath(url) {
  if (!url) return null;
  const marker = `/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length).split('?')[0];
}

/**
 * Look up a Clerk user by ID.
 * Returns { status: 'found', user } if the user exists.
 * Returns { status: 'not-found' } if Clerk returns 404.
 * THROWS for any other error (401, 403, 429, 5xx) — caller must abort the run.
 */
async function clerkLookup(clerkUserId) {
  try {
    const user = await clerk.users.getUser(clerkUserId);
    return { status: 'found', user };
  } catch (err) {
    const status = err.status ?? err.statusCode ?? null;
    if (status === 404) return { status: 'not-found' };
    // Any other error means the key is broken or Clerk is unavailable — abort.
    throw Object.assign(
      new Error(`Clerk API error (status ${status ?? 'unknown'}): ${err.message}`),
      { clerkStatus: status }
    );
  }
}

/**
 * Go/no-go gate: look up 3 candidates with a verified SIA licence.
 * All 3 must be FOUND in Clerk — proves the key is valid and pointing at the
 * right instance before we touch anything.
 * Exits non-zero on failure.
 */
async function runGateCheck() {
  console.log('[gate] Checking Clerk key against 3 licenced candidates...');

  const { data: controls, error: ctrlErr } = await supabase
    .from('candidates')
    .select('id, clerk_user_id, sia_licences!inner(id)')
    .eq('sia_licences.verified', true)
    .not('clerk_user_id', 'is', null)
    .limit(3);

  if (ctrlErr || !controls || controls.length < 3) {
    console.error('[gate] Could not fetch 3 licenced control candidates:', ctrlErr?.message ?? 'insufficient rows');
    process.exit(1);
  }

  for (const c of controls) {
    let result;
    try {
      result = await clerkLookup(c.clerk_user_id);
    } catch (err) {
      console.error(`[gate] Clerk key check failed — ${err.message}`);
      console.error('[gate] Aborting: fix CLERK_SECRET_KEY before retrying.');
      process.exit(1);
    }
    if (result.status === 'not-found') {
      console.error(`[gate] Clerk key check failed — control candidate ${c.id} not found in Clerk (404).`);
      console.error('[gate] Aborting: key may be pointing at the wrong Clerk instance.');
      process.exit(1);
    }
    console.log(`[gate]   ${c.id} — FOUND`);
  }

  console.log('[gate] Clerk key OK.\n');
}

/** Write to audit_log. Never throws — failures are logged and swallowed. */
async function writeAuditLog(candidateId, candidateCreatedAt) {
  // audit_log.action CHECK constraint only allows: INSERT, UPDATE, DELETE, READ.
  // Use DELETE (correct semantic) and carry full context in changes.
  const { error } = await supabase.from('audit_log').insert({
    table_name:   'candidates',
    record_id:    candidateId,
    action:       'DELETE',
    performed_by: 'admin-script',
    ip_address:   null,
    changes: {
      reason:               'no SIA licence after winback sequence',
      script:               'remove-unlicensed-candidates',
      candidate_created_at: candidateCreatedAt,
    },
  });
  if (error) {
    console.error(`  [audit_log] write failed for ${candidateId}: ${error.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n[remove-unlicensed-candidates] mode=${LIVE ? 'LIVE' : 'DRY RUN'}`);
  console.log(`[remove-unlicensed-candidates] ${new Date().toISOString()}\n`);

  // ── Gate: verify Clerk key before touching anything ───────────────────────
  await runGateCheck();

  // ── Step 1: Build target cohort ───────────────────────────────────────────
  // Fetch ALL winback2 guard_emails and compute latest per candidate in JS,
  // so we don't miss candidates who received a newer winback2 recently
  // (they should NOT be in the cohort even if they have an older one > 7d).

  const { data: allWinback2, error: w2Err } = await supabase
    .from('guard_emails')
    .select('candidate_id, sent_at')
    .eq('email_type', 'winback2');

  if (w2Err) {
    console.error('[remove-unlicensed-candidates] guard_emails query failed:', w2Err.message);
    process.exit(1);
  }

  // Latest winback2 sent_at per candidate
  const latestWinback2 = {};
  for (const row of allWinback2 || []) {
    if (!latestWinback2[row.candidate_id] || row.sent_at > latestWinback2[row.candidate_id]) {
      latestWinback2[row.candidate_id] = row.sent_at;
    }
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const winback2Ids = Object.keys(latestWinback2).filter(
    id => latestWinback2[id] < sevenDaysAgo
  );

  if (winback2Ids.length === 0) {
    console.log('[remove-unlicensed-candidates] No candidates in winback2 cohort. Nothing to do.');
    process.exit(0);
  }

  // Fetch candidate rows with embedded sia_licences
  const { data: candidateRows, error: candErr } = await supabase
    .from('candidates')
    .select('id, clerk_user_id, photo_url, created_at, sia_licences(id)')
    .in('id', winback2Ids);

  if (candErr) {
    console.error('[remove-unlicensed-candidates] candidates query failed:', candErr.message);
    process.exit(1);
  }

  // Keep only those with no licence
  const targets = (candidateRows || []).filter(c => (c.sia_licences || []).length === 0);
  console.log(`Targeted: ${targets.length} candidates (winback2 > 7 days ago, no SIA licence)\n`);

  if (targets.length === 0) {
    console.log('[remove-unlicensed-candidates] All winback2 candidates have since added a licence.');
    process.exit(0);
  }

  // ── Step 2: Interview skip-check ──────────────────────────────────────────
  const targetIds = targets.map(c => c.id);

  const [{ data: withSlots, error: slotsErr }, { data: withFeedback, error: feedbackErr }] =
    await Promise.all([
      supabase.from('interview_slots').select('candidate_id').in('candidate_id', targetIds),
      supabase.from('interview_feedback').select('candidate_id').in('candidate_id', targetIds),
    ]);

  if (slotsErr) {
    console.error('[remove-unlicensed-candidates] interview_slots query failed:', slotsErr.message);
    process.exit(1);
  }
  if (feedbackErr) {
    console.error('[remove-unlicensed-candidates] interview_feedback query failed:', feedbackErr.message);
    process.exit(1);
  }

  const skipSet = new Set([
    ...(withSlots || []).map(r => r.candidate_id),
    ...(withFeedback || []).map(r => r.candidate_id),
  ]);

  const toRemove = targets.filter(c => !skipSet.has(c.id));
  const skipped  = targets.filter(c =>  skipSet.has(c.id));

  // ── Step 3: Fetch employer clerk_user_ids (safety: never delete these) ────
  const { data: employerRows, error: empErr } = await supabase
    .from('employers')
    .select('clerk_user_id');
  if (empErr) {
    console.error('[remove-unlicensed-candidates] employers query failed:', empErr.message);
    process.exit(1);
  }
  const employerClerkIds = new Set((employerRows || []).map(e => e.clerk_user_id).filter(Boolean));

  // ── Step 4: Dry-run checks (Clerk existence, employer/admin guard, storage) ─
  let clerkFound      = 0;
  let clerkNotFound   = 0;
  let clerkKept       = 0; // found but employer or admin — Clerk account would be kept
  let storageCount    = 0;
  const storageByCandidate = {};

  for (const c of toRemove) {
    // Storage
    const storagePath = extractStoragePath(c.photo_url);
    storageByCandidate[c.id] = storagePath;
    if (storagePath) storageCount++;

    // Clerk check (read-only, safe in dry-run)
    if (c.clerk_user_id) {
      const result = await clerkLookup(c.clerk_user_id);
      // clerkLookup throws on non-404 errors — propagates to main().catch() → exit 1
      if (result.status === 'found') {
        const isEmployer = employerClerkIds.has(c.clerk_user_id);
        const isAdmin    = result.user?.publicMetadata?.role === 'admin';
        if (isEmployer || isAdmin) {
          clerkKept++;
          console.log(`  [${c.id}] Clerk user would be KEPT (${isAdmin ? 'admin' : 'employer'}): ${c.clerk_user_id}`);
        } else {
          clerkFound++;
        }
      } else {
        clerkNotFound++; // 404 = already deleted from Clerk
      }
    } else {
      clerkNotFound++;
    }
  }

  // ── Step 5a: Dry-run report ────────────────────────────────────────────────
  if (!LIVE) {
    console.log('── DRY RUN SUMMARY ─────────────────────────────────────────');
    console.log(`  Targeted:                    ${targets.length}`);
    console.log(`  Would remove:                ${toRemove.length}`);
    console.log(`  Skipped (interview):         ${skipped.length}`);
    console.log(`  Storage files to del:        ${storageCount}`);
    console.log(`  Clerk users to delete:       ${clerkFound}`);
    console.log(`  Clerk users KEPT (emp/admin):${clerkKept}`);
    console.log(`  Clerk users not found (404): ${clerkNotFound}`);
    if (skipped.length > 0) {
      console.log(`\n  Skipped IDs (interview activity — manual review):`);
      for (const c of skipped) console.log(`    ${c.id}`);
    }
    if (storageCount > 0) {
      console.log(`\n  Storage files that would be deleted:`);
      for (const [id, p] of Object.entries(storageByCandidate)) {
        if (p) console.log(`    ${id}  →  ${STORAGE_BUCKET}/${p}`);
      }
    }
    console.log('\n  Pass --live to execute.\n');
    return;
  }

  // ── Step 5b: Live removal ─────────────────────────────────────────────────
  console.log(`── LIVE REMOVAL — ${toRemove.length} candidates ─────────────────────────────`);
  if (skipped.length > 0) {
    console.warn(
      `  Skipping ${skipped.length} candidate(s) with interview activity (manual review needed):\n` +
      skipped.map(c => `    ${c.id}`).join('\n')
    );
  }

  let removedCount = 0;

  for (const candidate of toRemove) {
    try {
      const result = await deleteCandidateAccount(candidate.id, {
        performedBy:  'admin-script',
        auditChanges: {
          reason:               'no SIA licence after winback sequence',
          script:               'remove-unlicensed-candidates',
          candidate_created_at: candidate.created_at,
        },
      });

      if (result.clerk_status === 'error' || result.clerk_status === 'kept_check_failed') {
        console.error(`  [${candidate.id}] clerk_status=${result.clerk_status} — STOPPING RUN`);
        console.error(`  Removed so far: ${removedCount}  Remaining: ${toRemove.length - removedCount - 1}`);
        process.exit(1);
      }

      console.log(`  [${candidate.id}] removed (clerk_status=${result.clerk_status})`);
      removedCount++;
    } catch (err) {
      console.error(`  [${candidate.id}] DB error — ${err.message}`);
    }
  }

  console.log('\n── LIVE REMOVAL COMPLETE ───────────────────────────────────');
  console.log(`  Targeted:                    ${targets.length}`);
  console.log(`  Removed:                     ${removedCount}`);
  console.log(`  Skipped (interview):         ${skipped.length}`);
  console.log(`  Completed at:        ${new Date().toISOString()}\n`);
}

main().catch(err => {
  console.error('[remove-unlicensed-candidates] Fatal:', err);
  process.exit(1);
});
