CREATE TABLE estimate_attachments (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  estimate_id           uuid        NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  section_id            uuid        REFERENCES estimate_sections(id) ON DELETE SET NULL,
  line_item_id          uuid        REFERENCES estimate_line_items(id) ON DELETE SET NULL,
  storage_path          text        NOT NULL,
  thumbnail_path        text,
  filename              text        NOT NULL,
  content_type          text        NOT NULL,
  size_bytes            integer     NOT NULL,
  show_in_client_view   boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX estimate_attachments_estimate_id_idx ON estimate_attachments (estimate_id);
CREATE INDEX estimate_attachments_org_id_idx      ON estimate_attachments (organization_id);

ALTER TABLE estimate_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read own attachments"
  ON estimate_attachments FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "members can insert attachments"
  ON estimate_attachments FOR INSERT
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY "members can delete attachments"
  ON estimate_attachments FOR DELETE
  USING (is_org_member(organization_id));

CREATE POLICY "public can read visible attachments"
  ON estimate_attachments FOR SELECT
  USING (
    show_in_client_view = true
    AND EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_id
        AND estimates.public_token IS NOT NULL
    )
  );
