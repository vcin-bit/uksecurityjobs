-- Migration 0016: candidate_nudges — track incomplete-profile reminder emails
-- ============================================================================
-- Prevents duplicate sends and provides an audit trail of which candidates
-- received which nudge type. The UNIQUE index on (candidate_id, nudge_type)
-- is the dedup guard — a DB-level race-condition safety net on top of the
-- application-level check in lib/nudges.js.

BEGIN;

CREATE TABLE candidate_nudges (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  nudge_type   TEXT        NOT NULL CHECK (nudge_type IN ('24h', '72h')),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dedup: one row per candidate per nudge type, ever.
CREATE UNIQUE INDEX candidate_nudges_dedup
  ON candidate_nudges (candidate_id, nudge_type);

-- Lookup index for the daily cron query.
CREATE INDEX candidate_nudges_candidate_id
  ON candidate_nudges (candidate_id);

COMMENT ON TABLE candidate_nudges IS
  'Tracks incomplete-profile reminder emails sent to candidates. '
  'One row per candidate per nudge type — insert fails (23505) if already sent.';

COMMIT;
