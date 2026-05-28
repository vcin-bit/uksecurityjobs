-- Migration 0006: Re-base RLS on Clerk JWT third-party auth
-- =============================================================
-- Context:
--   Supabase is now configured with Clerk as a Third-Party Auth
--   provider. Authenticated requests carry a Clerk JWT; the Clerk
--   user id is in the 'sub' claim, readable as (auth.jwt()->>'sub').
--
--   The previous 20 policies were written for a different identity
--   mechanism: current_setting('app.current_user_id'). That source
--   is NOT populated under JWT auth, so those policies are
--   incompatible and are dropped and rewritten here.
--
-- This migration:
--   1. FORCEs row level security on every user/data table, so the
--      table owner is also subject to policies (ENABLE alone lets
--      the owner bypass them).
--   2. Drops all 20 existing (session-variable) policies.
--   3. Recreates them against (auth.jwt()->>'sub'), scoped TO the
--      'authenticated' role, with explicit WITH CHECK on every
--      policy that permits INSERT/UPDATE.
--   4. Fixes the 'jobs' policy: previously FOR ALL allowed any
--      authenticated user to UPDATE/DELETE any job. Now employers
--      get full control of their own jobs; all authenticated users
--      get SELECT only.
--   5. Splits job_applications so a candidate can create their own
--      application but cannot alter an employer's rows, and vice
--      versa.
--
-- The service role still bypasses RLS by design and is used only
-- by admin and system routes (SIA verification, audit log, public
-- job listing, waitlist read for admin).
--
-- Identity helper expression used throughout:
--   (auth.jwt() ->> 'sub')  ->  the Clerk user id, e.g. 'user_xxx'
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. FORCE row level security on every table
-- -------------------------------------------------------------
ALTER TABLE candidates              FORCE ROW LEVEL SECURITY;
ALTER TABLE personal_details        FORCE ROW LEVEL SECURITY;
ALTER TABLE sia_licences            FORCE ROW LEVEL SECURITY;
ALTER TABLE driving_details         FORCE ROW LEVEL SECURITY;
ALTER TABLE preferred_sectors       FORCE ROW LEVEL SECURITY;
ALTER TABLE qualifications          FORCE ROW LEVEL SECURITY;
ALTER TABLE professional_background FORCE ROW LEVEL SECURITY;
ALTER TABLE employment_history      FORCE ROW LEVEL SECURITY;
ALTER TABLE address_history         FORCE ROW LEVEL SECURITY;
ALTER TABLE employers               FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs                    FORCE ROW LEVEL SECURITY;
ALTER TABLE job_applications        FORCE ROW LEVEL SECURITY;
ALTER TABLE interview_slots         FORCE ROW LEVEL SECURITY;
ALTER TABLE interview_feedback      FORCE ROW LEVEL SECURITY;
ALTER TABLE messages                FORCE ROW LEVEL SECURITY;
ALTER TABLE candidate_ratings       FORCE ROW LEVEL SECURITY;
ALTER TABLE employer_ratings        FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log               FORCE ROW LEVEL SECURITY;
ALTER TABLE waitlist                FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 2. Drop ALL existing policies on the 19 tables
-- -------------------------------------------------------------
-- Rather than dropping 20 policies by name (fragile if any name
-- differs), iterate pg_policies and drop every policy on each
-- listed table. This guarantees no old (session-variable) policy
-- survives alongside the new JWT policies — two policies on a
-- table are OR'd together and an unintended survivor would widen
-- access.
DO $$
DECLARE
  r RECORD;
  tbls TEXT[] := ARRAY[
    'candidates','personal_details','sia_licences','driving_details',
    'preferred_sectors','qualifications','professional_background',
    'employment_history','address_history','employers','jobs',
    'job_applications','interview_slots','interview_feedback','messages',
    'candidate_ratings','employer_ratings','audit_log','waitlist'
  ];
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(tbls)
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- -------------------------------------------------------------
-- 3. Recreate policies against the Clerk JWT
-- -------------------------------------------------------------
-- Convention:
--   * One policy per operation where operations differ; FOR ALL
--     only where every operation shares identical scoping.
--   * Every policy that permits writes has an explicit WITH CHECK
--     identical to its USING expression.
--   * All policies are scoped TO authenticated, except waitlist
--     INSERT which is also available TO anon.

