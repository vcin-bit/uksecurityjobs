-- ════════════════════════════════════════════════════════════════════════════
-- Migration 0031 · right_to_work_and_shift_alerts
-- ════════════════════════════════════════════════════════════════════════════
--
-- Adds two new fields to personal_details:
--
--   right_to_work_proof  — the document type the candidate will present to
--                          prove right to work in the UK.  Two accepted values:
--                            'british_irish_passport' — holds a valid British
--                              or Irish passport (or Irish passport card).
--                            'share_code'             — holds a Home Office
--                              share code (non-UK/IE nationals).
--                          NULL until the candidate explicitly selects one.
--
--   years_experience     — banded work-history field used for job-matching and
--                          talent-pool filtering.  Four accepted values:
--                            'under_1'  — less than 1 year
--                            '1_to_3'   — 1–3 years
--                            '3_to_5'   — 3–5 years
--                            '5_plus'   — 5 or more years
--                          NULL until the candidate fills in the field.
--
-- Adds three new fields to candidates (mirroring the discoverable/
-- discoverable_at / discoverable_wording_version pattern from 0020):
--
--   shift_alerts_opt_in         — boolean flag; candidate has opted in to
--                                 receiving shift-alert notifications.
--   shift_alerts_opt_in_at      — timestamp of first opt-in (audit trail).
--   shift_alerts_wording_version — the exact consent-copy version the candidate
--                                  agreed to, so we can prove what was shown.
--
-- Also adds a partial index on candidates(id) WHERE shift_alerts_opt_in = true
-- so queries that fan out alerts only scan the opted-in minority.
--
-- All ADD COLUMN statements use IF NOT EXISTS — safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. personal_details: right-to-work proof type ────────────────────────────

ALTER TABLE personal_details
  ADD COLUMN IF NOT EXISTS right_to_work_proof text NULL,
  ADD COLUMN IF NOT EXISTS years_experience    text NULL;

DO $$ BEGIN
  ALTER TABLE personal_details
    ADD CONSTRAINT personal_details_right_to_work_proof_check
    CHECK (right_to_work_proof IN ('british_irish_passport', 'share_code'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE personal_details
    ADD CONSTRAINT personal_details_years_experience_check
    CHECK (years_experience IN ('under_1', '1_to_3', '3_to_5', '5_plus'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── 2. candidates: shift-alert opt-in columns ────────────────────────────────
-- shift_alerts_opt_in: candidate has opted in to shift-alert notifications.
-- shift_alerts_opt_in_at: timestamp of first opt-in (audit trail).
-- shift_alerts_wording_version: which consent copy the candidate agreed to.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS shift_alerts_opt_in          boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shift_alerts_opt_in_at       timestamptz NULL,
  ADD COLUMN IF NOT EXISTS shift_alerts_wording_version text        NULL;


-- ── 3. Partial index: shift-alert lookups scan only opted-in rows ─────────────

CREATE INDEX IF NOT EXISTS idx_candidates_shift_alerts
  ON candidates(id)
  WHERE shift_alerts_opt_in = true;
