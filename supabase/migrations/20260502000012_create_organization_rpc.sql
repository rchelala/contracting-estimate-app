-- create_organization: bootstrap RPC that lets an authenticated user create
-- their first organization plus their owner membership in a single atomic step.
--
-- Why SECURITY DEFINER: the `organizations` table has SELECT/UPDATE policies but
-- intentionally no INSERT policy — direct inserts from the authenticated role
-- would 403. This function runs with definer privileges to bypass that policy
-- for the bootstrap case while still binding both rows to auth.uid().
--
-- Hardening:
--   * Requires a valid auth.uid() (rejects anonymous calls).
--   * Trims and length-checks the company name (1..120 chars).
--   * Owner is always auth.uid() — caller cannot spoof another user.

CREATE OR REPLACE FUNCTION public.create_organization(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_org_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_name) < 1 OR char_length(v_name) > 120 THEN
    RAISE EXCEPTION 'organization name must be 1..120 characters' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organizations (name)
  VALUES (v_name)
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, v_uid, 'owner');

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization(text) TO authenticated;

COMMENT ON FUNCTION public.create_organization(text) IS
  'Authenticated bootstrap: creates an organization and an owner membership for auth.uid() atomically.';
