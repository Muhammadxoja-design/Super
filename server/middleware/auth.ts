import { type Request, Response, NextFunction } from "express";
import { userRepository } from "../repositories/user.repository";
import { sessionRepository } from "../repositories/session.repository";
import { type User } from "@shared/schema";
import {
  SESSION_COOKIE_NAME,
  SUBSCRIPTION_BYPASS_SUPERADMIN,
} from "../utils/constants";
import {
  parseCookies,
  hashSessionToken,
  isSessionExpired,
  isAdminUser,
  isProfileComplete,
  isSuperAdminUser,
  resolveUserRole,
  isProActiveUser,
} from "../utils/helpers";
import {
  REQUIRED_CHANNEL_IDS,
  getRequiredChannels,
  checkUserSubscribed,
} from "../subscription";

export const ROLE_LEVELS: Record<string, number> = {
  user: 0,
  limited_admin: 1,
  super_admin: 2,
};

export async function getSessionUser(req: Request) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return { user: null as User | null };

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET not configured");
  }

  const tokenHash = hashSessionToken(token, secret);
  const session = await sessionRepository.findByTokenHash(tokenHash);
  if (!session || isSessionExpired(session.expiresAt)) {
    if (session) {
      await sessionRepository.deleteByTokenHash(tokenHash);
    }
    return { user: null as User | null };
  }

  const user = await userRepository.findById(session.userId);
  return { user: user ?? null, tokenHash };
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { user, tokenHash } = await getSessionUser(req);
  if (!tokenHash) {
    console.warn("Auth failed: no session cookie");
    return res
      .status(401)
      .json({ message: "No session token", code: "NO_TOKEN" });
  }

  if (!user) {
    console.warn("Auth failed: session expired or user missing");
    return res
      .status(401)
      .json({ message: "Unauthorized", code: "EXPIRED" });
  }

  const LAST_SEEN_UPDATE_MS = 1000 * 60 * 10;
  if (
    !user.lastSeen ||
    Date.now() - new Date(user.lastSeen).getTime() > LAST_SEEN_UPDATE_MS
  ) {
    await userRepository.update(user.id, { lastSeen: new Date() });
  }

  (req as any).user = user;
  (req as any).sessionTokenHash = tokenHash;
  next();
};

export const requireApprovedUser = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = (req as any).user as User | undefined;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized", code: "NO_USER" });
  }
  if (isAdminUser(user)) return next();
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

export const requireSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = (req as any).user as User | undefined;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (!REQUIRED_CHANNEL_IDS.length) return next();
  if (isSuperAdminUser(user) && SUBSCRIPTION_BYPASS_SUPERADMIN) return next();
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
  next();
};

export const requireRoleAtLeast =
  (role: "limited_admin" | "super_admin") =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User | undefined;
    const resolved = resolveUserRole(user);
    if (ROLE_LEVELS[resolved] < ROLE_LEVELS[role]) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

export const requireRole =
  (role: "super_admin") =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User | undefined;
    if (resolveUserRole(user) !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

export const requireAdmin = requireRoleAtLeast("limited_admin");
export const requireSuperAdmin = requireRole("super_admin");

export const requirePro = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as User | undefined;
  const proRequired = process.env.PRO_REQUIRED === "true";
  if (!proRequired) return next();
  if (!user) return res.status(403).json({ message: "Forbidden" });
  if (!isProActiveUser(user) && !isSuperAdminUser(user)) {
    return res.status(402).json({ message: "PRO required" });
  }
  next();
};
