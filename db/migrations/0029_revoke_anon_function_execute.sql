-- Harden SECURITY DEFINER function ACLs and view grants.
--
-- encrypt_value / decrypt_value: restrict to service_role only.
--   Called exclusively from api/src/lib/supabase.js with the service key.
--   Anon/authenticated access was a standing decryption oracle.
--   search_path added to prevent search_path injection.
--
-- set_current_user_id: revoke from PUBLIC/anon/authenticated.
--   Not called anywhere in the codebase. No RLS policy reads
--   app.current_user_id, but open callable access is a footgun if one ever does.
--
-- rls_auto_enable: revoke from PUBLIC/anon/authenticated.
--   Event trigger function — can only be meaningfully invoked by Postgres DDL.
--   Direct RPC calls fail harmlessly but should not be permitted.
--
-- employers_public: tighten to SELECT only.
--   GRANT ALL had been issued at some point; view is read-only by design.

REVOKE EXECUTE ON FUNCTION public.encrypt_value(text, text)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_value(text, text)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_current_user_id(text)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()              FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.encrypt_value(text, text)      TO service_role;
GRANT  EXECUTE ON FUNCTION public.decrypt_value(text, text)      TO service_role;
ALTER  FUNCTION public.encrypt_value(text, text)  SET search_path = pg_catalog, public;
ALTER  FUNCTION public.decrypt_value(text, text)  SET search_path = pg_catalog, public;
ALTER  FUNCTION public.set_current_user_id(text)  SET search_path = pg_catalog, public;
REVOKE ALL    ON public.employers_public FROM anon, authenticated;
GRANT  SELECT ON public.employers_public TO anon, authenticated;
