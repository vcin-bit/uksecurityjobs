-- Phase 5: nightly pool licence expiry check.
--
-- nearest_licence_expiry: the soonest verified in-date SIA licence expiry for
--   this candidate, as of the last nightly run. NULL when no in-date licence
--   exists (member is or will be paused). Used by the employer Members tab to
--   show an amber "Licence expires {date}" badge within 60 days.
--
-- paused_at: when the nightly job last set status='paused' via the licence
--   check. NULL for active members and any manual pauses (do_not_use, etc.).

ALTER TABLE talent_pool_members
  ADD COLUMN IF NOT EXISTS nearest_licence_expiry date,
  ADD COLUMN IF NOT EXISTS paused_at              timestamptz;
