-- Strip trailing newlines from all existing tokens.
-- This makes already-sent email links work immediately (browsers strip \n
-- from href, so the URL token already matches after this UPDATE).
UPDATE estimates
SET public_token = replace(public_token, E'\n', '');

-- Change the default to hex: 48 URL-safe characters, no special chars,
-- no newlines, no base64 slashes or plus signs.
ALTER TABLE estimates
  ALTER COLUMN public_token
  SET DEFAULT encode(extensions.gen_random_bytes(24), 'hex');
