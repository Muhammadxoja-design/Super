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

export async function runDatabaseMigrations(options?: {
  logger?: Pick<Console, "log" | "error">;
}) {
  const logger = options?.logger ?? console;
  const migrationsFolderPath = fileURLToPath(
    new URL("../migrations", import.meta.url),
  );

  await migrate(db, { migrationsFolder: migrationsFolderPath });
  logger.log("Database migrations applied");
}

export { pool };
