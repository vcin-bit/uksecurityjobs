ALTER TABLE job_applications
  ADD CONSTRAINT job_applications_interview_slot_id_fkey
  FOREIGN KEY (interview_slot_id)
  REFERENCES interview_slots(id)
  ON DELETE SET NULL;
