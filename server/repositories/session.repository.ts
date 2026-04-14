import { sessions, type Session, type InsertSession } from "@shared/schema";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";

export class SessionRepository {
  async create(session: InsertSession): Promise<Session> {
    const [row] = await db.insert(sessions).values(session).returning();
    return row;
  }

  async findByTokenHash(tokenHash: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash));
    return session;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  async deleteByUserId(userId: number): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
}

export const sessionRepository = new SessionRepository();
