CREATE OR REPLACE FUNCTION recalculate_estimate_totals(p_estimate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subtotal_cents  bigint;
  v_tax_rate_pct    numeric(6,4);
  v_tax_cents       bigint;
BEGIN
  SELECT COALESCE(SUM(
    ROUND(quantity * unit_price_cents * (1.0 + markup_pct / 100.0))::bigint
  ), 0)
  INTO v_subtotal_cents
  FROM estimate_line_items
  WHERE estimate_id = p_estimate_id
    AND optional = false;

  SELECT tax_rate_pct
  INTO v_tax_rate_pct
  FROM estimates
  WHERE id = p_estimate_id;

  SELECT COALESCE(SUM(
    ROUND(
      quantity * unit_price_cents * (1.0 + markup_pct / 100.0)
      * COALESCE(v_tax_rate_pct, 0) / 100.0
    )::bigint
  ), 0)
  INTO v_tax_cents
  FROM estimate_line_items
  WHERE estimate_id = p_estimate_id
    AND optional = false
    AND taxable = true;

  UPDATE estimates
  SET
    subtotal_cents = v_subtotal_cents,
    tax_cents      = v_tax_cents,
    total_cents    = v_subtotal_cents + v_tax_cents,
    updated_at     = now()
  WHERE id = p_estimate_id;
END;
$$;

CREATE OR REPLACE FUNCTION next_estimate_number(p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next integer;
BEGIN
  INSERT INTO estimate_sequences (organization_id, last_number)
  VALUES (p_org_id, 1)
  ON CONFLICT (organization_id)
  DO UPDATE SET last_number = estimate_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN 'EST-' || LPAD(v_next::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION next_invoice_number(p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next integer;
BEGIN
  INSERT INTO invoice_sequences (organization_id, last_number)
  VALUES (p_org_id, 1)
  ON CONFLICT (organization_id)
  DO UPDATE SET last_number = invoice_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN 'INV-' || LPAD(v_next::text, 4, '0');
END;
$$;
