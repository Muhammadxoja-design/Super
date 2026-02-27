import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

function normalizeDatabaseUrl(rawUrl: string | undefined) {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  const unquoted = trimmed.replace(/^["']|["']$/g, "");
  return unquoted || null;
}

function getUrlHost(urlValue: string) {
  try {
    return new URL(urlValue).hostname;
  } catch {
    return null;
  }
}

function isLikelyPrivateRenderHost(hostname: string) {
  return hostname.startsWith("dpg-") && !hostname.includes(".");
}

const databaseUrlCandidates = [
  {
    source: "DATABASE_URL",
    url: normalizeDatabaseUrl(process.env.DATABASE_URL),
  },
  {
    source: "DATABASE_URL_INTERNAL",
    url: normalizeDatabaseUrl(process.env.DATABASE_URL_INTERNAL),
  },
  {
    source: "POSTGRES_URL",
    url: normalizeDatabaseUrl(process.env.POSTGRES_URL),
  },
  {
    source: "RENDER_DATABASE_URL",
    url: normalizeDatabaseUrl(process.env.RENDER_DATABASE_URL),
  },
] as const;

const preferredDatabaseUrl = databaseUrlCandidates.find(
  (candidate) => Boolean(candidate.url),
);

const fallbackWithPublicHost = databaseUrlCandidates.find((candidate) => {
  if (!candidate.url) return false;
  const host = getUrlHost(candidate.url);
  return Boolean(host && !isLikelyPrivateRenderHost(host));
});

const preferredHost = preferredDatabaseUrl?.url
  ? getUrlHost(preferredDatabaseUrl.url)
  : null;

const usePublicFallback = Boolean(
  preferredHost &&
    isLikelyPrivateRenderHost(preferredHost) &&
    fallbackWithPublicHost?.url,
);

const databaseUrl = usePublicFallback
  ? fallbackWithPublicHost?.url ?? null
  : preferredDatabaseUrl?.url ?? null;

const databaseUrlSource = usePublicFallback
  ? fallbackWithPublicHost?.source ?? null
  : preferredDatabaseUrl?.source ?? null;

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
  if (usePublicFallback && preferredHost) {
    console.warn(
      `Database URL host \"${preferredHost}\" looks like a private Render hostname and DNS lookup may fail in this service. Falling back to ${databaseUrlSource}.`,
    );
  }
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

export { pool };
