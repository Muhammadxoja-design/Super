import crypto from "crypto";
import { z } from "zod";
import UZ_LOCATIONS_JSON from "../../client/src/lib/uz_locations.json";
import { auditRepository } from "../repositories/audit.repository";
import {
  getRequiredChannels,
  type RequiredChannel,
} from "../subscription";
import { Markup } from "../telegraf";
import {
  SUPER_ADMIN_TELEGRAM_ID_SET,
  TELEGRAM_INIT_DATA_TTL_MS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  COOKIE_SAMESITE,
  COOKIE_SECURE,
  SUPER_ADMIN_TELEGRAM_IDS,
  REQUIRE_ADMIN_APPROVAL,
} from "./constants";
import { type User, type Task } from "@shared/schema";

export const recentTelegramInitData = new Map<string, number>();

export function normalizeBotToken(rawToken: string | undefined) {
  if (!rawToken) return null;
  let token = rawToken.trim();
  const match = token.match(/bot_token\s*=\s*([^\s]+)$/i);
  if (match?.[1]) {
    token = match[1];
  } else if (token.includes("BOT_TOKEN=")) {
    const parts = token.split("BOT_TOKEN=");
    token = parts[parts.length - 1]?.trim() || token;
  }
  token = token.replace(/^["']|["']$/g, "");
  return token || null;
}

export function isSuperAdminTelegramId(telegramId?: string | number | null) {
  if (telegramId === undefined || telegramId === null) return false;
  return SUPER_ADMIN_TELEGRAM_ID_SET.has(String(telegramId).trim());
}

export function isDatabaseUnavailableError(error: unknown) {
  const code = (error as any)?.code;
  if (
    typeof code === "string" &&
    ["ECONNRESET", "ETIMEDOUT", "57P01"].includes(code)
  ) {
    return true;
  }

  const message =
    typeof (error as any)?.message === "string"
      ? (error as any).message.toLowerCase()
      : "";
  return (
    message.includes("connection terminated unexpectedly") ||
    message.includes("connection refused") ||
    message.includes("timeout expired") ||
    message.includes("database is unavailable")
  );
}

export function normalizeWebhookPath(pathValue: string) {
  const trimmed = pathValue.trim();
  if (!trimmed) return "/telegraf";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function logValidationFailure(
  route: string,
  payload: unknown,
  error: z.ZodError,
) {
  const keys =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? Object.keys(payload as Record<string, unknown>)
      : [];
  const issues = error.errors.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  console.warn(`[validation] ${route} failed`, { keys, issues });
}

export function formatBroadcastAttribution(admin: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}) {
  const nameParts = [admin.firstName, admin.lastName].filter(Boolean).join(" ");
  const displayName = nameParts || admin.username || "Admin";
  return `🧑‍💼 ${displayName} (Admin) xabari:\n\n`;
}

export function buildBroadcastPreviewPayload(params: {
  text: string;
  imageUrl?: string | null;
}) {
  if (params.imageUrl) {
    return {
      method: "sendPhoto",
      photo: params.imageUrl,
      caption: params.text || undefined,
    };
  }
  return {
    method: "sendMessage",
    text: params.text,
  };
}

export function normalizeWebhookUrl(value?: string) {
  if (!value) return undefined;
  return value.trim().replace(/\/+$/, "");
}

export function getTelegramUpdateType(update: Record<string, unknown>) {
  const keys = Object.keys(update).filter((key) => key !== "update_id");
  return keys[0] ?? "unknown";
}

export async function buildSubscriptionKeyboard(channels?: RequiredChannel[]) {
  const items = channels ?? (await getRequiredChannels());
  if (!items.length) return undefined;
  const rows = items
    .map((channel, index) => {
      const link = channel.inviteLinkOrUsername;
      if (!link) return null;
      return [Markup.button.url(`✅ Obuna bo‘lish ${index + 1}`, link)];
    })
    .filter(Boolean) as any[];

  rows.push([
    Markup.button.callback("✅ Tekshirish / Check", "check_subscription"),
  ]);
  return Markup.inlineKeyboard(rows);
}

export function createUpdateLogger(logger: Pick<Console, "log">) {
  let lastLogAt = 0;
  let suppressed = 0;
  return (update: Record<string, unknown>) => {
    const now = Date.now();
    if (now - lastLogAt < 10_000) {
      suppressed += 1;
      return;
    }
    const updateId = update.update_id;
    const type = getTelegramUpdateType(update);
    const suffix = suppressed ? ` (+${suppressed} suppressed)` : "";
    logger.log(`[telegram] update_id=${updateId} type=${type}${suffix}`);
    lastLogAt = now;
    suppressed = 0;
  };
}

export function isRecentInitData(hash: string) {
  const now = Date.now();
  for (const [key, timestamp] of recentTelegramInitData) {
    if (now - timestamp > TELEGRAM_INIT_DATA_TTL_MS) {
      recentTelegramInitData.delete(key);
    }
  }
  const lastSeen = recentTelegramInitData.get(hash);
  if (lastSeen && now - lastSeen <= TELEGRAM_INIT_DATA_TTL_MS) {
    recentTelegramInitData.set(hash, now);
    return true;
  }
  recentTelegramInitData.set(hash, now);
  return false;
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

export function toEpochMs(value: Date | number | string) {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "number") {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
  }
  return Number.NaN;
}

export function parseDateFilter(value?: string | string[]) {
  if (Array.isArray(value)) {
    value = value[0];
  }
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const dateOnly = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(dateOnly.getTime()) ? undefined : dateOnly;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function isSessionExpired(expiresAt?: Date | number | string | null) {
  if (!expiresAt) return true;
  const expiresAtMs = toEpochMs(expiresAt);
  if (!Number.isFinite(expiresAtMs)) return true;
  return expiresAtMs < Date.now();
}

export function hashSessionToken(token: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export function hashInitData(initData: string) {
  return crypto.createHash("sha256").update(initData).digest("hex");
}

export function renderTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : "";
  });
}

export function buildTaskMessageText(options: {
  template?: string | null;
  user: User;
  task: Task;
}) {
  const { template, user, task } = options;
  const base =
    template ||
    "Salom {first_name}! Sizga yangi topshiriq: {task_title}\n\n{task_desc}";
  const payload = renderTemplate(base, {
    first_name: user.firstName || "",
    last_name: user.lastName || "",
    username: user.username ? `@${user.username}` : "",
    task_title: task.title || "",
    task_desc: task.description || "",
    direction: user.direction || "",
    viloyat: user.viloyat || user.region || "",
    tuman: user.tuman || user.district || "",
    shahar: user.shahar || "",
    mahalla: user.mahalla || "",
  }).trim();
  const mention = user.username ? `@${user.username}\n` : "";
  return `${mention}${payload}`.trim();
}

export function buildSessionCookie(token: string) {
  const sameSite =
    COOKIE_SAMESITE === "none"
      ? "None"
      : COOKIE_SAMESITE === "strict"
        ? "Strict"
        : "Lax";
  const base = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${Math.floor(
    SESSION_TTL_MS / 1000,
  )}`;
  return COOKIE_SECURE ? `${base}; Secure` : base;
}

type UzLocations = Record<
  string,
  {
    districts?: string[];
    mahallas?: Record<string, string[] | Record<string, string[]>>;
  }
>;
const UZ_LOCATIONS = UZ_LOCATIONS_JSON as unknown as UzLocations;
const UZ_REGION_SET = new Set(Object.keys(UZ_LOCATIONS));
const DISALLOWED_NAME_VALUES = new Set(
  ["user", "no name", "noname", "telegram user", "telegram", "unknown"].map(
    (item) => item.toLowerCase(),
  ),
);
const NAME_ALLOWED_REGEX = /^[\p{L}'’ʻʼ-]+(?:\s+[\p{L}'’ʻʼ-]+)*$/u;

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeNameForCompare(value: string) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/['’ʻʼ-]/g, "");
}

export function throwValidationError(message: string, field?: string) {
  throw new z.ZodError([
    {
      code: z.ZodIssueCode.custom,
      message,
      path: field ? [field] : [],
    },
  ]);
}

export function validateNameField(
  value: string | null | undefined,
  field: "firstName" | "lastName",
  required: boolean,
) {
  const normalized = value ? normalizeName(value) : "";
  const label = field === "firstName" ? "Ism" : "Familiya";
  if (!normalized && !required) return null;
  if (!normalized) {
    throwValidationError(`${label} kiritilishi shart`, field);
  }
  if (normalized.length < 2 || normalized.length > 40) {
    throwValidationError(
      `${label} 2-40 ta belgidan iborat bo'lishi kerak`,
      field,
    );
  }
  if (!NAME_ALLOWED_REGEX.test(normalized)) {
    throwValidationError(
      `${label} faqat harf, bo'sh joy, apostrof yoki tire bo'lishi kerak`,
      field,
    );
  }
  const compare = normalizeNameForCompare(normalized);
  if (DISALLOWED_NAME_VALUES.has(compare)) {
    throwValidationError(
      `Iltimos haqiqiy ${label.toLowerCase()} kiriting`,
      field,
    );
  }
  return normalized;
}

