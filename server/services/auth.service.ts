import { userRepository } from "../repositories/user.repository";
import { sessionRepository } from "../repositories/session.repository";
import { auditRepository } from "../repositories/audit.repository";
import { hashPassword, verifyPassword } from "../password";
import { hashSessionToken } from "../utils/helpers";
import { SESSION_TTL_MS } from "../utils/constants";
import crypto from "crypto";
import { type InsertUser, type User } from "@shared/schema";

export class AuthService {
  async register(input: InsertUser): Promise<{ user: User; sessionToken: string }> {
    const passwordHash = await hashPassword(input.passwordHash!); // Note: input.passwordHash expected
    const newUser = await userRepository.create({
      ...input,
      passwordHash,
    });

    const sessionToken = await this.createSession(newUser.id);
    
    await auditRepository.createAuditLog({
      actorId: newUser.id,
      action: "profile_registered",
      targetType: "user",
      targetId: newUser.id,
    });

    return { user: newUser, sessionToken };
  }

  async login(login: string, passwordPlain: string): Promise<{ user: User; sessionToken: string } | null> {
    const user = await userRepository.findByLogin(login);
    if (!user || !user.passwordHash) return null;

    const isValid = await verifyPassword(passwordPlain, user.passwordHash);
    if (!isValid) return null;

    const sessionToken = await this.createSession(user.id);

    await userRepository.update(user.id, { lastSeen: new Date(), lastActive: new Date() });
    await auditRepository.createAuditLog({
      actorId: user.id,
      action: "login_password",
      targetType: "user",
      targetId: user.id,
    });

    return { user, sessionToken };
  }

  async createSession(userId: number): Promise<string> {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error("SESSION_SECRET not configured");

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashSessionToken(rawToken, secret);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await sessionRepository.create({
      userId,
      tokenHash,
      expiresAt,
    });

    return rawToken;
  }

  async logout(tokenHash: string): Promise<void> {
    await sessionRepository.deleteByTokenHash(tokenHash);
  }
}

export const authService = new AuthService();
