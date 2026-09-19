-- 0019_add_jobs_badged_only.sql
-- Adds a per-job filter flag for BS7858-complete applicants.
-- Does not affect the apply gate — unbadged candidates can still apply;
-- this column only controls employer-side visibility.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS badged_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN jobs.badged_only IS
  'When true, only BS7858-complete candidates are shown in the employer
   applicant list for this job. Does not block application submission.';
