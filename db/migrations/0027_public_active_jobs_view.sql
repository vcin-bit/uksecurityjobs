-- 0027: Public read-only view for active direct jobs.
--
-- Used by the /vacancies/{id} Cloudflare Pages Function and the
-- /sitemap-jobs.xml Pages Function. Both use the anon key, so the
-- view grant is the only change to anon's access — no RLS changes
-- to the underlying jobs or employers tables.
--
-- Filters:
--   status = 'active'    — paused / ended jobs disappear automatically
--   source = 'direct'    — excludes Reed aggregated jobs (no canonical page)
--   expires_at condition — jobs whose date has passed are excluded

CREATE OR REPLACE VIEW public_active_jobs AS
SELECT
  j.id,
  j.title,
  j.description,
  j.duties,
  j.benefits,
  j.created_at,
  j.expires_at,
  j.employment_type,
  j.rate_from,
  j.rate_to,
  j.rate_type,
  j.location,
  j.postcode,
  j.licences_required,
  j.shift_pattern,
  j.sector,
  j.contract_type,
  e.company_name,
  e.logo_url
FROM jobs j
LEFT JOIN employers e ON e.id = j.employer_id
WHERE
  j.status = 'active'
  AND j.source = 'direct'
  AND (j.expires_at IS NULL OR j.expires_at > now());

-- Allow the anon key (used by Cloudflare Pages Functions) to SELECT.
-- No INSERT / UPDATE / DELETE, and no access to any other table.
GRANT SELECT ON public_active_jobs TO anon;
