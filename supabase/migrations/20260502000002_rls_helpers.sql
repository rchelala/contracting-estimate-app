CREATE OR REPLACE FUNCTION is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_org_owner(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND role = 'owner'
  );
$$;
