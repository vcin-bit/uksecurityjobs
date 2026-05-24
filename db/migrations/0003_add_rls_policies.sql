-- Migration 0003: Add RLS policies for 5 uncovered tables
-- These tables had RLS enabled but no policies. Adding policies
-- so that, once RLS is enforced (per-user client, Phase B),
-- access is correctly scoped. Pattern matches existing policies:
-- current_setting('app.current_user_id', true) joined through
-- candidates.clerk_user_id / employers.clerk_user_id.

-- candidate_ratings: employer-only (the rating employer has full
-- access; the rated candidate has no access)
CREATE POLICY "candidate_ratings: employer only" ON candidate_ratings
  FOR ALL USING (
    employer_id IN (SELECT id FROM employers
      WHERE clerk_user_id = current_setting('app.current_user_id'::text, true))
  );

-- employer_ratings: candidate-only (the rating candidate has full
-- access; the rated employer has no access)
CREATE POLICY "employer_ratings: candidate only" ON employer_ratings
  FOR ALL USING (
    candidate_id IN (SELECT id FROM candidates
      WHERE clerk_user_id = current_setting('app.current_user_id'::text, true))
  );

-- interview_feedback: employer full access
CREATE POLICY "interview_feedback: employer all" ON interview_feedback
  FOR ALL USING (
    employer_id IN (SELECT id FROM employers
      WHERE clerk_user_id = current_setting('app.current_user_id'::text, true))
  );

-- interview_feedback: candidate read-only
CREATE POLICY "interview_feedback: candidate read" ON interview_feedback
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM candidates
      WHERE clerk_user_id = current_setting('app.current_user_id'::text, true))
  );

-- interview_slots: employer-only (candidate booking uses the
-- token-gated route on the service-role client, which bypasses
-- RLS by design)
CREATE POLICY "interview_slots: employer only" ON interview_slots
  FOR ALL USING (
    employer_id IN (SELECT id FROM employers
      WHERE clerk_user_id = current_setting('app.current_user_id'::text, true))
  );

-- messages: both parties (candidate on the application, or the
-- employer who owns the job)
CREATE POLICY "messages: both parties" ON messages
  FOR ALL USING (
    candidate_id IN (SELECT id FROM candidates
      WHERE clerk_user_id = current_setting('app.current_user_id'::text, true))
    OR job_id IN (SELECT j.id FROM jobs j
      JOIN employers e ON j.employer_id = e.id
      WHERE e.clerk_user_id = current_setting('app.current_user_id'::text, true))
  );
