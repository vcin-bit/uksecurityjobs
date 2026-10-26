-- Reverts the mistaken anon RLS policy added earlier in this migration file.
--
-- public_active_jobs is a SECURITY DEFINER view (Postgres default), so it
-- already runs as the view owner and anon can query it via the GRANT on the
-- view alone — no policy on the underlying jobs table is needed or wanted.
--
-- The policy was dropped in production; this migration keeps the repo in sync.

DROP POLICY IF EXISTS "anon_read_active_direct_jobs" ON jobs;
