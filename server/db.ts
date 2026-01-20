
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
  sqlite.exec(`CREATE TABLE IF NOT EXISTS users (
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
    birth_date TEXT,
    direction TEXT,
    photo_url TEXT,
    password_hash TEXT,
    is_admin INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' NOT NULL,
    rejection_reason TEXT,
    created_at INTEGER DEFAULT (CURRENT_TIMESTAMP),
    updated_at INTEGER DEFAULT (CURRENT_TIMESTAMP)
  );`);

  const columns = sqlite.prepare("PRAGMA table_info(users)").all() as Array<{
    name: string;
  }>;

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
    { name: "created_at", definition: "INTEGER" },
    { name: "updated_at", definition: "INTEGER" },
  ];

  expectedColumns.forEach(({ name, definition }) => {
    if (!columnNames.has(name)) {
      sqlite.prepare(`ALTER TABLE users ADD COLUMN ${name} ${definition}`).run();
      columnNames.add(name);
    }
  });

  const legacyMappings = [
    { legacy: "firstName", current: "first_name" },
    { legacy: "firstname", current: "first_name" },
    { legacy: "lastName", current: "last_name" },
    { legacy: "lastname", current: "last_name" },
    { legacy: "photoUrl", current: "photo_url" },
    { legacy: "passwordHash", current: "password_hash" },
    { legacy: "birthDate", current: "birth_date" },
    { legacy: "telegramId", current: "telegram_id" },
    { legacy: "isAdmin", current: "is_admin" },
    { legacy: "createdAt", current: "created_at" },
    { legacy: "updatedAt", current: "updated_at" },
  ];

  legacyMappings.forEach(({ legacy, current }) => {
    if (columnNames.has(legacy) && columnNames.has(current)) {
      sqlite
        .prepare(
          `UPDATE users SET ${current} = COALESCE(${current}, ${legacy})`,
        )
        .run();
    }
  });

  sqlite
    .prepare("UPDATE users SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)")
    .run();
  sqlite
    .prepare("UPDATE users SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)")
    .run();

  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS users_set_timestamps_after_insert
    AFTER INSERT ON users
    FOR EACH ROW
    WHEN NEW.created_at IS NULL OR NEW.updated_at IS NULL
    BEGIN
      UPDATE users
      SET created_at = COALESCE(NEW.created_at, CURRENT_TIMESTAMP),
          updated_at = COALESCE(NEW.updated_at, CURRENT_TIMESTAMP)
      WHERE id = NEW.id;
    END;
  `);

  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS users_set_updated_at_after_update
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN NEW.updated_at IS NULL
    BEGIN
      UPDATE users
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.id;
    END;
  `);

  sqlite
    .prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_login_unique ON users(login)")
    .run();
  sqlite
    .prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_unique ON users(telegram_id)")
    .run();
};

ensureUsersSchema();
export const db = drizzle(sqlite, { schema });
