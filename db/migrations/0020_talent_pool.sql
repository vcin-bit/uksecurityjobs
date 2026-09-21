-- ── 0020_talent_pool.sql ─────────────────────────────────────────────────────
-- Phase 1: Talent Pool v1 schema.
-- All additive. No existing tables modified except column additions to
-- employers and candidates. No existing FK constraints changed.
--
-- Safe to re-run: ADD CONSTRAINT and CREATE TRIGGER use DO blocks / DROP IF EXISTS.
-- Do NOT apply until approved.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. employers.talent_pool_enabled ─────────────────────────────────────────
-- Paid add-on switch. Default false. Enabled per employer by admin only.
-- All talent pool routes gate on this flag via requireTalentPoolEmployer.

ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS talent_pool_enabled boolean NOT NULL DEFAULT false;

-- Expected: 1 row. Verify: SELECT COUNT(*) FROM employers WHERE company_name = 'Risk Secured Ltd';
UPDATE employers
SET    talent_pool_enabled = true
WHERE  company_name = 'Risk Secured Ltd';


-- ── 2. candidates: discoverability columns ────────────────────────────────────
-- discoverable: candidate opt-in. Guard trigger (§3) enforces profile_complete
--   must be true before this can be set to true.
-- discoverable_at: timestamp of first opt-in (audit trail).
-- discoverable_wording_version: which consent copy the candidate agreed to.
-- discoverable_mode: 'all' (visible to all talent_pool_enabled employers) or
--   'selected' (only employers with an 'allow' entry in
--   candidate_employer_visibility).

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS discoverable                boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discoverable_at             timestamptz,
  ADD COLUMN IF NOT EXISTS discoverable_wording_version text,
  ADD COLUMN IF NOT EXISTS discoverable_mode           text        NOT NULL DEFAULT 'all';

