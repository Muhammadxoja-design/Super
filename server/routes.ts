import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "./password";
import { Telegraf, Markup } from "telegraf";
import {
  TASK_STATUSES,
  USER_STATUSES,
  type TaskAssignment,
  type User,
} from "@shared/schema";
import { startTelegramRuntime } from "./telegram";
import { createGracefulShutdown } from "./lifecycle";
import { startQueueWorker } from "./queue-worker";
import { getStatusLabel, parseTaskStatusCallback } from "./task-status";

const SESSION_COOKIE_NAME = "taskbot_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const TELEGRAM_INIT_DATA_TTL_MS = 45 * 1000;
const LAST_SEEN_UPDATE_MS = 1000 * 60 * 10;
const DEFAULT_COOKIE_SAMESITE =
  process.env.NODE_ENV === "production" ? "none" : "lax";
const COOKIE_SAMESITE = (process.env.COOKIE_SAMESITE || DEFAULT_COOKIE_SAMESITE)
  .toLowerCase()
  .trim();
const COOKIE_SECURE =
  process.env.COOKIE_SECURE === "true" ||
  COOKIE_SAMESITE === "none" ||
  process.env.NODE_ENV === "production";
const recentTelegramInitData = new Map<string, number>();

function isRecentInitData(hash: string) {
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

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function toEpochMs(value: Date | number | string) {
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

function isSessionExpired(expiresAt?: Date | number | string | null) {
  if (!expiresAt) return true;
  const expiresAtMs = toEpochMs(expiresAt);
  if (!Number.isFinite(expiresAtMs)) return true;
  return expiresAtMs < Date.now();
}

function hashSessionToken(token: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

function hashInitData(initData: string) {
  return crypto.createHash("sha256").update(initData).digest("hex");
}

function buildSessionCookie(token: string) {
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

function isProfileComplete(user: User) {
  return Boolean(
    user.firstName &&
    user.lastName &&
    user.phone &&
    user.region &&
    user.district &&
    user.mahalla &&
    user.address &&
    user.birthDate &&
    user.direction,
  );
}

async function createAuditLog(entry: {
  actorId?: number | null;
  action: string;
  targetType: string;
  targetId?: number | null;
  metadata?: Record<string, unknown>;
}) {
  await storage.createAuditLog({
    actorId: entry.actorId ?? null,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ?? null,
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
  });
}

function clearSessionCookie() {
  const sameSite =
    COOKIE_SAMESITE === "none"
      ? "None"
      : COOKIE_SAMESITE === "strict"
        ? "Strict"
        : "Lax";
  const base = `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0`;
  return COOKIE_SECURE ? `${base}; Secure` : base;
}

function verifyTelegramInitData(initData: string, botToken: string) {
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

function getAdminIds() {
  return [
    process.env.ADMIN_TELEGRAM_IDS,
    process.env.ADMIN_TG_IDS,
    process.env.ADMIN_ID,
  ]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

async function getOrCreateTelegramUser(telegramUser: any) {
  const telegramId = String(telegramUser.id);
  let user = await storage.getUserByTelegramId(telegramId);

  const adminIds = getAdminIds();
  const isAdmin = adminIds.includes(telegramId);

  if (!user) {
    user = await storage.createUser({
      telegramId,
      username: telegramUser.username || null,
      firstName: telegramUser.first_name || null,
      lastName: telegramUser.last_name || null,
      photoUrl: telegramUser.photo_url || null,
      isAdmin,
      status: isAdmin ? "approved" : "pending",
    });
  } else {
    user = await storage.updateUser(user.id, {
      username: telegramUser.username || user.username,
      firstName: telegramUser.first_name || user.firstName,
      lastName: telegramUser.last_name || user.lastName,
      photoUrl: telegramUser.photo_url || user.photoUrl,
      isAdmin: user.isAdmin || isAdmin,
      status: user.status || (isAdmin ? "approved" : "pending"),
    });
  }

  return user;
}

async function ensureTelegramAdmin(ctx: any) {
  if (!ctx.from) return null;
  const telegramId = String(ctx.from.id);
  let user = await storage.getUserByTelegramId(telegramId);
  if (!user) {
    user = await storage.createUser({
      telegramId,
      username: ctx.from.username || null,
      firstName: ctx.from.first_name || null,
      lastName: ctx.from.last_name || null,
      isAdmin: true,
      status: "approved",
    });
  }
  if (!user.isAdmin) {
    user = await storage.updateUser(user.id, {
      isAdmin: true,
      status: "approved",
    });
  }
  return user;
}

async function isTelegramAdmin(telegramId: string) {
  const adminIds = getAdminIds();
  if (adminIds.includes(telegramId)) return true;
  const user = await storage.getUserByTelegramId(telegramId);
  return Boolean(user?.isAdmin);
}

const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    console.warn("Auth failed: no session cookie");
    return res
      .status(401)
      .json({ message: "No session token", code: "NO_TOKEN" });
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error("Auth failed: SESSION_SECRET not configured");
    return res.status(500).json({
      message: "SESSION_SECRET not configured",
      code: "SERVER_MISCONFIG",
    });
  }

  const tokenHash = hashSessionToken(token, secret);
  const session = await storage.getSessionByTokenHash(tokenHash);
  if (!session || isSessionExpired(session.expiresAt)) {
    if (session) {
      await storage.deleteSessionByTokenHash(tokenHash);
    }
    console.warn("Auth failed: session expired or missing");
    return res
      .status(401)
      .json({ message: "Session expired", code: "EXPIRED" });
  }

  const user = await storage.getUser(session.userId);
  if (!user) {
    console.warn("Auth failed: user not found");
    return res
      .status(401)
      .json({ message: "User not found", code: "USER_NOT_FOUND" });
  }

  if (!user.lastSeen || Date.now() - new Date(user.lastSeen).getTime() > LAST_SEEN_UPDATE_MS) {
    await storage.updateUserLastSeen(user.id, new Date());
  }

  (req as any).user = user;
  (req as any).sessionTokenHash = tokenHash;
  next();
};

async function getSessionUser(req: Request) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return { user: null as User | null };

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET not configured");
  }

  const tokenHash = hashSessionToken(token, secret);
  const session = await storage.getSessionByTokenHash(tokenHash);
  if (!session || isSessionExpired(session.expiresAt)) {
    if (session) {
      await storage.deleteSessionByTokenHash(tokenHash);
    }
    return { user: null as User | null };
  }

  const user = await storage.getUser(session.userId);
  return { user, tokenHash };
}

const requireApprovedUser = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = (req as any).user as User | undefined;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized", code: "NO_USER" });
  }
  if (user.isAdmin) return next();
  if (user.status !== "approved") {
    return res
      .status(403)
      .json({ message: "User not approved", code: "NOT_APPROVED" });
  }
  if (!isProfileComplete(user)) {
    return res
      .status(403)
      .json({ message: "Profile incomplete", code: "PROFILE_INCOMPLETE" });
  }
  next();
};

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as User | undefined;
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

