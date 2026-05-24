-- Migration 0002: Drop driving ban columns
-- A driving ban is a criminal penalty; has_ban_history and
-- ban_details_encrypted are Article 10 criminal-offence data.
-- The platform no longer collects this. After this migration the
-- platform processes no Article 10 data.
-- Refs DPIA v0.2; data inventory v0.2.
-- All affected data was test data; a snapshot was taken before
-- this migration.

ALTER TABLE driving_details
  DROP COLUMN IF EXISTS has_ban_history,
  DROP COLUMN IF EXISTS ban_details_encrypted;
