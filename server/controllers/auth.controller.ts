import { Request, Response } from "express";
import { api } from "@shared/routes";
import { z } from "zod";
import { authService } from "../services/auth.service";
import { userRepository } from "../repositories/user.repository";
import { auditRepository } from "../repositories/audit.repository";
import { 
  verifyTelegramInitData, 
  normalizeBotToken, 
  hashInitData, 
  isRecentInitData, 
  createAuditLog,
  isSuperAdminTelegramId,
  isSuperAdminUser,
} from "../utils/helpers";
import { getSessionUser } from "../middleware/auth";
import {
  hashPassword,
  verifyPassword,
} from "../password";
import {
  validateNameField,
  normalizeUzPhone,
  normalizeName,
  validateLocationField,
  resolveUserStatus,
  isAdminUser,
  buildSessionCookie,
  clearSessionCookie,
 } from "../utils/helpers";
import { getOrCreateTelegramUser } from "../utils/bot-helpers";
import {
  REQUIRED_CHANNEL_IDS,
  getRequiredChannels,
  checkUserSubscribed,
} from "../subscription";
import { 
  SUBSCRIPTION_BYPASS_SUPERADMIN,
} from "../utils/constants";

async function runNonBlockingAuthSideEffects(userId: number, action: string) {
  const tasks = await Promise.allSettled([
    userRepository.update(userId, { lastSeen: new Date() }),
    auditRepository.createAuditLog({
      actorId: userId,
      action,
      targetType: "user",
      targetId: userId,
    }),
  ]);

  tasks.forEach((task) => {
    if (task.status === "rejected") {
      console.warn("[auth] non-blocking side effect failed", task.reason);
    }
  });
}

