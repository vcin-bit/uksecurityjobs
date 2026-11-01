-- ════════════════════════════════════════════════════════════════════════════
-- Migration 0033 · postcode_locations
-- ════════════════════════════════════════════════════════════════════════════
--
-- Adds geocoded lat/lng columns to personal_details so we can run
-- distance-to-shift queries without PostGIS.
-- Populated by PUT /api/candidates/me/personal (live) and
-- scripts/backfill-postcode-locations.js (batch).
-- Never returned to employers — employer queries select only
-- first_name, last_name, phone, years_experience.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE personal_details
  ADD COLUMN IF NOT EXISTS postcode_lat        double precision NULL,
  ADD COLUMN IF NOT EXISTS postcode_lng        double precision NULL,
  ADD COLUMN IF NOT EXISTS postcode_located_at timestamptz      NULL;

COMMENT ON COLUMN personal_details.postcode_lat        IS 'WGS-84 latitude derived from postcode via postcodes.io';
COMMENT ON COLUMN personal_details.postcode_lng        IS 'WGS-84 longitude derived from postcode via postcodes.io';
COMMENT ON COLUMN personal_details.postcode_located_at IS 'When the postcode was last geocoded';