export function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export function normalizeUzPhone(value: string) {
  const cleaned = normalizePhone(value);
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith("998")) {
    return `+${digits}`;
  }
  return null;
}

export function validateLocationField(
  viloyat: string,
  tumanOrShahar: string,
  mahalla: string,
) {
  if (!UZ_REGION_SET.has(viloyat)) {
    throwValidationError("Viloyat ro'yxatdan tanlanishi shart", "region");
  }
  const regionEntry = UZ_LOCATIONS[viloyat];
  const districts = regionEntry?.districts ?? [];
  if (!districts.includes(tumanOrShahar)) {
    throwValidationError(
      "Tuman/shahar ro'yxatdan tanlanishi shart",
      "district",
    );
  }
  const mahallas = regionEntry?.mahallas?.[tumanOrShahar];
  const mahallaList = Array.isArray(mahallas)
    ? mahallas
    : mahallas && typeof mahallas === "object"
      ? Object.values(mahallas).flatMap((value) =>
          Array.isArray(value) ? value : [],
        )
      : [];
  if (!mahallaList.includes(mahalla)) {
    throwValidationError("Mahalla ro'yxatdan tanlanishi shart", "mahalla");
  }
}

export function isProfileComplete(user: User) {
  return Boolean(
    user.firstName &&
    user.phone &&
    (user.viloyat || user.region) &&
    (user.tuman || user.district || user.shahar) &&
    user.mahalla &&
    user.birthDate &&
    user.direction,
  );
}

