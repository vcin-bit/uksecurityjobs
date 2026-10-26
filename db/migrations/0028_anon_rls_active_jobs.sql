-- Allow the anon role to read active direct jobs.
--
-- The public_active_jobs view uses SECURITY INVOKER (the default), so it runs
-- as the requesting role (anon). Without a policy on the underlying jobs table
-- the view returns 0 rows even though the GRANT on the view is in place.
--
-- This policy mirrors the WHERE clause in the view, so no extra rows are exposed.

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_active_direct_jobs"
  ON jobs
  FOR SELECT
  TO anon
  USING (
    status    = 'active'
    AND source = 'direct'
    AND (expires_at IS NULL OR expires_at > now())
  );