export const telegramAuth = async (req: Request, res: Response) => {
    try {
      const sessionResult = await getSessionUser(req);
      if (sessionResult.user?.telegramId) {
        if (
          REQUIRED_CHANNEL_IDS.length &&
          !(
            SUBSCRIPTION_BYPASS_SUPERADMIN &&
            isSuperAdminUser(sessionResult.user)
          )
        ) {
          if (String(sessionResult.user.telegramId).startsWith("web:")) {
            const missingChannels = await getRequiredChannels();
            return res.status(403).json({
              message: "Subscription required",
              code: "SUBSCRIPTION_REQUIRED",
              missingChannels,
            });
          }
          const subscription = await checkUserSubscribed(
            String(sessionResult.user.telegramId),
          );
          if (!subscription.ok) {
            return res.status(403).json({
              message: "Subscription required",
              code: "SUBSCRIPTION_REQUIRED",
              missingChannels: subscription.missing,
            });
          }
        }
        return res.status(200).json({ user: sessionResult.user });
      }

      const { initData } = api.auth.telegram.input.parse(req.body);
      const token = normalizeBotToken(process.env.BOT_TOKEN);
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
      const telegramId = String(telegramUser.id);
      if (
        REQUIRED_CHANNEL_IDS.length &&
        !(SUBSCRIPTION_BYPASS_SUPERADMIN && isSuperAdminTelegramId(telegramId))
      ) {
        const subscription = await checkUserSubscribed(telegramId);
        if (!subscription.ok) {
          return res.status(403).json({
            message: "Subscription required",
            code: "SUBSCRIPTION_REQUIRED",
            missingChannels: subscription.missing,
          });
        }
      }
      const user = await getOrCreateTelegramUser(telegramUser);
      await userRepository.update(user.id, { lastSeen: new Date() });

      const initDataHash = hashInitData(initData);
      const isDuplicateInitData = isRecentInitData(initDataHash);

      if (!isDuplicateInitData) {
        const sessionToken = await authService.createSession(user.id);
        res.setHeader("Set-Cookie", buildSessionCookie(sessionToken));
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
};

export const login = async (req: Request, res: Response) => {
    try {
      const { login, password } = api.auth.login.input.parse(req.body);
      const result = await authService.login(login, password);
      
      if (!result) {
        return res
          .status(401)
          .json({ message: "Login yoki parol xato", code: "INVALID_LOGIN" });
      }

      const { user, sessionToken } = result;

      if (
        REQUIRED_CHANNEL_IDS.length &&
        !(SUBSCRIPTION_BYPASS_SUPERADMIN && isSuperAdminUser(user))
      ) {
        if (!user.telegramId || String(user.telegramId).startsWith("web:")) {
          const missingChannels = await getRequiredChannels();
          return res.status(403).json({
            message: "Subscription required",
            code: "SUBSCRIPTION_REQUIRED",
            missingChannels,
          });
        }
        const subscription = await checkUserSubscribed(String(user.telegramId));
        if (!subscription.ok) {
          return res.status(403).json({
            message: "Subscription required",
            code: "SUBSCRIPTION_REQUIRED",
            missingChannels: subscription.missing,
          });
        }
      }

      res.setHeader("Set-Cookie", buildSessionCookie(sessionToken));
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
};

export const logout = async (req: Request, res: Response) => {
    const tokenHash = (req as any).sessionTokenHash as string | undefined;
    if (tokenHash) {
      await authService.logout(tokenHash);
    }
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.json({ message: "Logged out" });
};

export const getMe = async (req: Request, res: Response) => {
    res.json((req as any).user);
};

export const register = async (req: Request, res: Response) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const sessionResult = await getSessionUser(req);
      if (REQUIRED_CHANNEL_IDS.length) {
        if (
          sessionResult.user &&
          SUBSCRIPTION_BYPASS_SUPERADMIN &&
          isSuperAdminUser(sessionResult.user)
        ) {
          // bypass
        } else if (
          !sessionResult.user?.telegramId ||
          String(sessionResult.user.telegramId).startsWith("web:")
        ) {
          const missingChannels = await getRequiredChannels();
          return res.status(403).json({
            message: "Subscription required",
            code: "SUBSCRIPTION_REQUIRED",
            missingChannels,
          });
        } else {
          const subscription = await checkUserSubscribed(
            String(sessionResult.user.telegramId),
          );
          if (!subscription.ok) {
            return res.status(403).json({
              message: "Subscription required",
              code: "SUBSCRIPTION_REQUIRED",
              missingChannels: subscription.missing,
            });
          }
        }
      }

      const normalizedFirstName = validateNameField(
        input.firstName ?? "",
        "firstName",
        true,
      );
      const normalizedLastName = validateNameField(
        input.lastName ?? "",
        "lastName",
        false,
      );
      const normalizedPhone = normalizeUzPhone(input.phone ?? "");
      if (!normalizedPhone) {
        throw new z.ZodError([{ code: z.ZodIssueCode.custom, message: "Telefon raqam noto'g'ri", path: ["phone"] }]);
      }

      const regionValue = normalizeName(input.region ?? "");
      const districtValue = normalizeName(input.district ?? "");
      const mahallaValue = normalizeName(input.mahalla ?? "");
      if (!regionValue || !districtValue || !mahallaValue) {
        throw new z.ZodError([{ code: z.ZodIssueCode.custom, message: "Manzil to'liq bo'lishi kerak", path: ["region"] }]);
      }
      validateLocationField(regionValue, districtValue, mahallaValue);
      
      const existingLogin = await userRepository.findByLogin(input.login);

      if (existingLogin && existingLogin.id !== sessionResult.user?.id) {
        return res
          .status(400)
          .json({ message: "Login band", code: "LOGIN_TAKEN" });
      }

      const passwordHash = await hashPassword(input.password);

      if (sessionResult.user) {
        const status = resolveUserStatus({
          isAdmin: isAdminUser(sessionResult.user),
          currentStatus: sessionResult.user.status ?? null,
        });
        const updates = {
          login: input.login.trim(),
          username: input.username ?? null,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          phone: normalizedPhone,
          region: regionValue,
          district: districtValue,
          viloyat: regionValue,
          tuman: districtValue,
          shahar: input.shahar ?? null,
          mahalla: mahallaValue,
          address: input.address,
          birthDate: input.birthDate,
          direction: input.direction,
          passwordHash,
          status,
          rejectionReason: null,
        };

        const normalizedValue = (value: string | null | undefined) => value ?? null;
        const profileChanged = Object.entries(updates).some(([key, value]) => {
          if (key === "passwordHash") return false;
          return (
            normalizedValue((sessionResult.user as any)[key]) !==
            normalizedValue(value as any)
          );
        });

        const passwordChanged = sessionResult.user.passwordHash
          ? !(await verifyPassword(
              input.password,
              sessionResult.user.passwordHash,
            ))
          : true;

        const updatedUser = await userRepository.update(sessionResult.user.id, {
          ...updates,
        });

        if (profileChanged || passwordChanged) {
          await auditRepository.createAuditLog({
            actorId: sessionResult.user.id,
            action: "profile_submitted",
            targetType: "user",
            targetId: sessionResult.user.id,
          });
        }

        return res.json(updatedUser);
      }

      const { user: newUser, sessionToken } = await authService.register({
        telegramId: `web:${input.login}`,
        login: input.login.trim(),
        username: input.username ?? null,
        firstName: normalizedFirstName ?? null,
        lastName: normalizedLastName ?? null,
        phone: normalizedPhone ?? null,
        region: regionValue ?? null,
        district: districtValue ?? null,
        viloyat: regionValue ?? null,
        tuman: districtValue ?? null,
        shahar: input.shahar ?? null,
        mahalla: mahallaValue ?? null,
        address: input.address ?? null,
        birthDate: input.birthDate ?? null,
        direction: input.direction ?? null,
        passwordHash: input.password, // AuthService will hash it
        status: resolveUserStatus({ isAdmin: false, currentStatus: null }),
        isAdmin: false,
        role: "user",
        plan: "FREE",
      });

      const { enqueueAdminNotification } = await import("../utils/bot-helpers");
      await enqueueAdminNotification(
        `🆕 Yangi user (Web)\nID: ${newUser.id}\nIsm: ${newUser.firstName || newUser.username || "Noma'lum"}\nStatus: ${newUser.status}`,
      );

      res.setHeader("Set-Cookie", buildSessionCookie(sessionToken));
      return res.status(201).json(newUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: err.errors[0].message, code: "VALIDATION_ERROR" });
      }
      console.error("Registration error:", err);
      res
        .status(500)
        .json({ message: "Registration failed", code: "REGISTER_FAILED" });
    }
};
