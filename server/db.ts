import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import * as schema from "@shared/schema";

function normalizeDatabaseUrl(rawUrl: string | undefined) {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  const unquoted = trimmed.replace(/^["']|["']$/g, "");
  return unquoted || null;
}

function isLikelyShortRenderHost(hostname: string) {
  return hostname.startsWith("dpg-") && !hostname.includes(".");
}

function repairDatabaseUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const originalHost = parsed.hostname;
    if (!isLikelyShortRenderHost(originalHost)) {
      return rawUrl;
    }

    const hostSuffix =
      process.env.RENDER_DB_HOST_SUFFIX?.trim() || "oregon-postgres.render.com";
    parsed.hostname = `${parsed.hostname}.${hostSuffix}`;

    if (!parsed.port) {
      parsed.port = "5432";
    }

    console.warn(
      `Database URL host looked incomplete ("${originalHost}"). Repaired host to "${parsed.hostname}".`,
    );

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

const rawDatabaseUrl =
  normalizeDatabaseUrl(process.env.DATABASE_URL) ??
  normalizeDatabaseUrl(process.env.DATABASE_URL_INTERNAL) ??
  normalizeDatabaseUrl(process.env.POSTGRES_URL) ??
  normalizeDatabaseUrl(process.env.RENDER_DATABASE_URL);

const databaseUrl = rawDatabaseUrl ? repairDatabaseUrl(rawDatabaseUrl) : null;

const databaseUrlSource = process.env.DATABASE_URL
  ? "DATABASE_URL"
  : process.env.DATABASE_URL_INTERNAL
    ? "DATABASE_URL_INTERNAL"
    : process.env.POSTGRES_URL
      ? "POSTGRES_URL"
      : process.env.RENDER_DATABASE_URL
        ? "RENDER_DATABASE_URL"
        : null;

if (databaseUrlSource) {
  const rawValue =
    databaseUrlSource === "DATABASE_URL"
      ? process.env.DATABASE_URL
      : databaseUrlSource === "DATABASE_URL_INTERNAL"
        ? process.env.DATABASE_URL_INTERNAL
        : databaseUrlSource === "POSTGRES_URL"
          ? process.env.POSTGRES_URL
          : process.env.RENDER_DATABASE_URL;
  if (rawValue && rawValue.trim() !== rawValue.replace(/^["']|["']$/g, "")) {
    console.warn("Database URL contained wrapping quotes; sanitized value used.");
  }
}
const isProduction = process.env.NODE_ENV === "production";

if (!databaseUrl) {
  console.error("Database URL missing. Env keys present:", {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DATABASE_URL_INTERNAL: Boolean(process.env.DATABASE_URL_INTERNAL),
    POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
    RENDER_DATABASE_URL: Boolean(process.env.RENDER_DATABASE_URL),
  });
  throw new Error(
    "Database URL is missing. Set DATABASE_URL (or DATABASE_URL_INTERNAL/POSTGRES_URL/RENDER_DATABASE_URL) in the environment.",
  );
}

if (databaseUrlSource) {
  console.log(`Database URL source: ${databaseUrlSource}`);
}

let pool: Pool;
try {
  pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  });
} catch (error) {
  console.error("Failed to create PostgreSQL pool:", error);
  throw error;
}

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export const db = drizzle(pool, { schema });

export async function queryDatabaseNow() {
  const result = await pool.query("select now() as now");
  return result.rows[0]?.now as string | Date | undefined;
}

export async function checkDatabaseReady() {
  await pool.query("select 1");
}

export async function waitForDatabase(options?: {
  logger?: Pick<Console, "log" | "error">;
  maxAttempts?: number;
}) {
  const logger = options?.logger ?? console;
  const maxAttempts = options?.maxAttempts ?? 12;
  let delayMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await checkDatabaseReady();
      logger.log("Database connection ready");
      return true;
    } catch (error) {
      logger.error(
        `Database connection failed (attempt ${attempt}/${maxAttempts}).`,
        error,
      );
      if (attempt === maxAttempts) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 30000);
    }
  }

  return false;
}

