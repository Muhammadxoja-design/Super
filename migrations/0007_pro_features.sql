-- Add roles, plans, location fields, and activity tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'FREE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS viloyat TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tuman TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS shahar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP;

-- Backfill new location fields from existing region/district where possible
UPDATE users SET viloyat = COALESCE(viloyat, region);
UPDATE users SET tuman = COALESCE(tuman, district);

-- Task targeting metadata
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_value TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS template_id INTEGER;

-- Proof and delivery tracking for assignments
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS proof_text TEXT;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS proof_file_id TEXT;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS proof_type TEXT;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS proof_submitted_at TIMESTAMP;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- Message queue delivery tracking
ALTER TABLE message_queue ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- Templates
CREATE TABLE IF NOT EXISTS message_templates (
  id SERIAL PRIMARY KEY,
  title TEXT,
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Billing transactions
CREATE TABLE IF NOT EXISTS billing_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'UZS',
  method TEXT DEFAULT 'manual',
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for new filters and audit logging
CREATE INDEX IF NOT EXISTS users_viloyat_index ON users(viloyat);
CREATE INDEX IF NOT EXISTS users_tuman_index ON users(tuman);
CREATE INDEX IF NOT EXISTS users_mahalla_index ON users(mahalla);
CREATE INDEX IF NOT EXISTS users_name_index ON users(first_name, last_name);
CREATE INDEX IF NOT EXISTS users_username_index ON users(username);
CREATE INDEX IF NOT EXISTS users_phone_index ON users(phone);
CREATE INDEX IF NOT EXISTS task_assignments_task_status_index ON task_assignments(task_id, status);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_index ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS audit_logs_actor_index ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_index ON audit_logs(action);
CREATE INDEX IF NOT EXISTS billing_transactions_user_index ON billing_transactions(user_id);
