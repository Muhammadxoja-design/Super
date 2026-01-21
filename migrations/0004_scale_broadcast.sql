ALTER TABLE users ADD COLUMN telegram_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN last_seen INTEGER;
UPDATE users SET telegram_status = COALESCE(telegram_status, 'active');

ALTER TABLE tasks ADD COLUMN assigned_to INTEGER;
ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE tasks ADD COLUMN due_date TEXT;

CREATE TABLE IF NOT EXISTS task_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  assignment_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY(task_id) REFERENCES tasks(id),
  FOREIGN KEY(assignment_id) REFERENCES task_assignments(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_by_admin_id INTEGER NOT NULL,
  message_text TEXT,
  media_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  total_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  started_at INTEGER,
  finished_at INTEGER,
  correlation_id TEXT,
  created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY(created_by_admin_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS broadcast_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  broadcast_id INTEGER NOT NULL,
  user_id INTEGER,
  telegram_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_error_code INTEGER,
  last_error_message TEXT,
  next_attempt_at INTEGER,
  created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
  updated_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY(broadcast_id) REFERENCES broadcasts(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS message_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  user_id INTEGER,
  telegram_id TEXT,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_error_code INTEGER,
  last_error_message TEXT,
  next_attempt_at INTEGER,
  created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
  updated_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS users_status_index ON users(status);
CREATE INDEX IF NOT EXISTS users_last_seen_index ON users(last_seen);
CREATE INDEX IF NOT EXISTS users_direction_index ON users(direction);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_index ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_status_index ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_due_date_index ON tasks(due_date);
CREATE INDEX IF NOT EXISTS task_events_task_created_index ON task_events(task_id, created_at);
CREATE INDEX IF NOT EXISTS broadcast_logs_broadcast_status_index ON broadcast_logs(broadcast_id, status);
