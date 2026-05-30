ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status = ANY (ARRAY['active', 'paused', 'ended']));