async function createSession(res: Response, userId: number) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET not configured");
  }
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken, secret);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await storage.createSession({
    userId,
    tokenHash,
    expiresAt,
  });
  res.setHeader("Set-Cookie", buildSessionCookie(rawToken));
}



export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  const botToken = process.env.BOT_TOKEN;
  let bot: Telegraf | null = null;
  const webAppUrl = process.env.WEBAPP_URL;
  const webhookPath = (process.env.WEBHOOK_PATH || "/tg/webhook").trim();
  const webhookUrl = process.env.WEBHOOK_URL?.trim();
  const isProduction = process.env.NODE_ENV === "production";
  const adminTaskDrafts = new Map<
    number,
    { taskId: number; title: string; description?: string }
  >();
  const adminAwaitingTask = new Set<number>();
  const adminAwaitingRejectionReason = new Map<
    number,
    { userId: number; adminTelegramId: string }
  >();
  const awaitingStatusNote = new Map<
    number,
    { assignmentId: number; status: (typeof TASK_STATUSES)[number] }
  >();
  let stopQueueWorker: (() => void) | null = null;

  const enqueueTaskNotification = async (
    assignment: TaskAssignment,
    user: User | undefined,
    adminUserId?: number,
    forwardMessageId?: number,
  ) => {
    if (!user?.telegramId) return;
    await storage.enqueueMessage({
      type: "task_assignment",
      userId: user.id,
      telegramId: user.telegramId,
      payload: JSON.stringify({
        type: "task_assignment",
        assignmentId: assignment.id,
        text: "Senga buyruq keldi!",
        webAppUrl,
        adminUserId: adminUserId ?? null,
        forwardMessageId: forwardMessageId ?? null,
      }),
    });
  };

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  if (botToken) {
    bot = new Telegraf(botToken);

    const formatAssignments = (
      label: string,
      items: Array<{ assignment: TaskAssignment; task: { title: string } }>,
    ) => {
      if (!items.length) return `${label}: 0`;
      const lines = items
        .slice(0, 10)
        .map((item, index) => `${index + 1}. ${item.task.title}`);
      const more = items.length > 10 ? `\n...yana ${items.length - 10} ta` : "";
      return `${label}: ${items.length}\n${lines.join("\n")}${more}`;
    };

    bot.start(async (ctx) => {
      await ctx.reply(
        "Assalomu alaykum! TaskBotFergana ga xush kelibsiz.",
        Markup.inlineKeyboard([
          Markup.button.webApp(
            "🚀 Web App ochish",
            webAppUrl || "https://example.com",
          ),
        ]),
      );

      if (webAppUrl) {
        bot.telegram
          .setChatMenuButton({
            menu_button: {
              type: "web_app",
              text: "Web App",
              web_app: { url: webAppUrl },
            },
          })
          .catch(console.error);
      }
    });

    bot.command("register", async (ctx) => {
      await ctx.reply(
        "Ro'yxatdan o'tish uchun telefon raqamingizni yuboring:",
        Markup.keyboard([Markup.button.contactRequest("📞 Kontaktni yuborish")])
          .oneTime()
          .resize(),
      );

      if (webAppUrl) {
        await ctx.reply(
          "Web ilovani ochish:",
          Markup.inlineKeyboard([
            Markup.button.webApp("🚀 Web App ochish", webAppUrl),
          ]),
        );
      }
    });

    bot.on("contact", async (ctx) => {
      const contact = ctx.message?.contact;
      if (!contact) return;
      if (!ctx.from || contact.user_id !== ctx.from.id) {
        await ctx.reply("Iltimos, o'zingizning kontaktingizni yuboring.");
        return;
      }
      const telegramId = String(ctx.from.id);
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        await ctx.reply("Avval /start orqali botga kiring.");
        return;
      }
      await storage.updateUser(user.id, { phone: contact.phone_number });
      await ctx.reply("Kontaktingiz saqlandi. Rahmat!");
    });

    bot.command("newtask", async (ctx) => {
      if (!ctx.from || !(await isTelegramAdmin(String(ctx.from.id)))) {
        return ctx.reply("Bu buyruq faqat adminlar uchun.");
      }
      await ensureTelegramAdmin(ctx);
      adminAwaitingTask.add(ctx.from.id);
      await ctx.reply("Yangi buyruq matnini yuboring:");
    });

    bot.command("assign", async (ctx) => {
      if (!ctx.from) return;
      if (!(await isTelegramAdmin(String(ctx.from.id)))) {
        return ctx.reply("Bu buyruq faqat adminlar uchun.");
      }
      const adminUser = await ensureTelegramAdmin(ctx);
      if (!adminUser) return;
      const parts = ctx.message?.text?.split(" ") || [];
      const userId = parseInt(parts[1] || "", 10);
      if (!userId) {
        return ctx.reply("Foydalanuvchi ID kiriting: /assign <user_id>");
      }
      const draft = adminTaskDrafts.get(ctx.from.id);
      if (!draft) {
        return ctx.reply("Avval /newtask orqali buyruq yarating.");
      }
      const assignment = await storage.assignTask({
        taskId: draft.taskId,
        userId,
        status: "ACTIVE",
      });
      await storage.createTaskEvent({
        taskId: draft.taskId,
        assignmentId: assignment.id,
        userId,
        status: "ACTIVE",
      });
      adminTaskDrafts.delete(ctx.from.id);
      await ctx.reply(`Buyruq yuborildi. Assignment #${assignment.id}`);
      await createAuditLog({
        actorId: adminUser.id,
        action: "task_assigned",
        targetType: "task_assignment",
        targetId: assignment.id,
        metadata: { via: "bot" },
      });

      const user = await storage.getUser(userId);
      await enqueueTaskNotification(assignment, user ?? undefined, adminUser.id);
    });

    bot.command("tasks", async (ctx) => {
      if (!ctx.from) return;
      const telegramUser = await storage.getUserByTelegramId(String(ctx.from.id));
      if (!telegramUser) {
        await ctx.reply("Avval /start orqali botga kiring.");
        return;
      }
      const assignments = await storage.getAssignmentsByUserId(telegramUser.id);
      const grouped = assignments.reduce<Record<string, typeof assignments>>(
        (acc, item) => {
          const key = item.assignment.status;
          acc[key] = acc[key] || [];
          acc[key].push(item);
          return acc;
        },
        {},
      );
      const lines = [
        formatAssignments(getStatusLabel("ACTIVE"), grouped.ACTIVE || []),
        formatAssignments(getStatusLabel("WILL_DO"), grouped.WILL_DO || []),
        formatAssignments(getStatusLabel("PENDING"), grouped.PENDING || []),
        formatAssignments(getStatusLabel("DONE"), grouped.DONE || []),
        formatAssignments(getStatusLabel("CANNOT_DO"), grouped.CANNOT_DO || []),
      ];
      await ctx.reply(lines.join("\n\n"));
    });

    bot.command("active", async (ctx) => {
      if (!ctx.from) return;
      const telegramUser = await storage.getUserByTelegramId(String(ctx.from.id));
      if (!telegramUser) {
        await ctx.reply("Avval /start orqali botga kiring.");
        return;
      }
      const assignments = await storage.getAssignmentsByUserId(
        telegramUser.id,
        "ACTIVE",
      );
      await ctx.reply(formatAssignments(getStatusLabel("ACTIVE"), assignments));
    });

    bot.command("pending", async (ctx) => {
      if (!ctx.from) return;
      const telegramUser = await storage.getUserByTelegramId(String(ctx.from.id));
      if (!telegramUser) {
        await ctx.reply("Avval /start orqali botga kiring.");
        return;
      }
      const assignments = await storage.getAssignmentsByUserId(
        telegramUser.id,
        "PENDING",
      );
      await ctx.reply(formatAssignments(getStatusLabel("PENDING"), assignments));
    });

    bot.command("done", async (ctx) => {
      if (!ctx.from) return;
      const telegramUser = await storage.getUserByTelegramId(String(ctx.from.id));
      if (!telegramUser) {
        await ctx.reply("Avval /start orqali botga kiring.");
        return;
      }
      const assignments = await storage.getAssignmentsByUserId(
        telegramUser.id,
        "DONE",
      );
      await ctx.reply(formatAssignments(getStatusLabel("DONE"), assignments));
    });

    bot.command("help", async (ctx) => {
      await ctx.reply(
        "/tasks - Mening buyruqlarim\n/active - Faol buyruqlar\n/pending - Kutilmoqda\n/done - Bajarilgan\n/help - Yordam",
      );
    });

    bot.on("text", async (ctx) => {
      if (!ctx.from) return;
      const statusRequest = awaitingStatusNote.get(ctx.from.id);
      if (statusRequest) {
        awaitingStatusNote.delete(ctx.from.id);
        const note = ctx.message?.text?.trim();
        const telegramUser = await storage.getUserByTelegramId(String(ctx.from.id));
        if (!telegramUser) {
          await ctx.reply("Foydalanuvchi topilmadi.");
          return;
        }
        const assignment = await storage.getAssignment(statusRequest.assignmentId);
        if (!assignment) {
          await ctx.reply("Buyruq topilmadi.");
          return;
        }
        if (!telegramUser.isAdmin && assignment.userId !== telegramUser.id) {
          await ctx.reply("Ruxsat yo'q.");
          return;
        }
        const updated = await storage.updateAssignmentStatus(
          statusRequest.assignmentId,
          statusRequest.status,
          note && note !== "/skip" ? note : undefined,
          telegramUser.id,
        );
        if (updated) {
          await createAuditLog({
            actorId: telegramUser.id,
            action: "task_status_updated",
            targetType: "task_assignment",
            targetId: updated.id,
            metadata: { status: updated.status, via: "bot" },
          });
          await storage.createTaskEvent({
            taskId: updated.taskId,
            assignmentId: updated.id,
            userId: updated.userId,
            status: updated.status,
          });
          const task = await storage.getTask(updated.taskId);
          const adminUser = task
            ? await storage.getUser(task.createdByAdminId)
            : null;
          if (adminUser?.telegramId && bot) {
            const when = new Date().toLocaleString("uz-UZ");
            bot.telegram
              .sendMessage(
                adminUser.telegramId,
                `🟢 Status yangilandi\nBuyruq: ${task?.title}\nFoydalanuvchi: ${telegramUser.firstName || telegramUser.username || telegramUser.id}\nStatus: ${getStatusLabel(updated.status)}\nVaqt: ${when}`,
              )
              .catch(console.error);
          }
          await ctx.reply(`Status: ${getStatusLabel(updated.status)} ✅`);
        } else {
          await ctx.reply("Status oldin yangilangan.");
        }
        return;
      }
      if (!(await isTelegramAdmin(String(ctx.from.id)))) return;
      const pendingReason = adminAwaitingRejectionReason.get(ctx.from.id);
      if (pendingReason) {
        const reason = ctx.message?.text?.trim();
        if (!reason) {
          await ctx.reply("Rad etish sababini yuboring.");
          return;
        }
        adminAwaitingRejectionReason.delete(ctx.from.id);
        const updatedUser = await storage.updateUser(pendingReason.userId, {
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: pendingReason.adminTelegramId,
          rejectionReason: reason,
        });
        if (bot && updatedUser.telegramId) {
          bot.telegram
            .sendMessage(
              updatedUser.telegramId,
              `❌ Arizangiz rad etildi. Sabab: ${reason}`,
            )
            .catch(console.error);
        }
        await ctx.reply("Rad etish sababi saqlandi.");
        return;
      }
      if (!adminAwaitingTask.has(ctx.from.id)) return;

      adminAwaitingTask.delete(ctx.from.id);
      const adminUser = await ensureTelegramAdmin(ctx);
      if (!adminUser) return;

      const title = ctx.message?.text?.trim();
      if (!title) {
        return ctx.reply("Buyruq matnini yuboring.");
      }

      const task = await storage.createTask({
        title,
        description: null,
        createdByAdminId: adminUser.id,
      });
      adminTaskDrafts.set(ctx.from.id, { taskId: task.id, title });
      await createAuditLog({
        actorId: adminUser.id,
        action: "task_created",
        targetType: "task",
        targetId: task.id,
        metadata: { via: "bot" },
      });

      const usersList = await storage.getAllUsers();
      const buttons = usersList
        .slice(0, 8)
        .map((user) =>
          Markup.button.callback(
            `${user.firstName || user.username || "User"} (#${user.id})`,
            `assign_user:${task.id}:${user.id}`,
          ),
        );
      const rows = buttons.map((btn) => [btn]);

      await ctx.reply(
        "Buyruq yaratildi. Kimga yuboramiz?",
        Markup.inlineKeyboard(rows),
      );
      await ctx.reply("Yoki /assign <user_id> buyrug'idan foydalaning.");
    });

    bot.on("callback_query", async (ctx) => {
      const data = ctx.callbackQuery?.data;
      if (!data) return;

      if (
        data.startsWith("approve:") ||
        data.startsWith("reject:") ||
        data.startsWith("reject_reason:")
      ) {
        if (!ctx.from || !(await isTelegramAdmin(String(ctx.from.id)))) {
          await ctx.answerCbQuery("Bu amal faqat adminlar uchun.");
          return;
        }
      }

      if (data.startsWith("approve:")) {
        const [, userIdRaw] = data.split(":");
        const userId = parseInt(userIdRaw, 10);
        if (!Number.isFinite(userId)) {
          await ctx.answerCbQuery("Noto'g'ri foydalanuvchi");
          return;
        }
        const adminTelegramId = String(ctx.from?.id);
        const user = await storage.updateUser(userId, {
          status: "approved",
          approvedAt: new Date(),
          approvedBy: adminTelegramId,
          rejectionReason: null,
          rejectedAt: null,
          rejectedBy: null,
        });
        if (bot && user.telegramId) {
          bot.telegram
            .sendMessage(
              user.telegramId,
              "✅ Arizangiz tasdiqlandi. Endi platformadan foydalanishingiz mumkin.",
            )
            .catch(console.error);
        }
        await ctx.editMessageText("Tasdiqlandi");
        await ctx.answerCbQuery();
        return;
      }

      if (data.startsWith("reject:")) {
        const [, userIdRaw] = data.split(":");
        const userId = parseInt(userIdRaw, 10);
        if (!Number.isFinite(userId)) {
          await ctx.answerCbQuery("Noto'g'ri foydalanuvchi");
          return;
        }
        const adminTelegramId = String(ctx.from?.id);
        const user = await storage.updateUser(userId, {
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: adminTelegramId,
        });
        if (bot && user.telegramId) {
          bot.telegram
            .sendMessage(user.telegramId, "❌ Arizangiz rad etildi.")
            .catch(console.error);
        }
        await ctx.editMessageText("Rad etildi");
        await ctx.answerCbQuery();
        return;
      }

      if (data.startsWith("reject_reason:")) {
        const [, userIdRaw] = data.split(":");
        const userId = parseInt(userIdRaw, 10);
        if (!Number.isFinite(userId)) {
          await ctx.answerCbQuery("Noto'g'ri foydalanuvchi");
          return;
        }
        if (!ctx.from) return;
        adminAwaitingRejectionReason.set(ctx.from.id, {
          userId,
          adminTelegramId: String(ctx.from.id),
        });
        await ctx.answerCbQuery();
        await ctx.reply("Rad etish sababini yuboring.");
        return;
      }

      if (data.startsWith("assign_user:")) {
        const [, taskId, userId] = data.split(":");
        const assignment = await storage.assignTask({
          taskId: parseInt(taskId, 10),
          userId: parseInt(userId, 10),
          status: "ACTIVE",
        });
        const adminUser = await ensureTelegramAdmin(ctx);
        await storage.createTaskEvent({
          taskId: parseInt(taskId, 10),
          assignmentId: assignment.id,
          userId: parseInt(userId, 10),
          status: "ACTIVE",
        });
        await ctx.answerCbQuery("Buyruq yuborildi");
        await ctx.editMessageText("Buyruq yuborildi.");
        await createAuditLog({
          actorId: null,
          action: "task_assigned",
          targetType: "task_assignment",
          targetId: assignment.id,
          metadata: { via: "bot_inline" },
        });

        const user = await storage.getUser(parseInt(userId, 10));
        await enqueueTaskNotification(
          assignment,
          user ?? undefined,
          adminUser?.id,
        );
        return;
      }

      const parsed = parseTaskStatusCallback(data);
      if (parsed) {
        const { assignmentId, status } = parsed;

        const actorUser = ctx.from
          ? await storage.getUserByTelegramId(String(ctx.from.id))
          : null;
        const assignment = await storage.getAssignment(assignmentId);
        if (!assignment) {
          await ctx.answerCbQuery("Buyruq topilmadi");
          return;
        }
        if (!actorUser?.isAdmin && assignment.userId !== actorUser?.id) {
          await ctx.answerCbQuery("Ruxsat yo'q");
          return;
        }

        const updated = await storage.updateAssignmentStatusIfChanged(
          assignmentId,
          status,
          undefined,
          actorUser?.id ?? null,
        );
        if (status === "CANNOT_DO") {
          if (ctx.from) {
            awaitingStatusNote.set(ctx.from.id, { assignmentId, status });
          }
          if (updated) {
            await createAuditLog({
              actorId: actorUser?.id ?? updated.userId,
              action: "task_status_updated",
              targetType: "task_assignment",
              targetId: updated.id,
              metadata: { status, via: "bot" },
            });
            await storage.createTaskEvent({
              taskId: updated.taskId,
              assignmentId: updated.id,
              userId: updated.userId,
              status,
            });
          }
          await ctx.answerCbQuery("Sabab yozing yoki /skip yuboring");
          await ctx.reply("Qila olmadim sababi (ixtiyoriy). /skip yuborsangiz bo'ladi.");
          const message = ctx.callbackQuery?.message as any;
          const label = getStatusLabel(status);
          if (message?.text) {
            ctx.editMessageText(`${message.text}\n\nStatus: ${label}`).catch(() => null);
          } else if (message?.caption) {
            ctx.editMessageCaption(`${message.caption}\n\nStatus: ${label}`).catch(() => null);
          }
          return;
        }
        if (!updated) {
          await ctx.answerCbQuery("Status oldin yangilangan");
          return;
        }
        await ctx.answerCbQuery("Status yangilandi");
        await createAuditLog({
          actorId: actorUser?.id ?? updated.userId,
          action: "task_status_updated",
          targetType: "task_assignment",
          targetId: updated.id,
          metadata: { status, via: "bot" },
        });

        await storage.createTaskEvent({
          taskId: updated.taskId,
          assignmentId: updated.id,
          userId: updated.userId,
          status,
        });

        const user = await storage.getUser(updated.userId);
        const task = await storage.getTask(updated.taskId);
        if (!user || !task) return;

        const adminUser = await storage.getUser(task.createdByAdminId);
        const adminTelegramId = adminUser?.telegramId;
        if (adminTelegramId && bot) {
          const when = new Date().toLocaleString("uz-UZ");
          bot.telegram
            .sendMessage(
              adminTelegramId,
              `🟢 Status yangilandi\nBuyruq: ${task.title}\nFoydalanuvchi: ${user.firstName || user.username || user.id}\nStatus: ${getStatusLabel(status)}\nVaqt: ${when}`,
            )
            .catch(console.error);
        }

        const message = ctx.callbackQuery?.message as any;
        const label = getStatusLabel(status);
        if (message?.text) {
          ctx.editMessageText(`${message.text}\n\nStatus: ${label}`).catch(() => null);
        } else if (message?.caption) {
          ctx.editMessageCaption(`${message.caption}\n\nStatus: ${label}`).catch(() => null);
        }
        ctx.reply(`Status: ${label} ✅`).catch(() => null);
      }
    });

    app.use(webhookPath, bot.webhookCallback(webhookPath));

    await startTelegramRuntime({
      bot,
      webhookUrl,
      webhookPath,
      isProduction,
    });

    bot.telegram
      .setMyCommands([
        { command: "tasks", description: "Mening buyruqlarim" },
        { command: "active", description: "Faol buyruqlar" },
        { command: "pending", description: "Kutilmoqda buyruqlar" },
        { command: "done", description: "Bajarilgan buyruqlar" },
        { command: "help", description: "Yordam" },
      ])
      .catch(console.error);

    stopQueueWorker = startQueueWorker({ bot, webAppUrl });
  }

  const shutdownBase = createGracefulShutdown({ bot, httpServer });
  const shutdown = (signal: string) => {
    if (stopQueueWorker) {
      stopQueueWorker();
    }
    shutdownBase(signal);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  app.post(api.auth.telegram.path, async (req, res) => {
    try {
      const sessionResult = await getSessionUser(req);
      if (sessionResult.user) {
        return res.status(200).json({ user: sessionResult.user });
      }

      const { initData } = api.auth.telegram.input.parse(req.body);
      const token = process.env.BOT_TOKEN;
      if (!token) {
        console.error("Telegram auth error: BOT_TOKEN not configured");
        return res.status(500).json({
          message: "BOT_TOKEN not configured",
          code: "SERVER_MISCONFIG",
        });
      }
      const verification = verifyTelegramInitData(initData, token);
      if (!verification.valid || !verification.urlParams) {
        console.warn("Telegram auth failed: invalid initData");
        return res.status(401).json({
          message: "Invalid authentication data",
          code: "INVALID_INIT_DATA",
        });
      }

      const userStr = verification.urlParams.get("user");
      if (!userStr) {
        console.warn("Telegram auth failed: no user payload");
        return res.status(400).json({
          message: "No user data",
          code: "MISSING_USER",
        });
      }
      const telegramUser = JSON.parse(userStr);
      const user = await getOrCreateTelegramUser(telegramUser);
      await storage.updateUserLastSeen(user.id, new Date());

      const initDataHash = hashInitData(initData);
      const isDuplicateInitData = isRecentInitData(initDataHash);

      if (!isDuplicateInitData) {
        await createSession(res, user.id);
        await createAuditLog({
          actorId: user.id,
          action: "login_telegram",
          targetType: "user",
          targetId: user.id,
        });
      }

      res.json({ user });
    } catch (err) {
      console.error("Telegram auth error:", err);
      res.status(400).json({
        message: "Authentication failed",
        code: "TELEGRAM_AUTH_FAILED",
      });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { login, password } = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByLogin(login);
      if (!user || !user.passwordHash) {
        return res
          .status(401)
          .json({ message: "Login yoki parol xato", code: "INVALID_LOGIN" });
      }
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res
          .status(401)
          .json({ message: "Login yoki parol xato", code: "INVALID_LOGIN" });
      }

      await createSession(res, user.id);
      await storage.updateUserLastSeen(user.id, new Date());
      await createAuditLog({
        actorId: user.id,
        action: "login_password",
        targetType: "user",
        targetId: user.id,
      });
      res.json({ user });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: err.errors[0].message, code: "VALIDATION_ERROR" });
      }
      console.error("Login error:", err);
      res.status(500).json({ message: "Login failed", code: "LOGIN_FAILED" });
    }
  });

  app.post(api.auth.logout.path, authenticate, async (req, res) => {
    const tokenHash = (req as any).sessionTokenHash as string | undefined;
    if (tokenHash) {
      await storage.deleteSessionByTokenHash(tokenHash);
    }
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.json({ message: "Logged out" });
  });

  app.get(api.auth.me.path, authenticate, requireApprovedUser, async (req, res) => {
    res.json((req as any).user);
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const sessionResult = await getSessionUser(req);
      const existingLogin = await storage.getUserByLogin(input.login);

      if (existingLogin && existingLogin.id !== sessionResult.user?.id) {
        return res.status(400).json({ message: "Login band", code: "LOGIN_TAKEN" });
      }

      const passwordHash = await hashPassword(input.password);

      if (sessionResult.user) {
        const status = sessionResult.user.isAdmin ? "approved" : "pending";
        const updates = {
          login: input.login,
          username: input.username,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          region: input.region,
          district: input.district,
          mahalla: input.mahalla,
          address: input.address,
          birthDate: input.birthDate,
          direction: input.direction,
          passwordHash,
          status,
          rejectionReason: null,
        };

        const normalized = (value: string | null | undefined) => value ?? null;
        const profileChanged = Object.entries(updates).some(([key, value]) => {
          if (key === "passwordHash") return false;
          return normalized((sessionResult.user as any)[key]) !== normalized(value as any);
        });

        const passwordChanged = sessionResult.user.passwordHash
          ? !(await verifyPassword(input.password, sessionResult.user.passwordHash))
          : true;

        const updatedUser = await storage.updateUser(sessionResult.user.id, {
          ...updates,
        });

        if (profileChanged || passwordChanged) {
          await createAuditLog({
            actorId: sessionResult.user.id,
            action: "profile_submitted",
            targetType: "user",
            targetId: sessionResult.user.id,
          });
        }

        return res.json(updatedUser);
      }

      const newUser = await storage.createUser({
        telegramId: `web:${input.login}`,
        login: input.login,
        username: input.username ?? null,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        phone: input.phone ?? null,
        region: input.region ?? null,
        district: input.district ?? null,
        mahalla: input.mahalla ?? null,
        address: input.address ?? null,
        birthDate: input.birthDate ?? null,
        direction: input.direction ?? null,
        passwordHash,
        status: "pending",
        isAdmin: false,
      });

      await createSession(res, newUser.id);
      await createAuditLog({
        actorId: newUser.id,
        action: "profile_registered",
        targetType: "user",
        targetId: newUser.id,
      });

      return res.status(201).json(newUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, code: "VALIDATION_ERROR" });
      }
      console.error("Registration error:", err);
      res.status(500).json({ message: "Registration failed", code: "REGISTER_FAILED" });
    }
  });

  app.get(
    api.tasks.list.path,
    authenticate,
    requireApprovedUser,
    async (req, res) => {
      const user = (req as any).user as User;
      const filters = api.tasks.list.input?.parse(req.query);
      const assignments = await storage.getAssignmentsByUserId(
        user.id,
        filters?.status,
      );
      res.json(assignments);
    },
  );

  app.patch(
    api.tasks.updateStatus.path,
    authenticate,
    requireApprovedUser,
    async (req, res) => {
      const user = (req as any).user as User;
      try {
        const { id } = req.params;
        const { status, note } = api.tasks.updateStatus.input.parse(req.body);
        const assignment = await storage.getAssignment(parseInt(id, 10));
        if (!assignment) {
          return res.status(404).json({ message: "Assignment not found" });
        }
        if (!user.isAdmin && assignment.userId !== user.id) {
          return res.status(403).json({ message: "Forbidden" });
        }

        const updated = await storage.updateAssignmentStatusIfChanged(
          assignment.id,
          status,
          note,
          user.id,
        );
        const finalAssignment = updated ?? assignment;

        if (updated) {
          await createAuditLog({
            actorId: user.id,
            action: "task_status_updated",
            targetType: "task_assignment",
            targetId: updated.id,
            metadata: { status, via: "web" },
          });

          await storage.createTaskEvent({
            taskId: updated.taskId,
            assignmentId: updated.id,
            userId: updated.userId,
            status,
          });
        }

        if (bot) {
          const task = await storage.getTask(finalAssignment.taskId);
          const adminUser = task
            ? await storage.getUser(task.createdByAdminId)
            : null;
          if (adminUser?.telegramId) {
            const when = new Date().toLocaleString("uz-UZ");
            bot.telegram
              .sendMessage(
                adminUser.telegramId,
                `🟢 Status yangilandi\nBuyruq: ${task?.title}\nFoydalanuvchi: ${user.firstName || user.username || user.id}\nStatus: ${getStatusLabel(status)}\nVaqt: ${when}`,
              )
              .catch(console.error);
          }
        }

        res.json(finalAssignment);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
        }
        console.error("Update status error:", err);
        res.status(500).json({ message: "Failed to update status" });
      }
    },
  );

  app.post(
    api.tasks.complete.path,
    authenticate,
    requireApprovedUser,
    async (req, res) => {
      const user = (req as any).user as User;
      const assignmentId = parseInt(req.params.id, 10);
      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment || assignment.userId !== user.id) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      const updated = await storage.updateAssignmentStatusIfChanged(
        assignment.id,
        "DONE",
        undefined,
        user.id,
      );
      const finalAssignment = updated ?? assignment;
      if (updated) {
        await createAuditLog({
          actorId: user.id,
          action: "task_completed",
          targetType: "task_assignment",
          targetId: updated.id,
        });
        await storage.createTaskEvent({
          taskId: updated.taskId,
          assignmentId: updated.id,
          userId: updated.userId,
          status: "done",
        });
      }
      res.json(finalAssignment);
    },
  );

  app.get(
    api.admin.users.list.path,
    authenticate,
    requireAdmin,
    async (req, res) => {
      const filters = api.admin.users.list.input?.parse(req.query);
      const limit = filters?.limit ?? 50;
      const offset = filters?.offset ?? 0;
      const inactiveAfterDays = Number(process.env.INACTIVE_AFTER_DAYS || "7");
      const inactiveAfterMs = inactiveAfterDays * 24 * 60 * 60 * 1000;
      const now = Date.now();

      const usersList = await storage.getUsersByFilters({
        status: filters?.status,
        region: filters?.region,
        direction: filters?.direction,
        search: filters?.search,
        limit,
        offset,
      });

      const enriched = usersList.map((user) => ({
        ...user,
        activityStatus:
          user.lastSeen && now - new Date(user.lastSeen).getTime() <= inactiveAfterMs
            ? "active"
            : "inactive",
      }));

      res.json(enriched);
    },
  );

  app.post(
    api.admin.users.updateStatus.path,
    authenticate,
    requireAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const input = api.admin.users.updateStatus.input.parse(req.body);
        const user = await storage.updateUserStatus(
          parseInt(id, 10),
          input.status,
          input.rejectionReason,
        );
        if (bot && user.telegramId) {
          const message =
            input.status === "approved"
              ? "✅ Arizangiz tasdiqlandi. Endi platformadan foydalanishingiz mumkin."
              : input.status === "rejected"
                ? `❌ Arizangiz rad etildi. Sabab: ${input.rejectionReason || "ko'rsatilmagan"}`
                : "🟡 Arizangiz ko'rib chiqilmoqda.";
          bot.telegram
            .sendMessage(user.telegramId, message)
            .catch(console.error);
        }
        await createAuditLog({
          actorId: (req as any).user.id,
          action: "user_status_updated",
          targetType: "user",
          targetId: user.id,
          metadata: { status: input.status },
        });
        res.json(user);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
        }
        console.error("Update user status error:", err);
        res.status(500).json({ message: "Failed to update user status" });
      }
    },
  );

  app.post(
    api.admin.tasks.create.path,
    authenticate,
    requireAdmin,
    async (req, res) => {
      try {
        const input = api.admin.tasks.create.input.parse(req.body);
        const user = (req as any).user as User;
        const task = await storage.createTask({
          ...input,
          createdByAdminId: user.id,
        });
        await createAuditLog({
          actorId: user.id,
          action: "task_created",
          targetType: "task",
          targetId: task.id,
        });
        res.status(201).json(task);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
        }
        console.error("Create task error:", err);
        res.status(500).json({ message: "Failed to create task" });
      }
    },
  );
  app.post(
    api.admin.tasks.assign.path,
    authenticate,
    requireAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { userId, region, direction, forwardMessageId } =
          api.admin.tasks.assign.input.parse(req.body);
        const broadcastMode = (process.env.BROADCAST_MODE || "copy").toLowerCase();
        if (broadcastMode === "forward" && !forwardMessageId) {
          return res.status(400).json({
            message: "forwardMessageId required for forward mode",
          });
        }

        const task = await storage.getTask(parseInt(id, 10));
        if (!task) return res.status(404).json({ message: "Task not found" });

        let targetUsers: User[] = [];

        if (userId) {
          const u = await storage.getUser(userId);
          if (u) targetUsers = [u];
        } else {
          targetUsers = await storage.getUsersByFilters({
            status: "approved",
            region,
            direction,
          });
        }

        if (targetUsers.length === 0) {
          return res.status(404).json({ message: "No matching users" });
        }

        const assignments: TaskAssignment[] = [];
        for (const target of targetUsers) {
          const assignment = await storage.assignTask({
            taskId: task.id,
            userId: target.id,
            status: "ACTIVE",
          });
          await storage.createTaskEvent({
            taskId: task.id,
            assignmentId: assignment.id,
            userId: target.id,
            status: "ACTIVE",
          });
          assignments.push(assignment);
        }

        await createAuditLog({
          actorId: (req as any).user.id,
          action: "task_assigned",
          targetType: "task_assignment",
          targetId: assignments[0]?.id ?? null,
          metadata: {
            userId,
            region,
            direction,
            count: assignments.length,
            via: "web",
          },
        });
        for (const assignment of assignments) {
          const assignee = await storage.getUser(assignment.userId);
          await enqueueTaskNotification(
            assignment,
            assignee ?? undefined,
            (req as any).user.id,
            forwardMessageId,
          );
        }

        return res.status(201).json({
          assigned: assignments.length,
          assignments,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
        }
        console.error("Assign task error:", err);
        return res.status(500).json({ message: "Failed to assign task" });
      }
    },
  );

  app.get(
    api.admin.tasks.list.path,
    authenticate,
    requireAdmin,
    async (req, res) => {
      const filters = api.admin.tasks.list.input.parse(req.query);
      const status = filters.status;
      const search = filters.search;
      const limit = filters.limit ?? 20;
      const offset = filters.offset ?? 0;
      const tasksWithAssignments = await storage.listTasksWithAssignments({
        status,
        search,
        limit,
        offset,
      });

      const flatAssignments: TaskAssignment[] = [];
      tasksWithAssignments.forEach((entry) => {
        entry.assignments.forEach((item) =>
          flatAssignments.push(item.assignment),
        );
      });

      const stats = flatAssignments.reduce(
        (acc, assignment) => {
          acc.total += 1;
          switch (assignment.status) {
            case "DONE":
              acc.done += 1;
              break;
            case "WILL_DO":
              acc.willDo += 1;
              break;
            case "CANNOT_DO":
              acc.cannotDo += 1;
              break;
            case "PENDING":
              acc.pending += 1;
              break;
            default:
              acc.active += 1;
              break;
          }
          return acc;
        },
        {
          total: 0,
          done: 0,
          willDo: 0,
          cannotDo: 0,
          pending: 0,
          active: 0,
        },
      );

      const completionRate = stats.total
        ? Math.round((stats.done / stats.total) * 100)
        : 0;

      res.json({
        tasks: tasksWithAssignments,
        stats: { ...stats, completionRate },
      });
    },
  );

  app.get(
    api.admin.auditLogs.list.path,
    authenticate,
    requireAdmin,
    async (_req, res) => {
      const logs = await storage.listAuditLogs();
      res.json(logs);
    },
  );

  app.post(
    api.admin.broadcasts.preview.path,
    authenticate,
    requireAdmin,
    async (req, res) => {
      try {
        const input = api.admin.broadcasts.preview.input.parse(req.body);
        const user = (req as any).user as User;
        const messageText = input.messageText.trim();
        if (!messageText) {
          return res
            .status(400)
            .json({ message: "Message text required", code: "VALIDATION_ERROR" });
        }
        const mode = (process.env.BROADCAST_MODE || "copy").toLowerCase();
        const sourceChatId = process.env.BROADCAST_SOURCE_CHAT_ID;
        if (mode === "forward" && !input.sourceMessageId) {
          return res.status(400).json({
            message: "sourceMessageId required for forward mode",
            code: "MISSING_SOURCE_MESSAGE_ID",
          });
        }
        const recipients = await storage.listBroadcastRecipients();
        const correlationId = crypto.randomUUID();
        const broadcast = await storage.createBroadcast({
          createdByAdminId: user.id,
          messageText,
          mediaUrl: input.mediaUrl ?? null,
          mode,
          sourceChatId: sourceChatId ?? null,
          sourceMessageId: input.sourceMessageId ?? null,
          status: "draft",
          totalCount: recipients.length,
          correlationId,
        });

        await createAuditLog({
          actorId: user.id,
          action: "broadcast_preview",
          targetType: "broadcast",
          targetId: broadcast.id,
          metadata: {
            total: recipients.length,
            messageText: input.messageText,
            mediaUrl: input.mediaUrl ?? null,
          },
        });

        res.json({
          id: broadcast.id,
          totalCount: broadcast.totalCount ?? recipients.length,
          status: broadcast.status,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: err.errors[0].message, code: "VALIDATION_ERROR" });
        }
        console.error("Broadcast preview error:", err);
        res.status(500).json({ message: "Failed to preview broadcast" });
      }
    },
  );

  app.post(
    api.admin.broadcasts.confirm.path,
    authenticate,
    requireAdmin,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        const user = (req as any).user as User;
        const broadcast = await storage.getBroadcast(id);
        if (!broadcast) {
          return res.status(404).json({ message: "Broadcast not found" });
        }
        if (
          (broadcast.mode || "copy") === "forward" &&
          (!broadcast.sourceChatId || !broadcast.sourceMessageId)
        ) {
          return res.status(400).json({
            message: "Broadcast requires source message for forward mode",
            code: "MISSING_SOURCE_MESSAGE_ID",
          });
        }
        if (broadcast.status !== "draft") {
          return res.json({
            id: broadcast.id,
            status: broadcast.status,
            totalCount: broadcast.totalCount ?? 0,
          });
        }

        const recipients = await storage.listBroadcastRecipients();
        const logs = recipients.map((recipient) => ({
          broadcastId: broadcast.id,
          userId: recipient.id,
          telegramId: recipient.telegramId ?? null,
          status: "pending",
          attempts: 0,
        }));

        const batchSize = 500;
        for (let i = 0; i < logs.length; i += batchSize) {
          await storage.createBroadcastLogs(logs.slice(i, i + batchSize));
        }

        const updated = await storage.updateBroadcast(broadcast.id, {
          status: "queued",
          totalCount: logs.length,
          sentCount: 0,
          failedCount: 0,
          correlationId: broadcast.correlationId || crypto.randomUUID(),
        });

        await createAuditLog({
          actorId: user.id,
          action: "broadcast_confirm",
          targetType: "broadcast",
          targetId: broadcast.id,
          metadata: {
            total: logs.length,
            messageText: broadcast.messageText,
            mediaUrl: broadcast.mediaUrl,
          },
        });

        res.json({
          id: updated.id,
          status: updated.status,
          totalCount: updated.totalCount ?? logs.length,
        });
      } catch (err) {
        console.error("Broadcast confirm error:", err);
        res.status(500).json({ message: "Failed to confirm broadcast" });
      }
    },
  );

  app.get(
    api.admin.broadcasts.list.path,
    authenticate,
    requireAdmin,
    async (req, res) => {
      const filters = api.admin.broadcasts.list.input.parse(req.query);
      const limit = filters.limit ?? 20;
      const offset = filters.offset ?? 0;
      const items = await storage.listBroadcasts({
        status: filters.status,
        limit,
        offset,
      });

      const payload = items.map((item) => {
        const total = item.totalCount ?? 0;
        const sent = item.sentCount ?? 0;
        const failed = item.failedCount ?? 0;
        const progress = total ? (sent + failed) / total : 0;
        return {
          ...item,
          progress,
        };
      });

      res.json(payload);
    },
  );

  app.get(
    api.admin.broadcasts.progress.path,
    authenticate,
    requireAdmin,
    async (req, res) => {
      const id = parseInt(req.params.id, 10);
      const broadcast = await storage.getBroadcast(id);
      if (!broadcast) {
        return res.status(404).json({ message: "Broadcast not found" });
      }
      res.json({
        id: broadcast.id,
        sentCount: broadcast.sentCount ?? 0,
        failedCount: broadcast.failedCount ?? 0,
        totalCount: broadcast.totalCount ?? 0,
        status: broadcast.status,
      });
    },
  );

  app.get(
    api.admin.metrics.broadcasts.path,
    authenticate,
    requireAdmin,
    async (_req, res) => {
      const [latest] = await storage.listBroadcasts({ limit: 1, offset: 0 });
      const durationSeconds =
        latest?.startedAt && latest?.finishedAt
          ? (new Date(latest.finishedAt).getTime() -
              new Date(latest.startedAt).getTime()) /
            1000
          : null;
      const throughput =
        durationSeconds && durationSeconds > 0 && latest
          ? (latest.sentCount ?? 0) / durationSeconds
          : null;
      const totalBroadcasts = await storage.countBroadcasts();
      const failReasons = await storage.getBroadcastFailReasons();

      res.json({
        totalBroadcasts,
        lastDurationSeconds: durationSeconds,
        lastThroughput: throughput,
        failReasons,
      });
    },
  );

  return httpServer;
}

async function seedAdmin() {
  const login = process.env.ADMIN_SEED_LOGIN;
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!login || !password) return;

  const existing = await storage.getUserByLogin(login);
  if (existing) return;

  const passwordHash = await hashPassword(password);
  await storage.createUser({
    telegramId: `web:${login}`,
    login,
    passwordHash,
    isAdmin: true,
    username: login,
    firstName: "Admin",
    status: "approved",
  });
  console.log("Admin user seeded");
}

seedAdmin().catch(console.error);
