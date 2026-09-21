-- ── 0023_talent_pool_invite_unique.sql ──────────────────────────────────────
-- Partial unique index: prevents duplicate open invites from the same employer
-- to the same candidate. Only one invite may be in 'invited', 'accepted', or
-- 'call_booked' status at a time per (employer_id, candidate_id) pair.
-- 'declined', 'passed', 'not_for_us', 'expired' are excluded — a new invite
-- is allowed after any terminal status.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_tpi_open_invite_unique
  ON talent_pool_invites (employer_id, candidate_id)
  WHERE status IN ('invited', 'accepted', 'call_booked');

-- Verify after applying:
--   SELECT indexname, indexdef
--   FROM   pg_indexes
--   WHERE  indexname = 'idx_tpi_open_invite_unique';
-- Expected: one row with the partial index definition.
