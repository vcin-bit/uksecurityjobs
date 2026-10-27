-- 0030_licence_reminders.sql
-- Tracks SIA licence expiry reminder emails to prevent duplicate sends.
-- No anon/authenticated policies — read/write via service_role only
-- (server-side cron). RLS enabled as a belt-and-braces measure.

CREATE TABLE IF NOT EXISTS licence_reminders (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  uuid        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  licence_id    uuid        NOT NULL REFERENCES sia_licences(id) ON DELETE CASCADE,
  reminder_type text        NOT NULL CHECK (reminder_type IN ('60d', '30d', 'expired')),
  sent_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (licence_id, reminder_type)
);

ALTER TABLE licence_reminders ENABLE ROW LEVEL SECURITY;
