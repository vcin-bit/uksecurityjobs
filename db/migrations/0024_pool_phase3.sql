-- ── 0024_pool_phase3.sql ─────────────────────────────────────────────────────
-- Adds left_at to talent_pool_members and creates record_pool_pass function.
-- Applied: 2026-09-21

ALTER TABLE talent_pool_members
  ADD COLUMN IF NOT EXISTS left_at timestamp with time zone;

-- record_pool_pass: atomically passes an invite and creates a pool member.
-- Caller must supply employer_id; function rejects if the invite does not
-- belong to that employer or is not in 'accepted' status.
CREATE OR REPLACE FUNCTION record_pool_pass(
  p_invite_id     uuid,
  p_employer_id   uuid,
  p_performed_by  text,
  p_ip            text  DEFAULT NULL,
  p_outcome_notes text  DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv    talent_pool_invites%ROWTYPE;
  v_mem_id uuid;
BEGIN
  SELECT * INTO v_inv
  FROM   talent_pool_invites
  WHERE  id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND                          THEN RAISE EXCEPTION 'invite_not_found';      END IF;
  IF v_inv.employer_id <> p_employer_id THEN RAISE EXCEPTION 'invite_wrong_employer'; END IF;
  IF v_inv.status <> 'accepted'         THEN RAISE EXCEPTION 'invite_wrong_status';   END IF;

  UPDATE talent_pool_invites
  SET    status        = 'passed',
         outcome_at    = now(),
         outcome_notes = p_outcome_notes
  WHERE  id = p_invite_id;

  INSERT INTO talent_pool_members
    (employer_id, candidate_id, invite_id, status, consent_at, joined_at)
  VALUES
    (v_inv.employer_id, v_inv.candidate_id, v_inv.id, 'active', v_inv.consent_at, now())
  RETURNING id INTO v_mem_id;

  INSERT INTO audit_log (table_name, record_id, action, performed_by, ip_address)
  VALUES
    ('talent_pool_invites', p_invite_id, 'UPDATE', p_performed_by, p_ip),
    ('talent_pool_members', v_mem_id,    'INSERT', p_performed_by, p_ip);
END;
$$;

REVOKE ALL ON FUNCTION record_pool_pass(uuid, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
