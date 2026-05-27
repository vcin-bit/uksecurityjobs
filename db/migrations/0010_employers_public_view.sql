CREATE VIEW employers_public AS
SELECT id, company_name, logo_url, sia_acs, website,
       reputation_score, reputation_count
FROM employers;
GRANT SELECT ON employers_public TO authenticated, anon;
