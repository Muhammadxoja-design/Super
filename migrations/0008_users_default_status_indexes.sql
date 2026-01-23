ALTER TABLE users
  ALTER COLUMN status SET DEFAULT 'approved';

CREATE INDEX IF NOT EXISTS users_created_at_index ON users (created_at);
CREATE INDEX IF NOT EXISTS users_role_index ON users (role);
