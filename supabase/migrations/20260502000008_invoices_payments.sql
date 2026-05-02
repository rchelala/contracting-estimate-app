CREATE TABLE invoice_sequences (
  organization_id  uuid     PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  last_number      integer  NOT NULL DEFAULT 0
);

CREATE TABLE invoices (
  id               uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid            NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  estimate_id      uuid            REFERENCES estimates(id) ON DELETE SET NULL,
  client_id        uuid            REFERENCES clients(id) ON DELETE SET NULL,
  invoice_number   text            NOT NULL,
  status           invoice_status  NOT NULL DEFAULT 'draft',
  subtotal_cents   integer         NOT NULL DEFAULT 0,
  tax_cents        integer         NOT NULL DEFAULT 0,
  total_cents      integer         NOT NULL DEFAULT 0,
  notes            text,
  issued_at        timestamptz,
  due_at           timestamptz,
  sent_at          timestamptz,
  paid_at          timestamptz,
  created_at       timestamptz     NOT NULL DEFAULT now(),
  updated_at       timestamptz     NOT NULL DEFAULT now(),
  UNIQUE (organization_id, invoice_number)
);

CREATE INDEX invoices_org_id_idx      ON invoices (organization_id);
CREATE INDEX invoices_estimate_id_idx ON invoices (estimate_id);

CREATE TABLE payments (
  id                        uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid                 NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  estimate_id               uuid                 REFERENCES estimates(id) ON DELETE SET NULL,
  invoice_id                uuid                 REFERENCES invoices(id) ON DELETE SET NULL,
  stripe_payment_intent_id  text                 NOT NULL UNIQUE,
  stripe_charge_id          text,
  amount_cents              integer              NOT NULL,
  request_type              payment_request_type NOT NULL,
  status                    text                 NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at                timestamptz          NOT NULL DEFAULT now(),
  updated_at                timestamptz          NOT NULL DEFAULT now()
);

CREATE INDEX payments_org_id_idx      ON payments (organization_id);
CREATE INDEX payments_estimate_id_idx ON payments (estimate_id);

CREATE TABLE stripe_events (
  id            text        PRIMARY KEY,
  type          text        NOT NULL,
  processed_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read own invoices"
  ON invoices FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "members can insert invoices"
  ON invoices FOR INSERT
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY "members can update invoices"
  ON invoices FOR UPDATE
  USING (is_org_member(organization_id));

CREATE POLICY "members can read own payments"
  ON payments FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "service role manages invoice sequences"
  ON invoice_sequences FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "deny all stripe_events"
  ON stripe_events FOR ALL
  USING (false)
  WITH CHECK (false);
