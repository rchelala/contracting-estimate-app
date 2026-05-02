CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE estimate_sequences (
  organization_id  uuid     PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  last_number      integer  NOT NULL DEFAULT 0
);

CREATE TABLE estimates (
  id                    uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id             uuid             REFERENCES clients(id) ON DELETE SET NULL,
  estimate_number       text             NOT NULL,
  status                estimate_status  NOT NULL DEFAULT 'draft',
  title                 text,
  notes                 text,
  tax_zip               text,
  tax_rate_pct          numeric(6,4),
  subtotal_cents        integer          NOT NULL DEFAULT 0,
  tax_cents             integer          NOT NULL DEFAULT 0,
  total_cents           integer          NOT NULL DEFAULT 0,
  public_token          text             NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'base64'),
  issued_at             timestamptz,
  expires_at            timestamptz,
  sent_at               timestamptz,
  first_sent_at         timestamptz,
  approved_at           timestamptz,
  approved_by_name      text,
  approved_client_ip    text,
  approved_user_agent   text,
  created_at            timestamptz      NOT NULL DEFAULT now(),
  updated_at            timestamptz      NOT NULL DEFAULT now(),
  UNIQUE (organization_id, estimate_number)
);

CREATE INDEX estimates_org_id_idx       ON estimates (organization_id);
CREATE INDEX estimates_client_id_idx    ON estimates (client_id);
CREATE INDEX estimates_status_idx       ON estimates (status);
CREATE INDEX estimates_public_token_idx ON estimates (public_token);

ALTER TABLE estimates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read own estimates"
  ON estimates FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "members can insert estimates"
  ON estimates FOR INSERT
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY "members can update estimates"
  ON estimates FOR UPDATE
  USING (is_org_member(organization_id));

CREATE POLICY "members can delete estimates"
  ON estimates FOR DELETE
  USING (is_org_member(organization_id));

CREATE POLICY "public can read estimate by token"
  ON estimates FOR SELECT
  USING (public_token IS NOT NULL);

CREATE POLICY "service role manages sequences"
  ON estimate_sequences FOR ALL
  USING (false)
  WITH CHECK (false);
