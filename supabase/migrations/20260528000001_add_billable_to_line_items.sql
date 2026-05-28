-- Add billable flag to line items.
-- Default true: all existing and new items are billable with no action needed.
-- Contractors only flip this for tools/equipment they absorb as internal cost.
ALTER TABLE estimate_line_items
  ADD COLUMN billable boolean NOT NULL DEFAULT true;

-- Redefine recalculate_estimate_totals to exclude non-billable items from totals.
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
    AND optional = false
    AND billable = true;

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
    AND billable = true
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