export function isProActiveUser(user: User) {
  return Boolean(
    user.plan === "PRO" && user.proUntil && user.proUntil > new Date(),
  );
}

export async function createAuditLog(entry: {
  actorId?: number | null;
  action: string;
  targetType: string;
  targetId?: number | null;
  metadata?: Record<string, unknown>;
}) {
  await auditRepository.createAuditLog({
    actorId: entry.actorId ?? null,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ?? null,
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
  });
}

export function clearSessionCookie() {
  const sameSite =
    COOKIE_SAMESITE === "none"
      ? "None"
      : COOKIE_SAMESITE === "strict"
        ? "Strict"
        : "Lax";
  const base = `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0`;
  return COOKIE_SECURE ? `${base}; Secure` : base;
}

export function verifyTelegramInitData(initData: string, botToken: string) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  if (!hash) return { valid: false };
  urlParams.delete("hash");

  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computedHash !== hash) {
    return { valid: false };
  }

  const authDate = urlParams.get("auth_date");
  if (authDate) {
    const authDateMs = parseInt(authDate, 10) * 1000;
    if (Number.isFinite(authDateMs)) {
      const age = Date.now() - authDateMs;
      if (age > 24 * 60 * 60 * 1000) {
        return { valid: false };
      }
    }
  }

  return { valid: true, urlParams };
}

export function getAdminIds() {
  return [
    process.env.ADMIN_TELEGRAM_IDS,
    process.env.ADMIN_TG_IDS,
    process.env.ADMIN_ID,
    ...SUPER_ADMIN_TELEGRAM_IDS,
  ]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function resolveUserRole(user?: User | null) {
  if (!user) return "user";
  if (user.telegramId && isSuperAdminTelegramId(user.telegramId)) {
    return "super_admin";
  }
  if (user.role === "super_admin") return "super_admin";
  if (user.role === "limited_admin") return "limited_admin";
  if (user.role === "admin" || user.role === "moderator")
    return "limited_admin";
  if (user.isAdmin) return "limited_admin";
  return "user";
}

export function isSuperAdminUser(user?: User | null) {
  return resolveUserRole(user) === "super_admin";
}

export function isAdminUser(user?: User | null) {
  const role = resolveUserRole(user);
  return role === "limited_admin" || role === "super_admin";
}

export function resolveUserStatus(options: {
  isAdmin?: boolean | null;
  currentStatus?: string | null;
}) {
  if (options.isAdmin) return "approved";
  if (options.currentStatus === "rejected") return "rejected";
  if (!REQUIRE_ADMIN_APPROVAL) return "approved";
  if (options.currentStatus === "approved") return "approved";
  return "pending";
}