-- ===== candidates : a user owns exactly their own row =====
CREATE POLICY "candidates_select" ON candidates
  FOR SELECT TO authenticated
  USING (clerk_user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "candidates_insert" ON candidates
  FOR INSERT TO authenticated
  WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "candidates_update" ON candidates
  FOR UPDATE TO authenticated
  USING (clerk_user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "candidates_delete" ON candidates
  FOR DELETE TO authenticated
  USING (clerk_user_id = (auth.jwt() ->> 'sub'));

-- ===== employers : a user owns exactly their own row =====
CREATE POLICY "employers_select" ON employers
  FOR SELECT TO authenticated
  USING (clerk_user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "employers_insert" ON employers
  FOR INSERT TO authenticated
  WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "employers_update" ON employers
  FOR UPDATE TO authenticated
  USING (clerk_user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "employers_delete" ON employers
  FOR DELETE TO authenticated
  USING (clerk_user_id = (auth.jwt() ->> 'sub'));

-- ===== candidate sub-tables =====
-- Scoped via candidate ownership. FOR ALL is safe here: a user
-- may do anything to rows belonging to their own candidate record.
-- The reusable predicate:
--   candidate_id IN (SELECT id FROM candidates
--                    WHERE clerk_user_id = auth.jwt()->>'sub')

CREATE POLICY "personal_details_owner" ON personal_details
  FOR ALL TO authenticated
  USING (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "sia_licences_owner" ON sia_licences
  FOR ALL TO authenticated
  USING (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "driving_details_owner" ON driving_details
  FOR ALL TO authenticated
  USING (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "preferred_sectors_owner" ON preferred_sectors
  FOR ALL TO authenticated
  USING (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "qualifications_owner" ON qualifications
  FOR ALL TO authenticated
  USING (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "professional_background_owner" ON professional_background
  FOR ALL TO authenticated
  USING (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "employment_history_owner" ON employment_history
  FOR ALL TO authenticated
  USING (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "address_history_owner" ON address_history
  FOR ALL TO authenticated
  USING (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

-- ===== jobs =====
-- FIX: previously FOR ALL with "OR authenticated" let any user
-- update/delete any job. Now: employers manage their own jobs;
-- every authenticated user may read all jobs (public listings).
CREATE POLICY "jobs_select_all_authenticated" ON jobs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "jobs_insert_own" ON jobs
  FOR INSERT TO authenticated
  WITH CHECK (employer_id IN (
    SELECT id FROM employers
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "jobs_update_own" ON jobs
  FOR UPDATE TO authenticated
  USING (employer_id IN (
    SELECT id FROM employers
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (employer_id IN (
    SELECT id FROM employers
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "jobs_delete_own" ON jobs
  FOR DELETE TO authenticated
  USING (employer_id IN (
    SELECT id FROM employers
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

-- ===== job_applications =====
-- A candidate may read and create their own applications.
-- An employer may read applications to their jobs, and update
-- them (e.g. status). Split so a candidate cannot modify an
-- employer's decision and vice versa.
CREATE POLICY "job_applications_select" ON job_applications
  FOR SELECT TO authenticated
  USING (
    candidate_id IN (
      SELECT id FROM candidates
      WHERE clerk_user_id = (auth.jwt() ->> 'sub'))
    OR job_id IN (
      SELECT j.id FROM jobs j
      JOIN employers e ON j.employer_id = e.id
      WHERE e.clerk_user_id = (auth.jwt() ->> 'sub'))
  );

CREATE POLICY "job_applications_insert_candidate" ON job_applications
  FOR INSERT TO authenticated
  WITH CHECK (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "job_applications_update_employer" ON job_applications
  FOR UPDATE TO authenticated
  USING (job_id IN (
    SELECT j.id FROM jobs j
    JOIN employers e ON j.employer_id = e.id
    WHERE e.clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (job_id IN (
    SELECT j.id FROM jobs j
    JOIN employers e ON j.employer_id = e.id
    WHERE e.clerk_user_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "job_applications_delete_candidate" ON job_applications
  FOR DELETE TO authenticated
  USING (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

-- ===== interview_slots : employer-owned =====
CREATE POLICY "interview_slots_owner" ON interview_slots
  FOR ALL TO authenticated
  USING (employer_id IN (
    SELECT id FROM employers
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (employer_id IN (
    SELECT id FROM employers
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

-- ===== interview_feedback =====
-- Employer: full control of their own feedback rows.
-- Candidate: read-only of feedback about themselves.
CREATE POLICY "interview_feedback_employer" ON interview_feedback
  FOR ALL TO authenticated
  USING (employer_id IN (
    SELECT id FROM employers
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (employer_id IN (
    SELECT id FROM employers
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "interview_feedback_candidate_read" ON interview_feedback
  FOR SELECT TO authenticated
  USING (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

-- ===== messages : either party on the application =====
CREATE POLICY "messages_both_parties" ON messages
  FOR ALL TO authenticated
  USING (
    candidate_id IN (
      SELECT id FROM candidates
      WHERE clerk_user_id = (auth.jwt() ->> 'sub'))
    OR job_id IN (
      SELECT j.id FROM jobs j
      JOIN employers e ON j.employer_id = e.id
      WHERE e.clerk_user_id = (auth.jwt() ->> 'sub'))
  )
  WITH CHECK (
    candidate_id IN (
      SELECT id FROM candidates
      WHERE clerk_user_id = (auth.jwt() ->> 'sub'))
    OR job_id IN (
      SELECT j.id FROM jobs j
      JOIN employers e ON j.employer_id = e.id
      WHERE e.clerk_user_id = (auth.jwt() ->> 'sub'))
  );

-- ===== candidate_ratings : employer-owned =====
CREATE POLICY "candidate_ratings_employer" ON candidate_ratings
  FOR ALL TO authenticated
  USING (employer_id IN (
    SELECT id FROM employers
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (employer_id IN (
    SELECT id FROM employers
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

-- ===== employer_ratings : candidate-owned =====
CREATE POLICY "employer_ratings_candidate" ON employer_ratings
  FOR ALL TO authenticated
  USING (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
  WITH CHECK (candidate_id IN (
    SELECT id FROM candidates
    WHERE clerk_user_id = (auth.jwt() ->> 'sub')));

-- ===== audit_log : a user may read entries about their actions =====
-- Writes happen via the service role only (auditLog()), so no
-- INSERT policy is needed here.
CREATE POLICY "audit_log_read_own" ON audit_log
  FOR SELECT TO authenticated
  USING (performed_by = (auth.jwt() ->> 'sub'));

-- ===== waitlist : public sign-up, insert only =====
-- Available to anon (unauthenticated visitors) and authenticated.
-- No SELECT/UPDATE/DELETE policy: reads are service-role only.
CREATE POLICY "waitlist_insert" ON waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

COMMIT;

-- =============================================================
-- Post-migration verification (run separately, read-only):
--
--   SELECT tablename, policyname, cmd, roles
--   FROM pg_policies WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
--
--   SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
--   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relkind = 'r'
--   ORDER BY c.relname;
--
-- Expect: every table relrowsecurity = true AND
-- relforcerowsecurity = true; policies all present with the
-- expected cmd and {authenticated} (or {anon,authenticated} for
-- waitlist) roles.
-- =============================================================
