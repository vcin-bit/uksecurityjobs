-- 0018: Constrain aggregated job sources to Reed only; remove Adzuna.
--
-- Migration 0017 already added: source, source_url, external_id, last_seen_at
-- and the jobs_source_external_dedup unique index on (source, external_id).
--
-- This migration:
--   1. Removes any adzuna rows ingested before Adzuna was dropped (safety net —
--      the cron may not have fired yet, but be defensive).
--   2. Adds a CHECK constraint limiting source to 'direct' or 'reed'.
--
-- The unique index from 0017 covers (source, external_id) with no WHERE clause.
-- NULL external_id values (all direct jobs) never conflict in SQL (NULL != NULL),
-- so direct jobs remain unconstrained — functionally equivalent to WHERE source != 'direct'.

DELETE FROM jobs WHERE source = 'adzuna';

ALTER TABLE jobs
  ADD CONSTRAINT jobs_source_check CHECK (source IN ('direct', 'reed'));
