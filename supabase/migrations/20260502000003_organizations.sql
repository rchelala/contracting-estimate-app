CREATE TABLE organizations (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        text        NOT NULL,
  logo_storage_path           text,
  default_tax_zip             text,
  platform_fee_pct            numeric(5,2) NOT NULL DEFAULT 0,
  stripe_account_id           text,
  stripe_onboarding_complete  boolean     NOT NULL DEFAULT false,
  plan                        text        NOT NULL DEFAULT 'free'
                                CHECK (plan IN ('free', 'pro')),
  plan_period_start           timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             member_role NOT NULL DEFAULT 'member',
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX organization_members_user_id_idx ON organization_members (user_id);
CREATE INDEX organization_members_org_id_idx  ON organization_members (organization_id);

ALTER TABLE organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read own org"
  ON organizations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "owner can update org"
  ON organizations FOR UPDATE
  USING (is_org_owner(id));

CREATE POLICY "members can read org members"
  ON organization_members FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "owner can manage members"
  ON organization_members FOR INSERT
  WITH CHECK (is_org_owner(organization_id));

CREATE POLICY "owner can delete members"
  ON organization_members FOR DELETE
  USING (is_org_owner(organization_id));
