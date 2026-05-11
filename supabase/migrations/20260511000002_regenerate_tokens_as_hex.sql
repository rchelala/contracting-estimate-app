-- Regenerate all existing tokens to hex encoding.
-- Base64 tokens can start with '/' (collapses double-slash in URLs) or contain
-- '+' (mishandled by some email clients), making links unreliable.
-- Hex produces 48 lowercase [0-9a-f] characters -- always URL-safe.
-- Previously sent email links are already broken, so regenerating is safe.
UPDATE estimates
SET public_token = encode(extensions.gen_random_bytes(24), 'hex');
