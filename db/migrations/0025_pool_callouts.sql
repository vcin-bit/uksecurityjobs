-- ── 0025_pool_callouts.sql ───────────────────────────────────────────────────
-- talent_pool_callouts and talent_pool_callout_recipients were pre-created.
-- Adds the two missing timestamp columns, a unique index on recipients,
-- and revokes direct access from unauthenticated roles.
-- Applied: 2026-09-21

ALTER TABLE talent_pool_callouts
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS closed_at  timestamptz;

-- Prevents sending the same callout to the same candidate twice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_callout_recipient_unique
  ON talent_pool_callout_recipients (callout_id, candidate_id);

-- Service key is the only caller; block anon and authenticated roles entirely.
REVOKE ALL ON talent_pool_callouts           FROM anon, authenticated;
REVOKE ALL ON talent_pool_callout_recipients FROM anon, authenticated;

-- Verify after applying:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'talent_pool_callouts'
--     AND column_name IN ('created_at','closed_at');
--   → 2 rows
--
--   SELECT indexname FROM pg_indexes
--   WHERE indexname = 'idx_callout_recipient_unique';
--   → 1 row
