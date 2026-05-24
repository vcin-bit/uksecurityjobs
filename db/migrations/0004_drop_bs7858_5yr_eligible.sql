-- Migration 0004: Drop the phantom bs7858_5yr_eligible column
-- bs7858_5yr_eligible on personal_details was accepted by the
-- API but never set by anything — no frontend field, no admin
-- route. The API stopped writing it in commit 5f11e9e. This
-- drops the unused column.
-- All affected data was test data; the column was never
-- populated.

ALTER TABLE personal_details
  DROP COLUMN IF EXISTS bs7858_5yr_eligible;
