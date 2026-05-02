CREATE TABLE estimate_sections (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  estimate_id      uuid        NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  position         integer     NOT NULL DEFAULT 10,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX estimate_sections_estimate_id_idx ON estimate_sections (estimate_id);
CREATE INDEX estimate_sections_org_id_idx      ON estimate_sections (organization_id);

CREATE TABLE estimate_line_items (
  id                      uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid               NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  estimate_id             uuid               NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  section_id              uuid               NOT NULL REFERENCES estimate_sections(id) ON DELETE CASCADE,
  description             text               NOT NULL,
  quantity                numeric(10,3)      NOT NULL DEFAULT 1,
  unit                    text,
  unit_price_cents        integer            NOT NULL DEFAULT 0,
  markup_pct              numeric(5,2)       NOT NULL DEFAULT 0,
  optional                boolean            NOT NULL DEFAULT false,
  taxable                 boolean            NOT NULL DEFAULT true,
  source                  line_item_source   NOT NULL DEFAULT 'contractor',
  ai_price_low_cents      integer,
  ai_price_typical_cents  integer,
  ai_price_high_cents     integer,
  position                integer            NOT NULL DEFAULT 10,
  created_at              timestamptz        NOT NULL DEFAULT now(),
  updated_at              timestamptz        NOT NULL DEFAULT now()
);

CREATE INDEX estimate_line_items_section_id_idx  ON estimate_line_items (section_id);
CREATE INDEX estimate_line_items_estimate_id_idx ON estimate_line_items (estimate_id);
CREATE INDEX estimate_line_items_org_id_idx      ON estimate_line_items (organization_id);

ALTER TABLE estimate_sections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read own sections"
  ON estimate_sections FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "members can insert sections"
  ON estimate_sections FOR INSERT
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY "members can update sections"
  ON estimate_sections FOR UPDATE
  USING (is_org_member(organization_id));

CREATE POLICY "members can delete sections"
  ON estimate_sections FOR DELETE
  USING (is_org_member(organization_id));

CREATE POLICY "members can read own line items"
  ON estimate_line_items FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "members can insert line items"
  ON estimate_line_items FOR INSERT
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY "members can update line items"
  ON estimate_line_items FOR UPDATE
  USING (is_org_member(organization_id));

CREATE POLICY "members can delete line items"
  ON estimate_line_items FOR DELETE
  USING (is_org_member(organization_id));

CREATE POLICY "public can read sections"
  ON estimate_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_id
        AND estimates.public_token IS NOT NULL
    )
  );

CREATE POLICY "public can read line items"
  ON estimate_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_id
        AND estimates.public_token IS NOT NULL
    )
  );
