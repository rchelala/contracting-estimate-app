-- The public read policies on estimate_sections, estimate_line_items, and
-- estimate_attachments had the same bug fixed for estimates in 20260513000001:
-- they checked `public_token IS NOT NULL` without requiring `auth.uid() IS NULL`.
-- Since public_token is always non-null (NOT NULL column with a default), any
-- authenticated user from any organization could read all sections, line items,
-- and attachments across all orgs.
-- Fix: restrict each policy to unauthenticated (anon) users only, matching the
-- pattern used for the estimates table fix.

DROP POLICY IF EXISTS "public can read sections" ON estimate_sections;
CREATE POLICY "public can read sections"
  ON estimate_sections FOR SELECT
  USING (
    auth.uid() IS NULL
    AND EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_id
        AND estimates.public_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "public can read line items" ON estimate_line_items;
CREATE POLICY "public can read line items"
  ON estimate_line_items FOR SELECT
  USING (
    auth.uid() IS NULL
    AND EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_id
        AND estimates.public_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "public can read visible attachments" ON estimate_attachments;
CREATE POLICY "public can read visible attachments"
  ON estimate_attachments FOR SELECT
  USING (
    auth.uid() IS NULL
    AND show_in_client_view = true
    AND EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_id
        AND estimates.public_token IS NOT NULL
    )
  );
