export const SERVICE_NAME = "Super";
export const SERVICE_VERSION =
  process.env.APP_VERSION || process.env.npm_package_version || "unknown";
export const SESSION_COOKIE_NAME = "taskbot_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const TELEGRAM_INIT_DATA_TTL_MS = 45 * 1000;
export const LAST_SEEN_UPDATE_MS = 1000 * 60 * 10;

const DEFAULT_COOKIE_SAMESITE =
  process.env.NODE_ENV === "production" ? "none" : "lax";
export const COOKIE_SAMESITE = (process.env.COOKIE_SAMESITE || DEFAULT_COOKIE_SAMESITE)
  .toLowerCase()
  .trim();
export const COOKIE_SECURE =
  process.env.COOKIE_SECURE === "true" ||
  COOKIE_SAMESITE === "none" ||
  process.env.NODE_ENV === "production";

export const parseTelegramIdList = (value?: string | null) =>
  (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

export const SUPER_ADMIN_TELEGRAM_IDS = parseTelegramIdList(
  process.env.SUPER_ADMIN_TELEGRAM_ID,
);
export const SUPER_ADMIN_TELEGRAM_ID_SET = new Set(SUPER_ADMIN_TELEGRAM_IDS);
export const SUBSCRIPTION_BYPASS_SUPERADMIN =
  process.env.SUBSCRIPTION_BYPASS_SUPERADMIN === "true";
export const REQUIRE_ADMIN_APPROVAL = process.env.REQUIRE_ADMIN_APPROVAL === "true";
