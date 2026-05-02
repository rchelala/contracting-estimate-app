CREATE TABLE tax_rates (
  zip_code          text          PRIMARY KEY,
  state_code        text          NOT NULL,
  combined_rate_pct numeric(6,4)  NOT NULL,
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX tax_rates_state_code_idx ON tax_rates (state_code);

ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read tax rates"
  ON tax_rates FOR SELECT
  USING (auth.uid() IS NOT NULL);
