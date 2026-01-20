ALTER TABLE tasks ADD COLUMN idempotency_key TEXT;
ALTER TABLE audit_logs ADD COLUMN payload_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_idempotency_key_unique ON tasks(idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS audit_logs_dedupe_unique ON audit_logs(actor_id, action, payload_hash);
