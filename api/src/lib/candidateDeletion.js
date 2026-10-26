'use strict';

const { supabase, auditLog } = require('./supabase');
const { createClerkClient } = require('@clerk/backend');

const STORAGE_BUCKET = 'candidate-photos';

function extractStoragePath(url) {
  if (!url) return null;
  const marker = `/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length).split('?')[0];
}

async function isEmployerAccount(clerkUserId) {
  const { data } = await supabase
    .from('employers')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();
  return !!data;
}

// 404 → return false. Any OTHER Clerk error → throw (caller decides what to do).
async function isAdminAccount(clerkUserId) {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  try {
    const u = await clerk.users.getUser(clerkUserId);
    return u.publicMetadata?.role === 'admin';
  } catch (err) {
    const status = err.status ?? err.statusCode ?? null;
    if (status === 404) return false;
    throw err; // 401/403/429/5xx — propagate so caller can treat as check failure
  }
}

/**
 * Fully delete one candidate account.
 * Returns { storage_deleted, storage_errors, clerk_status }
 * Throws on any DB failure (steps 1-4).
 * Storage/Clerk failures after DB delete are non-fatal but reflected in return value.
 *
 * clerk_status values:
 *   'deleted'             — Clerk user successfully deleted
 *   'already_gone'        — Clerk returned 404 (already deleted) or clerk_user_id was null
 *   'kept_employer_admin' — Clerk user is employer or admin, intentionally kept
 *   'kept_check_failed'   — employer/admin check threw; Clerk user kept as precaution
 *   'error'               — Clerk deleteUser threw a non-404 error
 */
async function deleteCandidateAccount(candidateId, { performedBy, auditChanges }) {
  // 1. Fetch candidate + licence image paths before any deletes
  const { data: candidate, error: fetchErr } = await supabase
    .from('candidates')
    .select('id, clerk_user_id, photo_url, sia_licences(front_image_url, back_image_url)')
    .eq('id', candidateId)
    .single();

  if (fetchErr || !candidate) {
    throw new Error(`fetch failed: ${fetchErr?.message ?? 'not found'}`);
  }

  const storagePaths = [
    extractStoragePath(candidate.photo_url),
    ...(candidate.sia_licences || []).flatMap(l => [
      extractStoragePath(l.front_image_url),
      extractStoragePath(l.back_image_url),
    ]),
  ].filter(Boolean);

  // 2. interview_slots — NO ACTION FK: must delete before candidates row
  const { error: slotsErr } = await supabase
    .from('interview_slots').delete().eq('candidate_id', candidateId);
  if (slotsErr) throw new Error(`interview_slots delete failed: ${slotsErr.message}`);

  // 3. interview_feedback — NO ACTION FK: must delete before candidates row
  const { error: feedbackErr } = await supabase
    .from('interview_feedback').delete().eq('candidate_id', candidateId);
  if (feedbackErr) throw new Error(`interview_feedback delete failed: ${feedbackErr.message}`);

  // 4. candidates row — CASCADE handles remaining child tables
  const { error: delErr } = await supabase
    .from('candidates').delete().eq('id', candidateId);
  if (delErr) throw new Error(`candidates delete failed: ${delErr.message}`);

  // DB is clean. Steps 5-7 are non-fatal after this point.

  // 5. Storage
  let storage_deleted = 0;
  let storage_errors = 0;
  if (storagePaths.length > 0) {
    const { error: storErr } = await supabase.storage
      .from(STORAGE_BUCKET).remove(storagePaths);
    if (storErr) {
      console.error(`[candidateDeletion] Storage remove failed for ${candidateId}:`, storErr.message);
      storage_errors = storagePaths.length;
    } else {
      storage_deleted = storagePaths.length;
    }
  }

  // 6. Clerk user — employer/admin guard
  let clerk_status;
  if (!candidate.clerk_user_id) {
    clerk_status = 'already_gone';
  } else {
    let keepClerk = false;
    let checkFailed = false;

    try {
      const employer = await isEmployerAccount(candidate.clerk_user_id);
      const admin    = !employer && await isAdminAccount(candidate.clerk_user_id);
      keepClerk = employer || admin;
    } catch (checkErr) {
      console.error(
        `[candidateDeletion] employer/admin check failed for ${candidate.clerk_user_id}:`,
        checkErr.message
      );
      keepClerk   = true;  // keep as precaution
      checkFailed = true;
    }

    if (checkFailed) {
      clerk_status = 'kept_check_failed';
    } else if (keepClerk) {
      console.warn(
        `[candidateDeletion] Clerk user kept (employer/admin): ${candidate.clerk_user_id} candidate=${candidateId}`
      );
      clerk_status = 'kept_employer_admin';
    } else {
      try {
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        await clerk.users.deleteUser(candidate.clerk_user_id);
        clerk_status = 'deleted';
      } catch (clerkErr) {
        const status = clerkErr.status ?? clerkErr.statusCode ?? null;
        if (status === 404) {
          clerk_status = 'already_gone';
        } else {
          console.error(
            `[candidateDeletion] Clerk deleteUser failed for ${candidate.clerk_user_id}:`,
            clerkErr.message
          );
          clerk_status = 'error';
        }
      }
    }
  }

  // 7. Audit log
  await auditLog({
    tableName:   'candidates',
    recordId:    candidateId,
    action:      'DELETE',
    performedBy,
    ipAddress:   null,
    changes: {
      ...auditChanges,
      storage_deleted,
      storage_errors,
      clerk_status,
    },
  });

  return { storage_deleted, storage_errors, clerk_status };
}

module.exports = { deleteCandidateAccount, isAdminAccount, isEmployerAccount };
