-- 0017: Add source tracking and aggregated job support to the jobs table.
--
-- Existing direct employer jobs are unaffected:
--   source defaults to 'direct', external_id remains NULL.
-- NULL values are never equal in SQL unique indexes, so multiple direct
-- jobs with external_id=NULL will never conflict on jobs_source_external_dedup.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS source       TEXT NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS source_url   TEXT,
  ADD COLUMN IF NOT EXISTS external_id  TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Dedup index: prevents duplicate ingestion of aggregated jobs.
-- Relies on NULL != NULL behaviour — direct jobs are never constrained.
CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_external_dedup
  ON jobs (source, external_id);
