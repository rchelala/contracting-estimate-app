-- Local development seed data.
-- Run after: npx supabase db reset
--
-- IMPORTANT: Before uncommenting the organization_members row, create a local
-- user with: npx supabase auth create-user --email dev@example.com --password devpassword123
-- Then replace <your-local-user-id> with the UUID printed by that command.

INSERT INTO organizations (id, name, default_tax_zip, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme Contracting',
  '90210',
  'pro'
)
ON CONFLICT (id) DO NOTHING;

-- Uncomment and fill in your local user ID after creating a dev user:
-- INSERT INTO organization_members (organization_id, user_id, role)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   '<your-local-user-id>',
--   'owner'
-- )
-- ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO clients (id, organization_id, name, email, city, state, zip)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Jane Smith',
  'jane@example.com',
  'Los Angeles',
  'CA',
  '90210'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tax_rates (zip_code, state_code, combined_rate_pct)
VALUES ('90210', 'CA', 10.25)
ON CONFLICT (zip_code) DO NOTHING;
