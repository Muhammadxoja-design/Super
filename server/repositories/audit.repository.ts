import { auditLogs, type AuditLog, type InsertAuditLog, botActionLogs, type BotActionLog, type InsertBotActionLog } from "@shared/schema";
import { db } from "../db";
import { eq, desc, and, sql, lte } from "drizzle-orm";

export class AuditRepository {
  async createAuditLog(entry: InsertAuditLog): Promise<AuditLog> {
    const [row] = await db.insert(auditLogs).values(entry).returning();
    return row;
  }

  async findAllAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  // Bot Action Logs (replacing SQLite action_logs)
  async createBotActionLog(entry: InsertBotActionLog): Promise<BotActionLog> {
    const [row] = await db.insert(botActionLogs).values(entry).returning();
    return row;
  }

  async updateBotActionLog(id: string, updates: Partial<InsertBotActionLog>): Promise<BotActionLog> {
    const [row] = await db
      .update(botActionLogs)
      .set(updates)
      .where(eq(botActionLogs.id, id))
      .returning();
    return row;
  }

  async findPendingBotActions(limit: number = 5, now: Date = new Date()): Promise<BotActionLog[]> {
    return db
      .select()
      .from(botActionLogs)
      .where(
        and(
          eq(botActionLogs.status, "pending"),
          lte(botActionLogs.executeAt, now)
        )
      )
      .orderBy(botActionLogs.executeAt)
      .limit(limit);
  }
}

export const auditRepository = new AuditRepository();
