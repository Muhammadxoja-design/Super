
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
const ensureUsersLoginColumn = () => {
  const columns = sqlite.prepare("PRAGMA table_info(users)").all() as Array<{
    name: string;
  }>;
  const hasLoginColumn = columns.some((column) => column.name === "login");

  if (!hasLoginColumn) {
    sqlite.prepare("ALTER TABLE users ADD COLUMN login TEXT").run();
    sqlite
      .prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_login_unique ON users(login)")
      .run();
  }
};

ensureUsersLoginColumn();
export const db = drizzle(sqlite, { schema });