async function ensurePostgresSchema(options?: {
  logger?: Pick<Console, "log" | "error">;
}) {
  const logger = options?.logger ?? console;
  const statements = [
    `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id TEXT,
      login TEXT,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      region TEXT,
      district TEXT,
      viloyat TEXT,
      tuman TEXT,
      shahar TEXT,
      mahalla TEXT,
      address TEXT,
      birth_date TEXT,
      direction TEXT,
      photo_url TEXT,
      password_hash TEXT,
      is_admin BOOLEAN DEFAULT false,
      role TEXT NOT NULL DEFAULT 'user',
      plan TEXT NOT NULL DEFAULT 'FREE',
      pro_until TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'approved',
      telegram_status TEXT DEFAULT 'active',
      last_seen TIMESTAMP,
      last_active TIMESTAMP,
      approved_at TIMESTAMP,
      approved_by TEXT,
      rejected_at TIMESTAMP,
      rejected_by TEXT,
      rejection_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_unique ON users(telegram_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_login_unique ON users(login)`,
    `CREATE TABLE IF NOT EXISTS message_templates (
      id SERIAL PRIMARY KEY,
      title TEXT,
      body TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      idempotency_key TEXT,
      created_by_admin_id INTEGER NOT NULL REFERENCES users(id),
      assigned_to INTEGER,
      status TEXT DEFAULT 'ACTIVE',
      due_date TEXT,
      target_type TEXT,
      target_value TEXT,
      target_count INTEGER DEFAULT 0,
      template_id INTEGER REFERENCES message_templates(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS task_assignments (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status_updated_by_user_id INTEGER REFERENCES users(id),
      status_note TEXT,
      note TEXT,
      proof_text TEXT,
      proof_file_id TEXT,
      proof_type TEXT,
      proof_submitted_at TIMESTAMP,
      delivered_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      actor_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      metadata TEXT,
      payload_hash TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS task_events (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id),
      assignment_id INTEGER NOT NULL REFERENCES task_assignments(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS broadcasts (
      id SERIAL PRIMARY KEY,
      created_by_admin_id INTEGER NOT NULL REFERENCES users(id),
      message_text TEXT,
      media_url TEXT,
      mode TEXT NOT NULL DEFAULT 'copy',
      source_chat_id TEXT,
      source_message_id INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      total_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      started_at TIMESTAMP,
      finished_at TIMESTAMP,
      correlation_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS broadcast_logs (
      id SERIAL PRIMARY KEY,
      broadcast_id INTEGER NOT NULL REFERENCES broadcasts(id),
      user_id INTEGER REFERENCES users(id),
      telegram_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      last_error_code INTEGER,
      last_error_message TEXT,
      next_attempt_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS message_queue (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      telegram_id TEXT,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      last_error_code INTEGER,
      last_error_message TEXT,
      next_attempt_at TIMESTAMP,
      delivered_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS billing_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      amount NUMERIC(12,2) NOT NULL,
      currency TEXT DEFAULT 'UZS',
      method TEXT DEFAULT 'manual',
      note TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }

  logger.log("Database schema ensured via PostgreSQL fallback");
}

export async function runDatabaseMigrations(options?: {
  logger?: Pick<Console, "log" | "error">;
}) {
  const logger = options?.logger ?? console;
  const migrationsFolderPath = fileURLToPath(
    new URL("../migrations", import.meta.url),
  );

  try {
    await migrate(db, { migrationsFolder: migrationsFolderPath });
    logger.log("Database migrations applied");
  } catch (error) {
    logger.error(
      "Migration files failed on PostgreSQL. Falling back to schema ensure.",
      error,
    );
    await ensurePostgresSchema({ logger });
  }
}

export { pool };
