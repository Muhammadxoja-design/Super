-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Normalize legacy admin roles
UPDATE users
SET role = 'limited_admin'
WHERE role IN ('admin', 'moderator');

UPDATE users
SET role = 'limited_admin'
WHERE role = 'user' AND is_admin = true;

UPDATE users
SET is_admin = true
WHERE role IN ('limited_admin', 'super_admin');

-- Trigram indexes to speed up fuzzy search
CREATE INDEX IF NOT EXISTS users_first_name_trgm_idx
ON users USING GIN (lower(first_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS users_last_name_trgm_idx
ON users USING GIN (lower(last_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS users_username_trgm_idx
ON users USING GIN (lower(username) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS users_phone_trgm_idx
ON users USING GIN (phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS users_telegram_id_trgm_idx
ON users USING GIN (telegram_id gin_trgm_ops);
