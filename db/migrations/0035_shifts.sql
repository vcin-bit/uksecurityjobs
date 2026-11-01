-- ════════════════════════════════════════════════════════════════════════════
-- Migration 0035 · shifts
-- ════════════════════════════════════════════════════════════════════════════
--
-- Two new tables: shifts (one row per posted shift) and shift_responses
-- (one row per candidate reached, with a single-use token link).
--
-- Access model: service role only.  RLS is enabled with NO policies, and
-- anon/authenticated are revoked — same pattern as talent_pool_callouts.
-- All reads/writes go through the Express API with the service key.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE shifts (
  id                   uuid            PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  employer_id          uuid            NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  created_by           text,                        -- Clerk user ID of poster

  -- Location (site_lat/lng geocoded from site_postcode via postcodes.io)
  site_postcode        text            NOT NULL,
  site_town            text,
  site_lat             double precision,
  site_lng             double precision,

  -- Timing
  shift_start          timestamptz     NOT NULL,
  shift_end            timestamptz     NOT NULL,
  CONSTRAINT shifts_end_after_start CHECK (shift_end > shift_start),

  -- Requirements
  licence_types        text[]          NOT NULL,
  CONSTRAINT shifts_licence_types_nonempty CHECK (cardinality(licence_types) > 0),
  rate_per_hour        numeric(6,2)    NOT NULL,
  CONSTRAINT shifts_rate_positive CHECK (rate_per_hour > 0),
  pay_terms            text            NOT NULL,
  CONSTRAINT shifts_pay_terms_check CHECK (pay_terms IN ('next_day','weekly','monthly')),
  radius_miles         int             NOT NULL DEFAULT 15,
  CONSTRAINT shifts_radius_check CHECK (radius_miles IN (5,10,15,20,30)),
  notes                text,

  -- Lifecycle
  status               text            NOT NULL DEFAULT 'open',
  CONSTRAINT shifts_status_check CHECK (status IN ('open','filled','cancelled','expired')),
  alert_sent_at        timestamptz,
  recipients_count     int,

  -- Booking
  chosen_candidate_id  uuid            REFERENCES candidates(id) ON DELETE SET NULL,
  chosen_at            timestamptz,
  confirmed_at         timestamptz,

  -- Briefing (revealed only after booking, to chosen candidate)
  site_name            text,
  site_address         text,
  report_to            text,
  escalation_contacts  text,
  site_tasks           text,

  created_at           timestamptz     NOT NULL DEFAULT now()
);

CREATE TABLE shift_responses (
  id                   uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id             uuid            NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  candidate_id         uuid            NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  -- Single-use email token (guard taps link → lands on response page)
  token                text            NOT NULL UNIQUE,
  token_expires        timestamptz     NOT NULL,

  -- Response data
  distance_miles       numeric(5,1),
  response             text            NOT NULL DEFAULT 'none',
  CONSTRAINT shift_responses_response_check CHECK (response IN ('yes','no','none')),
  responded_at         timestamptz,

  -- Filled/cancelled notification sent
  filled_notified_at   timestamptz,

  created_at           timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT shift_responses_shift_candidate_unique UNIQUE (shift_id, candidate_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_shifts_employer_id        ON shifts(employer_id);
CREATE INDEX idx_shifts_status             ON shifts(status);
CREATE INDEX idx_shift_responses_shift_id  ON shift_responses(shift_id);
CREATE INDEX idx_shift_responses_candidate ON shift_responses(candidate_id);

-- ── Access: service role only ─────────────────────────────────────────────────
-- Enable RLS then revoke direct table access from all client roles.
-- No policies are created — the API service key bypasses RLS entirely.
-- This matches the pattern used on talent_pool_callouts (relrowsecurity=true,
-- no policies, REVOKE ALL from anon/authenticated).
ALTER TABLE shifts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_responses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON shifts          FROM anon, authenticated;
REVOKE ALL ON shift_responses FROM anon, authenticated;
