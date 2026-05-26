-- Allow a candidate to read interview slots booked to them
CREATE POLICY "interview_slots_candidate_read" ON interview_slots
  FOR SELECT TO authenticated
  USING (
    candidate_id IN (
      SELECT id FROM candidates
      WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );
