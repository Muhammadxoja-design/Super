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

const SESSION_COOKIE_NAME = "taskbot_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function isSessionExpired(expiresAt?: Date | null) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() < Date.now();
}

function hashSessionToken(token: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

function buildSessionCookie(token: string) {
  const base = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
    SESSION_TTL_MS / 1000
  )}`;
  if (process.env.NODE_ENV === "production") {
    return `${base}; Secure`;
  }
  return base;
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
      user.direction
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
  const base = `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  if (process.env.NODE_ENV === "production") {
    return `${base}; Secure`;
  }
  return base;
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
  return (process.env.ADMIN_TG_IDS || process.env.ADMIN_TELEGRAM_IDS || "")
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
    user = await storage.updateUser(user.id, { isAdmin: true, status: "approved" });
  }
  return user;
}

async function isTelegramAdmin(telegramId: string) {
  const adminIds = getAdminIds();
  if (adminIds.includes(telegramId)) return true;
  const user = await storage.getUserByTelegramId(telegramId);
  return Boolean(user?.isAdmin);
}

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    console.warn("Auth failed: no session cookie");
    return res.status(401).json({ message: "No session token", code: "NO_TOKEN" });
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error("Auth failed: SESSION_SECRET not configured");
    return res
      .status(500)
      .json({ message: "SESSION_SECRET not configured", code: "SERVER_MISCONFIG" });
  }

  const tokenHash = hashSessionToken(token, secret);
  const session = await storage.getSessionByTokenHash(tokenHash);
  if (!session || isSessionExpired(session.expiresAt)) {
    if (session) {
      await storage.deleteSessionByTokenHash(tokenHash);
    }
    console.warn("Auth failed: session expired or missing");
    return res.status(401).json({ message: "Session expired", code: "EXPIRED" });
  }

  const user = await storage.getUser(session.userId);
  if (!user) {
    console.warn("Auth failed: user not found");
    return res.status(401).json({ message: "User not found", code: "USER_NOT_FOUND" });
  }

  (req as any).user = user;
  (req as any).sessionTokenHash = tokenHash;
  next();
};

