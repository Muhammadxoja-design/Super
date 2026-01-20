-- TaskBotFergana initial schema
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT UNIQUE,
  login TEXT UNIQUE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  region TEXT,
  district TEXT,
  mahalla TEXT,
  address TEXT,
  direction TEXT,
  photo_url TEXT,
  password_hash TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
  updated_at INTEGER DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  created_by_admin_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY(created_by_admin_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS task_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  status_updated_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
  note TEXT,
  created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY(task_id) REFERENCES tasks(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
  expires_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
