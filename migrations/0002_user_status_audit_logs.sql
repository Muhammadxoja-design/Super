ALTER TABLE users ADD COLUMN birth_date TEXT;
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE users ADD COLUMN rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER,
  metadata TEXT,
  created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY(actor_id) REFERENCES users(id)
);
