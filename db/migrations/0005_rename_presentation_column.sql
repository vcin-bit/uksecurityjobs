-- Migration 0005: Rename candidate_ratings.professional_presentation
-- to preparedness_professionalism.
-- Part of the candidate-rating fairness review: the field was
-- reframed from a subjective appearance score to a job-relevant
-- measure of interview preparedness. Frontend renamed in 0d701fa,
-- API in 7e5c634; this aligns the database column.
-- candidate_ratings is empty — no data migration needed.
-- NOTE: the interview_feedback table has its own, separate
-- professional_presentation column — it is deliberately NOT
-- renamed here.

ALTER TABLE candidate_ratings
  RENAME COLUMN professional_presentation TO preparedness_professionalism;
