ALTER TABLE job_applications
  DROP CONSTRAINT IF EXISTS job_applications_status_check;
ALTER TABLE job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status = ANY (ARRAY[
    'applied','viewed','shortlisted',
    'interview_proposed','interview_confirmed','interview_completed',
    'offered','placed','rejected','no_show','withdrawn'
  ]));
