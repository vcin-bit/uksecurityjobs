-- Migration 0001: Drop unused candidate data columns
-- Phase 1 GDPR cleanup. Removes columns for data the platform no
-- longer collects: criminal record (Article 10), forces rank and
-- discharge type, police service detail, BID accreditation, DBS
-- certificate fields, and National Insurance.
-- Refs DPIA v0.2; data inventory v0.2.
-- All affected data was test data; a full snapshot was taken
-- before this migration.

ALTER TABLE professional_background
  DROP COLUMN IF EXISTS has_criminal_record,
  DROP COLUMN IF EXISTS criminal_record_encrypted,
  DROP COLUMN IF EXISTS forces_rank,
  DROP COLUMN IF EXISTS forces_discharge_type,
  DROP COLUMN IF EXISTS police_force,
  DROP COLUMN IF EXISTS police_rank,
  DROP COLUMN IF EXISTS police_leaving_reason,
  DROP COLUMN IF EXISTS has_bid_accreditation,
  DROP COLUMN IF EXISTS bid_scheme_name,
  DROP COLUMN IF EXISTS has_dbs_certificate,
  DROP COLUMN IF EXISTS dbs_certificate_type,
  DROP COLUMN IF EXISTS dbs_issue_date,
  DROP COLUMN IF EXISTS dbs_certificate_number;

ALTER TABLE personal_details
  DROP COLUMN IF EXISTS ni_number_encrypted,
  DROP COLUMN IF EXISTS has_ni_number;
