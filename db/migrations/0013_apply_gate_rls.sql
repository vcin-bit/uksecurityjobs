-- Migration 0013: Tighten job_applications INSERT to require profile_complete
-- =============================================================================
-- The API now rejects applications from incomplete profiles, but the RLS
-- policy on job_applications still allows any authenticated candidate to
-- insert directly via the Supabase client. This migration replaces the
-- INSERT policy with one that also checks candidates.profile_complete = true.
-- =============================================================================

BEGIN;

-- Drop the old insert-only policy
DROP POLICY IF EXISTS "job_applications_insert_candidate" ON job_applications;

-- Recreate with profile_complete gate
CREATE POLICY "job_applications_insert_candidate" ON job_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    candidate_id IN (
      SELECT id FROM candidates
      WHERE clerk_user_id = (auth.jwt() ->> 'sub')
        AND profile_complete = true
    )
  );

COMMIT;
