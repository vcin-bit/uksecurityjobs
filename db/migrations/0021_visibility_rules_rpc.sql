-- ── 0021_visibility_rules_rpc.sql ────────────────────────────────────────────
-- Atomic replace of candidate_employer_visibility rows for one candidate.
-- Called by PUT /api/candidates/me/visibility-rules via supabase.rpc() with
-- the service key. Validates talent_pool_enabled before any writes.
--
-- SECURITY DEFINER: runs as the function owner (postgres/service role), not
-- the calling user, so it can DELETE and INSERT regardless of RLS.
-- REVOKE from PUBLIC + GRANT to service_role: no direct client access.
-- SET search_path = public: prevents search_path injection.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION replace_candidate_visibility_rules(
  p_candidate_id uuid,
  p_rules        jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r            jsonb;
  v_employer_id uuid;
  v_rule        text;
BEGIN
  -- Validate all rows before touching the table.
  FOR r IN SELECT * FROM jsonb_array_elements(p_rules) LOOP
    v_employer_id := (r->>'employer_id')::uuid;
    v_rule        := r->>'rule';

    IF v_rule NOT IN ('allow', 'block') THEN
      RAISE EXCEPTION 'Invalid rule value: %. Must be allow or block.', v_rule;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM employers
      WHERE id = v_employer_id
        AND talent_pool_enabled = true
    ) THEN
      RAISE EXCEPTION 'Employer % is not a talent pool employer.', v_employer_id;
    END IF;
  END LOOP;

  -- Atomic replace.
  DELETE FROM candidate_employer_visibility
  WHERE candidate_id = p_candidate_id;

  FOR r IN SELECT * FROM jsonb_array_elements(p_rules) LOOP
    INSERT INTO candidate_employer_visibility (candidate_id, employer_id, rule)
    VALUES (
      p_candidate_id,
      (r->>'employer_id')::uuid,
      r->>'rule'
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION replace_candidate_visibility_rules(uuid, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION replace_candidate_visibility_rules(uuid, jsonb) TO service_role;
