CREATE TABLE ai_usage_events (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  estimate_id      uuid          REFERENCES estimates(id) ON DELETE SET NULL,
  user_id          uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model            text          NOT NULL,
  call_type        ai_call_type  NOT NULL,
  input_tokens     integer       NOT NULL,
  output_tokens    integer       NOT NULL,
  cost_cents       integer       NOT NULL,
  latency_ms       integer       NOT NULL,
  created_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX ai_usage_events_org_id_idx      ON ai_usage_events (organization_id);
CREATE INDEX ai_usage_events_estimate_id_idx ON ai_usage_events (estimate_id);
CREATE INDEX ai_usage_events_created_at_idx  ON ai_usage_events (created_at);

CREATE TABLE automations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trigger_type     text        NOT NULL
                    CHECK (trigger_type IN ('estimate_expiry_reminder', 'unseen_followup')),
  config           jsonb       NOT NULL DEFAULT '{}',
  enabled          boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX automations_org_id_idx ON automations (organization_id);

ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read own ai usage"
  ON ai_usage_events FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "members can read own automations"
  ON automations FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "members can insert automations"
  ON automations FOR INSERT
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY "members can update automations"
  ON automations FOR UPDATE
  USING (is_org_member(organization_id));

CREATE POLICY "members can delete automations"
  ON automations FOR DELETE
  USING (is_org_member(organization_id));
