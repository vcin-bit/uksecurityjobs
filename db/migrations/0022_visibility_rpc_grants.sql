-- ── 0022_visibility_rpc_grants.sql ───────────────────────────────────────────
-- Supabase grants EXECUTE to anon and authenticated on new functions by
-- default, so the REVOKE FROM PUBLIC in 0021 is not sufficient.
-- Explicitly revoke from the two JWT roles that clients can assume.
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION replace_candidate_visibility_rules(uuid, jsonb)
  FROM anon, authenticated;

-- Verify after applying:
--   SELECT grantee, privilege_type
--   FROM   information_schema.routine_privileges
--   WHERE  routine_name = 'replace_candidate_visibility_rules';
-- Expected rows: service_role EXECUTE (and postgres EXECUTE if shown).
-- anon and authenticated must NOT appear.
