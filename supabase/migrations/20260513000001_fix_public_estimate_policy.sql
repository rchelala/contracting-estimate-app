-- The original "public can read estimate by token" policy used
-- `public_token IS NOT NULL` which is always true (the column is NOT NULL
-- with a default), so every authenticated user could read every estimate.
-- Fix: restrict the policy to unauthenticated (anon) users only.
-- Authenticated users must access estimates through is_org_member().
-- Unauthenticated clients visiting /e/:token are unaffected.

DROP POLICY IF EXISTS "public can read estimate by token" ON estimates;

CREATE POLICY "public can read estimate by token"
  ON estimates FOR SELECT
  USING (auth.uid() IS NULL AND public_token IS NOT NULL);