DO $$ BEGIN
  ALTER TABLE candidates
    ADD CONSTRAINT candidates_discoverable_mode_check
    CHECK (discoverable_mode IN ('all', 'selected'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── 3. discoverable guard trigger ─────────────────────────────────────────────
-- Raises an error ONLY when discoverable changes false→true while
-- profile_complete is not true.
--
-- Must never block:
--   - Setting discoverable = false (turning it off)
--   - profile_complete changing (e.g. refreshBadge() writing false after a
--     section is removed — this must never be blocked regardless of the
--     current value of discoverable)
--   - Any other column update on candidates
--
-- A CHECK constraint is intentionally NOT used: a check fires on every row
-- update, which would block refreshBadge() from setting profile_complete = false
-- on a currently-discoverable candidate.

CREATE OR REPLACE FUNCTION candidates_discoverable_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF  OLD.discoverable        = false
  AND NEW.discoverable        = true
  AND NEW.profile_complete IS DISTINCT FROM true
  THEN
    RAISE EXCEPTION
      'Cannot set discoverable=true: profile_complete is not true (candidate %).',
      NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS candidates_discoverable_guard ON candidates;
CREATE TRIGGER candidates_discoverable_guard
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION candidates_discoverable_guard();


-- ── 4. candidate_employer_visibility ──────────────────────────────────────────
-- Allow/block rules set by candidates per employer.
-- Used when discoverable_mode = 'selected' (allow list) or to block a
-- specific employer regardless of mode.
--
-- RLS: candidates manage their own rows (WITH CHECK included).
-- Employers have NO policy — they cannot read this table.

CREATE TABLE IF NOT EXISTS candidate_employer_visibility (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  employer_id  uuid        NOT NULL REFERENCES employers(id)  ON DELETE CASCADE,
  rule         text        NOT NULL CHECK (rule IN ('allow', 'block')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, employer_id)
);

ALTER TABLE candidate_employer_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS candidate_employer_visibility_candidate_all
  ON candidate_employer_visibility;
CREATE POLICY candidate_employer_visibility_candidate_all
  ON candidate_employer_visibility
  FOR ALL
  TO authenticated
  USING (
    candidate_id IN (
      SELECT id FROM candidates
      WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    candidate_id IN (
      SELECT id FROM candidates
      WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );


-- ── 5. talent_pool_invites ────────────────────────────────────────────────────
-- Employer sends a named invitation to a discoverable candidate.
-- Token used for the accept/decline link — no Clerk auth required.
-- consent_at / consent_wording_version are written by the API after the
-- candidate accepts via the token link. All pool writes go through the API
-- using the service key, after requireTalentPoolEmployer.

CREATE TABLE IF NOT EXISTS talent_pool_invites (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id              uuid        NOT NULL REFERENCES employers(id)        ON DELETE CASCADE,
  candidate_id             uuid        NOT NULL REFERENCES candidates(id)       ON DELETE CASCADE,
  status                   text        NOT NULL DEFAULT 'invited'
                                       CHECK (status IN (
                                         'invited', 'accepted', 'declined',
                                         'call_booked', 'passed', 'not_for_us', 'expired'
                                       )),
  invited_at               timestamptz NOT NULL DEFAULT now(),
  responded_at             timestamptz,
  token                    text        NOT NULL UNIQUE,
  token_expires            timestamptz NOT NULL,
  consent_at               timestamptz,
  consent_wording_version  text,
  interview_slot_id        uuid                 REFERENCES interview_slots(id)  ON DELETE SET NULL,
  outcome_at               timestamptz,
  outcome_notes            text
);

ALTER TABLE talent_pool_invites ENABLE ROW LEVEL SECURITY;

-- Employers: read-only on their own invites. All writes go via service key.
DROP POLICY IF EXISTS talent_pool_invites_employer_select ON talent_pool_invites;
CREATE POLICY talent_pool_invites_employer_select
  ON talent_pool_invites
  FOR SELECT
  TO authenticated
  USING (
    employer_id IN (
      SELECT id FROM employers
      WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );
-- No candidate policy: candidate invite/membership data is served by the API
-- with explicit column lists that never expose internal_notes, grading,
-- paused_reason or outcome_notes.


-- ── 6. talent_pool_members ────────────────────────────────────────────────────
-- A candidate who accepted an invite. invite_id nullable — membership may be
-- created without an invite in future admin flows.
-- grading: free text, employer-set (e.g. A/B/C, or notes shorthand).
-- internal_notes: employer's private notes on this member.

CREATE TABLE IF NOT EXISTS talent_pool_members (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id    uuid        NOT NULL REFERENCES employers(id)           ON DELETE CASCADE,
  candidate_id   uuid        NOT NULL REFERENCES candidates(id)          ON DELETE CASCADE,
  invite_id      uuid                 REFERENCES talent_pool_invites(id) ON DELETE SET NULL,
  joined_at      timestamptz NOT NULL DEFAULT now(),
  consent_at     timestamptz,
  grading        text,
  status         text        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'paused', 'do_not_use', 'left')),
  paused_reason  text,
  internal_notes text,
  UNIQUE (employer_id, candidate_id)
);

ALTER TABLE talent_pool_members ENABLE ROW LEVEL SECURITY;

-- Employers: read-only on their own pool. All writes go via service key.
DROP POLICY IF EXISTS talent_pool_members_employer_select ON talent_pool_members;
CREATE POLICY talent_pool_members_employer_select
  ON talent_pool_members
  FOR SELECT
  TO authenticated
  USING (
    employer_id IN (
      SELECT id FROM employers
      WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );
-- No candidate policy: membership data is served by the API with explicit
-- column lists that never expose internal_notes, grading or paused_reason.


-- ── 7. talent_pool_callouts ───────────────────────────────────────────────────
-- Employer broadcasts a shift/role to their pool.
-- created_by: clerk_user_id of the employer user who sent it.
-- channel: delivery method, default 'email'.
-- licence_types: zero or more SIA licence type strings.

CREATE TABLE IF NOT EXISTS talent_pool_callouts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id   uuid        NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  job_summary   text,
  site_town     text,
  shift_start   timestamptz,
  shift_end     timestamptz,
  rate          text,
  licence_types text[],
  channel       text        NOT NULL DEFAULT 'email',
  sent_at       timestamptz,
  created_by    text,
  status        text        NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open', 'closed'))
);

ALTER TABLE talent_pool_callouts ENABLE ROW LEVEL SECURITY;

-- Employers: read-only on their own callouts. All writes go via service key.
DROP POLICY IF EXISTS talent_pool_callouts_employer_select ON talent_pool_callouts;
CREATE POLICY talent_pool_callouts_employer_select
  ON talent_pool_callouts
  FOR SELECT
  TO authenticated
  USING (
    employer_id IN (
      SELECT id FROM employers
      WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );


-- ── 8. talent_pool_callout_recipients ────────────────────────────────────────
-- Tracks which pool members received a callout and their response.
-- member_id FK → talent_pool_members (ON DELETE CASCADE): removing a member
--   removes their callout history.
-- candidate_id / employer_id: denormalised for efficient scoped queries.
-- token: used for the candidate's yes/no response link (no Clerk auth needed).
-- response default 'none': not yet responded.

CREATE TABLE IF NOT EXISTS talent_pool_callout_recipients (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  callout_id   uuid        NOT NULL REFERENCES talent_pool_callouts(id)  ON DELETE CASCADE,
  member_id    uuid        NOT NULL REFERENCES talent_pool_members(id)   ON DELETE CASCADE,
  candidate_id uuid        NOT NULL REFERENCES candidates(id)            ON DELETE CASCADE,
  employer_id  uuid        NOT NULL REFERENCES employers(id)             ON DELETE CASCADE,
  token        text        NOT NULL UNIQUE,
  token_expires timestamptz NOT NULL,
  response     text        NOT NULL DEFAULT 'none'
                           CHECK (response IN ('yes', 'no', 'none')),
  responded_at timestamptz,
  UNIQUE (callout_id, member_id)
);

ALTER TABLE talent_pool_callout_recipients ENABLE ROW LEVEL SECURITY;

-- Employers: read responses to their callouts
DROP POLICY IF EXISTS talent_pool_callout_recipients_employer_select
  ON talent_pool_callout_recipients;
CREATE POLICY talent_pool_callout_recipients_employer_select
  ON talent_pool_callout_recipients
  FOR SELECT
  TO authenticated
  USING (
    employer_id IN (
      SELECT id FROM employers
      WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

-- Candidates: SELECT only on their own entries.
-- Response updates (yes/no) are written by the API via service key after
-- token validation — no candidate UPDATE policy.
DROP POLICY IF EXISTS talent_pool_callout_recipients_candidate_select
  ON talent_pool_callout_recipients;
CREATE POLICY talent_pool_callout_recipients_candidate_select
  ON talent_pool_callout_recipients
  FOR SELECT
  TO authenticated
  USING (
    candidate_id IN (
      SELECT id FROM candidates
      WHERE clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

-- Candidate SELECT on callouts — via their recipient rows (defined after
-- talent_pool_callout_recipients so the USING clause can reference it).
DROP POLICY IF EXISTS talent_pool_callouts_candidate_select ON talent_pool_callouts;
CREATE POLICY talent_pool_callouts_candidate_select
  ON talent_pool_callouts
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT callout_id FROM talent_pool_callout_recipients
      WHERE candidate_id IN (
        SELECT id FROM candidates
        WHERE clerk_user_id = (auth.jwt() ->> 'sub')
      )
    )
  );


-- ── 9. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cev_candidate_id
  ON candidate_employer_visibility(candidate_id);
CREATE INDEX IF NOT EXISTS idx_cev_employer_id
  ON candidate_employer_visibility(employer_id);

CREATE INDEX IF NOT EXISTS idx_tpi_employer_id
  ON talent_pool_invites(employer_id);
CREATE INDEX IF NOT EXISTS idx_tpi_candidate_id
  ON talent_pool_invites(candidate_id);
CREATE INDEX IF NOT EXISTS idx_tpi_slot_id
  ON talent_pool_invites(interview_slot_id);
-- token UNIQUE constraint creates its own index.

CREATE INDEX IF NOT EXISTS idx_tpm_employer_id
  ON talent_pool_members(employer_id);
CREATE INDEX IF NOT EXISTS idx_tpm_candidate_id
  ON talent_pool_members(candidate_id);
CREATE INDEX IF NOT EXISTS idx_tpm_invite_id
  ON talent_pool_members(invite_id);

CREATE INDEX IF NOT EXISTS idx_tpc_employer_id
  ON talent_pool_callouts(employer_id);

CREATE INDEX IF NOT EXISTS idx_tpcr_callout_id
  ON talent_pool_callout_recipients(callout_id);
CREATE INDEX IF NOT EXISTS idx_tpcr_member_id
  ON talent_pool_callout_recipients(member_id);
CREATE INDEX IF NOT EXISTS idx_tpcr_candidate_id
  ON talent_pool_callout_recipients(candidate_id);
CREATE INDEX IF NOT EXISTS idx_tpcr_employer_id
  ON talent_pool_callout_recipients(employer_id);
-- token UNIQUE constraint creates its own index.

-- Partial index: discoverable lookups scan only opt-in rows.
CREATE INDEX IF NOT EXISTS idx_candidates_discoverable
  ON candidates(discoverable)
  WHERE discoverable = true;


-- ── 10. Shortlist view ────────────────────────────────────────────────────────
-- Returns all discoverable, BS7858-ready, non-suspended candidates who hold
-- at least one in-date verified SIA licence.
--
-- "In-date" means: verified = true AND expiry_date IS NOT NULL
--   AND expiry_date >= CURRENT_DATE.
-- The expiry_date IS NULL allowance is intentionally excluded — an unknown
-- expiry cannot be treated as valid for employer-facing display.
--
-- address_gap / employment_gap are INDICATORS that the candidate's history
-- may not cover the full 5-year BS7858 window. They are not proof of a gap —
-- a candidate could have a row starting exactly 5 years ago that covers the
-- period. Treat as a prompt for further review, not a disqualification.
--
-- Employer-scoping (talent_pool_enabled check, discoverable_mode='selected'
-- allow list, block rules) is applied in the API layer — this view is the
-- base filter only.
--
-- Security: REVOKE ALL from anon and authenticated. Only the service-key
-- API can query this view. security_invoker = true ensures that if access
-- were ever accidentally granted, RLS on underlying tables would still apply.

CREATE OR REPLACE VIEW talent_pool_shortlist AS
SELECT
  c.id                         AS candidate_id,
  c.availability_status,
  c.photo_url,
  c.discoverable_mode,
  pd.first_name,
  pd.last_name,
  pd.city,
  -- In-date verified licence types (expiry unknown = excluded).
  COALESCE(
    ARRAY_AGG(DISTINCT sl.licence_type)
      FILTER (
        WHERE sl.verified     = true
          AND sl.expiry_date IS NOT NULL
          AND sl.expiry_date >= CURRENT_DATE
      ),
    '{}'::text[]
  )                            AS licence_types,
  -- address_gap: indicator — true if no address row has moved_in_date
  -- at or before 5 years ago. Does not prove continuous coverage.
  NOT EXISTS (
    SELECT 1 FROM address_history ah
    WHERE ah.candidate_id  = c.id
      AND ah.moved_in_date <= CURRENT_DATE - INTERVAL '5 years'
  )                            AS address_gap,
  -- employment_gap: indicator — true if no employment row has start_date
  -- at or before 5 years ago. Does not prove continuous coverage.
  NOT EXISTS (
    SELECT 1 FROM employment_history eh
    WHERE eh.candidate_id = c.id
      AND eh.start_date   <= CURRENT_DATE - INTERVAL '5 years'
  )                            AS employment_gap,
  c.updated_at
FROM candidates c
LEFT JOIN personal_details pd ON pd.candidate_id = c.id
LEFT JOIN sia_licences sl     ON sl.candidate_id = c.id
WHERE c.discoverable    = true
  AND c.profile_complete = true
  AND (c.suspended IS NULL OR c.suspended = false)
  -- Require at least one in-date verified licence. expiry_date IS NULL is not
  -- accepted — an unknown expiry cannot be treated as valid.
  AND EXISTS (
    SELECT 1 FROM sia_licences sl2
    WHERE sl2.candidate_id = c.id
      AND sl2.verified     = true
      AND sl2.expiry_date IS NOT NULL
      AND sl2.expiry_date >= CURRENT_DATE
  )
GROUP BY
  c.id, c.availability_status, c.photo_url, c.discoverable_mode, c.updated_at,
  pd.first_name, pd.last_name, pd.city;

ALTER VIEW talent_pool_shortlist SET (security_invoker = true);

REVOKE ALL ON talent_pool_shortlist FROM anon, authenticated;
