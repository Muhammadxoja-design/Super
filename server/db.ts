import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.DATABASE_URL_INTERNAL ??
  process.env.POSTGRES_URL ??
  process.env.RENDER_DATABASE_URL;
const isProduction = process.env.NODE_ENV === "production";

if (!databaseUrl) {
  throw new Error(
    "Database URL is missing. Set DATABASE_URL (or DATABASE_URL_INTERNAL/POSTGRES_URL/RENDER_DATABASE_URL) in the environment.",
  );
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

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

export { pool };