const requireApprovedUser = (req: Request, res: Response, next: NextFunction) => {
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

function buildTaskStatusKeyboard(assignmentId: number, webAppUrl?: string) {
  const buttons = [
    [
      Markup.button.callback("✅ Qabul qildim", `task_status:${assignmentId}:accepted`),
      Markup.button.callback("🟡 Jarayonda", `task_status:${assignmentId}:in_progress`),
    ],
    [
      Markup.button.callback("❌ Rad etdim", `task_status:${assignmentId}:rejected`),
      Markup.button.callback("✅ Bajarildi", `task_status:${assignmentId}:done`),
    ],
  ];

  if (webAppUrl) {
    buttons.push([
      Markup.button.webApp("🌐 Batafsil", webAppUrl),
    ]);
  }

  return Markup.inlineKeyboard(buttons);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const botToken = process.env.BOT_TOKEN;
  let bot: Telegraf | null = null;
  const webAppUrl = process.env.WEBAPP_URL;
  const adminTaskDrafts = new Map<
    number,
    { taskId: number; title: string; description?: string }
  >();
  const adminAwaitingTask = new Set<number>();

  if (botToken) {
    bot = new Telegraf(botToken);

    bot.start(async (ctx) => {
      await ctx.reply(
        "Assalomu alaykum! TaskBotFergana ga xush kelibsiz.",
        Markup.inlineKeyboard([
          Markup.button.webApp(
            "🚀 Web App ochish",
            webAppUrl || "https://example.com"
          ),
        ])
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
        Markup.keyboard([
          Markup.button.contactRequest("📞 Kontaktni yuborish"),
        ])
          .oneTime()
          .resize()
      );

      if (webAppUrl) {
        await ctx.reply(
          "Web ilovani ochish:",
          Markup.inlineKeyboard([
            Markup.button.webApp("🚀 Web App ochish", webAppUrl),
          ])
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
        status: "pending",
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
      if (user?.telegramId && bot) {
        bot.telegram
          .sendMessage(
            user.telegramId,
            "📩 Senga buyruq keldi!",
            buildTaskStatusKeyboard(assignment.id, webAppUrl)
          )
          .catch(console.error);
      }
    });

    bot.on("text", async (ctx) => {
      if (!ctx.from) return;
      if (!(await isTelegramAdmin(String(ctx.from.id)))) return;
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
      const buttons = usersList.slice(0, 8).map((user) =>
        Markup.button.callback(
          `${user.firstName || user.username || "User"} (#${user.id})`,
          `assign_user:${task.id}:${user.id}`
        )
      );
      const rows = buttons.map((btn) => [btn]);

      await ctx.reply(
        "Buyruq yaratildi. Kimga yuboramiz?",
        Markup.inlineKeyboard(rows)
      );
      await ctx.reply(
        "Yoki /assign <user_id> buyrug'idan foydalaning."
      );
    });

    bot.on("callback_query", async (ctx) => {
      const data = ctx.callbackQuery?.data;
      if (!data) return;

      if (data.startsWith("assign_user:")) {
        const [, taskId, userId] = data.split(":");
        const assignment = await storage.assignTask({
          taskId: parseInt(taskId, 10),
          userId: parseInt(userId, 10),
          status: "pending",
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
        if (user?.telegramId && bot) {
          bot.telegram
            .sendMessage(
              user.telegramId,
              "📩 Senga buyruq keldi!",
              buildTaskStatusKeyboard(assignment.id, webAppUrl)
            )
            .catch(console.error);
        }
        return;
      }

      if (data.startsWith("task_status:")) {
        const [, assignmentIdRaw, status] = data.split(":");
        if (!TASK_STATUSES.includes(status as any)) {
          return ctx.answerCbQuery("Noto'g'ri status");
        }
        const assignmentId = parseInt(assignmentIdRaw, 10);
        const assignment = await storage.updateAssignmentStatus(
          assignmentId,
          status
        );
        await ctx.answerCbQuery("Status yangilandi");
        await createAuditLog({
          actorId: assignment.userId,
          action: "task_status_updated",
          targetType: "task_assignment",
          targetId: assignment.id,
          metadata: { status, via: "bot" },
        });

        const user = await storage.getUser(assignment.userId);
        const task = await storage.getTask(assignment.taskId);
        if (!user || !task) return;

        const adminUser = await storage.getUser(task.createdByAdminId);
        const adminTelegramId = adminUser?.telegramId;
        if (adminTelegramId && bot) {
          const when = new Date().toLocaleString("uz-UZ");
          bot.telegram
            .sendMessage(
              adminTelegramId,
              `🟢 Status yangilandi\nBuyruq: ${task.title}\nFoydalanuvchi: ${user.firstName || user.username || user.id}\nStatus: ${status}\nVaqt: ${when}`
            )
            .catch(console.error);
        }
      }
    });

    bot.launch().catch(console.error);

    process.once("SIGINT", () => bot?.stop("SIGINT"));
    process.once("SIGTERM", () => bot?.stop("SIGTERM"));
  }

  app.post(api.auth.telegram.path, async (req, res) => {
    try {
      const { initData } = api.auth.telegram.input.parse(req.body);
      const token = process.env.BOT_TOKEN;
      if (!token) {
        return res.status(500).json({ message: "BOT_TOKEN not configured" });
      }
      const verification = verifyTelegramInitData(initData, token);
      if (!verification.valid || !verification.urlParams) {
        return res.status(401).json({ message: "Invalid authentication data" });
      }

      const userStr = verification.urlParams.get("user");
      if (!userStr) {
        return res.status(400).json({ message: "No user data" });
      }
      const telegramUser = JSON.parse(userStr);
      const user = await getOrCreateTelegramUser(telegramUser);

      await createSession(res, user.id);
      await createAuditLog({
        actorId: user.id,
        action: "login_telegram",
        targetType: "user",
        targetId: user.id,
      });
      res.json({ user });
    } catch (err) {
      console.error("Telegram auth error:", err);
      res.status(400).json({ message: "Authentication failed" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { login, password } = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByLogin(login);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Login yoki parol xato" });
      }
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Login yoki parol xato" });
      }

      await createSession(res, user.id);
      await createAuditLog({
        actorId: user.id,
        action: "login_password",
        targetType: "user",
        targetId: user.id,
      });
      res.json({ user });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Login error:", err);
      res.status(500).json({ message: "Login failed" });
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

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { login, password } = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByLogin(login);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Login yoki parol xato" });
      }
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Login yoki parol xato" });
      }

      await createSession(res, user.id);
      res.json({ user });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Login error:", err);
      res.status(500).json({ message: "Login failed" });
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

  app.get(api.auth.me.path, authenticate, async (req, res) => {
    res.json((req as any).user);
  });

  app.post(api.auth.register.path, authenticate, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const user = (req as any).user as User;

      const existingLogin = await storage.getUserByLogin(input.login);
      if (existingLogin && existingLogin.id !== user.id) {
        return res.status(400).json({ message: "Login band" });
      }

      const passwordHash = await hashPassword(input.password);
      const status = user.isAdmin ? "approved" : "pending";
      const updatedUser = await storage.updateUser(user.id, {
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
      });

      await createAuditLog({
        actorId: user.id,
        action: "profile_submitted",
        targetType: "user",
        targetId: user.id,
      });

      res.json(updatedUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Registration error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.get(api.tasks.list.path, authenticate, requireApprovedUser, async (req, res) => {
    const user = (req as any).user as User;
    const assignments = await storage.getAssignmentsByUserId(user.id);
    res.json(assignments);
  });

  app.post(
    api.tasks.updateStatus.path,
    authenticate,
    requireApprovedUser,
    async (req, res) => {
    const user = (req as any).user as User;
    try {
      const { assignmentId } = req.params;
      const { status, note } = api.tasks.updateStatus.input.parse(req.body);
      const assignment = await storage.getAssignment(parseInt(assignmentId, 10));
      if (!assignment || assignment.userId !== user.id) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      const updated = await storage.updateAssignmentStatus(
        assignment.id,
        status,
        note
      );
      await createAuditLog({
        actorId: user.id,
        action: "task_status_updated",
        targetType: "task_assignment",
        targetId: updated.id,
        metadata: { status, via: "web" },
      });

      if (bot) {
        const task = await storage.getTask(assignment.taskId);
        const adminUser = task
          ? await storage.getUser(task.createdByAdminId)
          : null;
        if (adminUser?.telegramId) {
          const when = new Date().toLocaleString("uz-UZ");
          bot.telegram
            .sendMessage(
              adminUser.telegramId,
              `🟢 Status yangilandi\nBuyruq: ${task?.title}\nFoydalanuvchi: ${user.firstName || user.username || user.id}\nStatus: ${status}\nVaqt: ${when}`
            )
            .catch(console.error);
        }
      }

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Update status error:", err);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

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
      const updated = await storage.updateAssignmentStatus(
        assignment.id,
        "done"
      );
      await createAuditLog({
        actorId: user.id,
        action: "task_completed",
        targetType: "task_assignment",
        targetId: updated.id,
      });
      res.json(updated);
    }
  );

  app.get(api.admin.users.list.path, authenticate, requireAdmin, async (req, res) => {
    const filters = api.admin.users.list.input?.parse(req.query);
    const usersList = await storage.getUsersByFilters({
      status: filters?.status,
      region: filters?.region,
      direction: filters?.direction,
    });
    res.json(usersList);
  });

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
          input.rejectionReason
        );
        if (bot && user.telegramId) {
          const message =
            input.status === "approved"
              ? "✅ Arizangiz tasdiqlandi. Endi platformadan foydalanishingiz mumkin."
              : input.status === "rejected"
                ? `❌ Arizangiz rad etildi. Sabab: ${input.rejectionReason || "ko'rsatilmagan"}`
                : "🟡 Arizangiz ko'rib chiqilmoqda.";
          bot.telegram.sendMessage(user.telegramId, message).catch(console.error);
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
    }
  );

  app.post(api.admin.tasks.create.path, authenticate, requireAdmin, async (req, res) => {
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
  });

  app.post(api.admin.tasks.assign.path, authenticate, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, region, direction } = api.admin.tasks.assign.input.parse(req.body);
      const task = await storage.getTask(parseInt(id, 10));
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      let targetUsers: User[] = [];
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) targetUsers = [user];
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

      const assignments = [];
      for (const target of targetUsers) {
        const assignment = await storage.assignTask({
          taskId: task.id,
          userId: target.id,
          status: "pending",
        });
        assignments.push(assignment);
      }
      await createAuditLog({
        actorId: (req as any).user.id,
        action: "task_assigned",
        targetType: "task_assignment",
        targetId: assignments[0]?.id ?? null,
        metadata: { userId, region, direction, count: assignments.length },
      });
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Create task error:", err);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

      if (bot) {
        for (const assignment of assignments) {
          const assignee = await storage.getUser(assignment.userId);
          if (assignee?.telegramId) {
            bot.telegram
              .sendMessage(
                assignee.telegramId,
                "📩 Senga buyruq keldi!",
                buildTaskStatusKeyboard(assignment.id, webAppUrl)
              )
              .catch(console.error);
          }
        }
      }

      res.status(201).json({ assigned: assignments.length, assignments });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Assign task error:", err);
      res.status(500).json({ message: "Failed to assign task" });
    }
  });

  app.get(api.admin.tasks.list.path, authenticate, requireAdmin, async (req, res) => {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const tasksWithAssignments = await storage.listTasksWithAssignments({
      status,
      search,
    });

    const flatAssignments: TaskAssignment[] = [];
    tasksWithAssignments.forEach((entry) => {
      entry.assignments.forEach((item) => flatAssignments.push(item.assignment));
    });

    const stats = flatAssignments.reduce(
      (acc, assignment) => {
        acc.total += 1;
        switch (assignment.status) {
          case "done":
            acc.done += 1;
            break;
          case "in_progress":
            acc.inProgress += 1;
            break;
          case "accepted":
            acc.accepted += 1;
            break;
          case "rejected":
            acc.rejected += 1;
            break;
          default:
            acc.pending += 1;
            break;
        }
        return acc;
      },
      {
        total: 0,
        done: 0,
        inProgress: 0,
        accepted: 0,
        rejected: 0,
        pending: 0,
      }
    );

    const completionRate = stats.total
      ? Math.round((stats.done / stats.total) * 100)
      : 0;

    res.json({
      tasks: tasksWithAssignments,
      stats: { ...stats, completionRate },
    });
  });

  app.get(
    api.admin.auditLogs.list.path,
    authenticate,
    requireAdmin,
    async (_req, res) => {
      const logs = await storage.listAuditLogs();
      res.json(logs);
    }
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
