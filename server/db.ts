
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/schema';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlitePath =
  process.env.SQLITE_PATH ||
  process.env.DATABASE_URL ||
  path.join(dataDir, "taskbotfergana.sqlite");
const sqlite = new Database(sqlitePath);
const ensureUsersSchema = () => {
  const columns = sqlite.prepare("PRAGMA table_info(users)").all() as Array<{
    name: string;
  }>;

  if (columns.length === 0) {
    return;
  }

  const columnNames = new Set(columns.map((column) => column.name));
  const expectedColumns: Array<{ name: string; definition: string }> = [
    { name: "telegram_id", definition: "TEXT" },
    { name: "login", definition: "TEXT" },
    { name: "username", definition: "TEXT" },
    { name: "first_name", definition: "TEXT" },
    { name: "last_name", definition: "TEXT" },
    { name: "phone", definition: "TEXT" },
    { name: "region", definition: "TEXT" },
    { name: "district", definition: "TEXT" },
    { name: "mahalla", definition: "TEXT" },
    { name: "address", definition: "TEXT" },
    { name: "birth_date", definition: "TEXT" },
    { name: "direction", definition: "TEXT" },
    { name: "photo_url", definition: "TEXT" },
    { name: "password_hash", definition: "TEXT" },
    { name: "is_admin", definition: "INTEGER DEFAULT 0" },
    { name: "status", definition: "TEXT DEFAULT 'pending' NOT NULL" },
    { name: "rejection_reason", definition: "TEXT" },
    { name: "created_at", definition: "INTEGER DEFAULT (CURRENT_TIMESTAMP)" },
    { name: "updated_at", definition: "INTEGER DEFAULT (CURRENT_TIMESTAMP)" },
  ];

  expectedColumns.forEach(({ name, definition }) => {
    if (!columnNames.has(name)) {
      sqlite.prepare(`ALTER TABLE users ADD COLUMN ${name} ${definition}`).run();
    }
  });

  sqlite
    .prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_login_unique ON users(login)")
    .run();
  sqlite
    .prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_unique ON users(telegram_id)")
    .run();
};

ensureUsersSchema();
export const db = drizzle(sqlite, { schema });
