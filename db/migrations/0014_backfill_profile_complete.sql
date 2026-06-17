-- Migration 0014: Backfill profile_complete from actual data
-- =============================================================
-- One-off data correction. Existing candidates have stale or NULL
-- profile_complete flags (previously set by profile_step >= 10,
-- which could drift from reality). This recomputes the flag using
-- the same 8-area check as the server-side isProfileComplete helper.
-- =============================================================

BEGIN;

UPDATE candidates c
SET profile_complete = (
  EXISTS (
    SELECT 1 FROM sia_licences sl
    WHERE sl.candidate_id = c.id AND sl.verified = true
  )
  AND EXISTS (
    SELECT 1 FROM personal_details pd
    WHERE pd.candidate_id = c.id AND pd.first_name IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM driving_details dd
    WHERE dd.candidate_id = c.id
  )
  AND EXISTS (
    SELECT 1 FROM preferred_sectors ps
    WHERE ps.candidate_id = c.id
  )
  AND EXISTS (
    SELECT 1 FROM qualifications q
    WHERE q.candidate_id = c.id
  )
  AND EXISTS (
    SELECT 1 FROM professional_background pb
    WHERE pb.candidate_id = c.id
  )
  AND EXISTS (
    SELECT 1 FROM employment_history eh
    WHERE eh.candidate_id = c.id
  )
  AND EXISTS (
    SELECT 1 FROM address_history ah
    WHERE ah.candidate_id = c.id
  )
);

COMMIT;
