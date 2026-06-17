-- Migration 0015: Reset GDPR consent to NULL and allow NULLs
-- =============================================================
-- Context:
--   A bug in the signup flow meant GDPR consent was never actually
--   persisted — all candidates were auto-created with gdpr_consent
--   = false regardless of whether they ticked the box. This means
--   every existing false value is unreliable.
--
--   To obtain legally valid consent, we:
--   1. Allow NULL in the column (null = never asked / unknown).
--   2. Set ALL existing rows to NULL, forcing every user through
--      the re-consent banner on their next dashboard visit.
--
--   New signups will get gdpr_consent = true via the fixed POST
--   /api/candidates flow. Fallback auto-creates set NULL. The
--   dashboard re-consent banner handles the recovery path.
-- =============================================================

BEGIN;

-- Allow NULL (may already be nullable — ALTER COLUMN is idempotent here)
ALTER TABLE candidates ALTER COLUMN gdpr_consent DROP NOT NULL;
ALTER TABLE candidates ALTER COLUMN gdpr_consent DROP DEFAULT;

-- Reset all existing values to force re-consent
UPDATE candidates SET gdpr_consent = NULL, gdpr_consent_at = NULL;

COMMIT;
