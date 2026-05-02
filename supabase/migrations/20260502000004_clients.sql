CREATE TABLE clients (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  email            text,
  phone            text,
  address_line1    text,
  address_line2    text,
  city             text,
  state            text,
  zip              text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clients_org_id_idx ON clients (organization_id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read own clients"
  ON clients FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "members can insert clients"
  ON clients FOR INSERT
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY "members can update clients"
  ON clients FOR UPDATE
  USING (is_org_member(organization_id));

CREATE POLICY "members can delete clients"
  ON clients FOR DELETE
  USING (is_org_member(organization_id));
