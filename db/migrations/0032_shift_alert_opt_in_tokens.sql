-- ════════════════════════════════════════════════════════════════════════════
-- Migration 0032 · shift_alert_opt_in_tokens
-- ════════════════════════════════════════════════════════════════════════════
--
-- Stores single-use, time-limited tokens sent inside
-- "Want shifts near you?" opt-in invite emails.
--
-- Flow:
--   1. send-shift-alert-optin-emails.js creates a token row per candidate
--      and sends the link.
--   2. Candidate clicks → GET /api/shift-alerts/optin/:token validates token.
--   3. Candidate clicks "Yes, send me shifts" →
--      POST /api/shift-alerts/optin/:token sets used_at, then writes
--      shift_alerts_opt_in=true on the candidates row.
--
-- Tokens expire after 30 days (expires_at).  Used tokens (used_at IS NOT NULL)
-- are retained for audit; they cannot be replayed (API rejects if used_at IS NOT NULL).
--
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shift_alert_opt_in_tokens (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  token        text        NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_alert_tokens_candidate
  ON shift_alert_opt_in_tokens(candidate_id);
