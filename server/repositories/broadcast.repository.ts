import { broadcasts, broadcastLogs, type Broadcast, type InsertBroadcast, type BroadcastLog, type InsertBroadcastLog, users } from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, sql, asc } from "drizzle-orm";

export class BroadcastRepository {
  async findById(id: number): Promise<Broadcast | undefined> {
    const [broadcast] = await db
      .select()
      .from(broadcasts)
      .where(eq(broadcasts.id, id));
    return broadcast;
  }

  async create(broadcast: InsertBroadcast): Promise<Broadcast> {
    const [row] = await db.insert(broadcasts).values(broadcast).returning();
    return row;
  }

  async update(id: number, updates: Partial<InsertBroadcast>): Promise<Broadcast> {
    const [broadcast] = await db
      .update(broadcasts)
      .set({ ...updates })
      .where(eq(broadcasts.id, id))
      .returning();
    return broadcast;
  }

  async findAll(params: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Broadcast[]> {
    const conditions = [
      params.status ? eq(broadcasts.status, params.status) : undefined,
    ].filter(Boolean);

    let query: any = db.select().from(broadcasts);
    if (conditions.length) {
      query = query.where(and(...conditions));
    }
    query = query.orderBy(desc(broadcasts.createdAt));
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.offset(params.offset);
    }
    return await query;
  }

  async createLogs(entries: InsertBroadcastLog[]): Promise<void> {
    if (entries.length === 0) return;
    await db.insert(broadcastLogs).values(entries);
  }

  async findAllPendingLogs(params: {
    broadcastId: number;
    limit: number;
    now: Date;
  }): Promise<BroadcastLog[]> {
    return db
      .select()
      .from(broadcastLogs)
      .where(
        and(
          eq(broadcastLogs.broadcastId, params.broadcastId),
          eq(broadcastLogs.status, "pending"),
          or(
            isNull(broadcastLogs.nextAttemptAt),
            lte(broadcastLogs.nextAttemptAt, params.now),
          ),
        ),
      )
      .limit(params.limit)
      .orderBy(asc(broadcastLogs.id));
  }

  async updateLog(id: number, updates: Partial<InsertBroadcastLog>): Promise<BroadcastLog> {
    const [log] = await db
      .update(broadcastLogs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(broadcastLogs.id, id))
      .returning();
    return log;
  }

  async countLogsByStatus(broadcastId: number): Promise<{ sent: number; failed: number }> {
    const rows = await db
      .select({
        status: broadcastLogs.status,
        count: sql<number>`count(*)`,
      })
      .from(broadcastLogs)
      .where(eq(broadcastLogs.broadcastId, broadcastId))
      .groupBy(broadcastLogs.status);

    const result = { sent: 0, failed: 0 };
    rows.forEach((row) => {
      if (row.status === "sent") result.sent = Number(row.count);
      if (row.status === "failed") result.failed = Number(row.count);
    });
    return result;
  }

  async countPendingLogs(broadcastId: number): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(broadcastLogs)
      .where(
        and(
          eq(broadcastLogs.broadcastId, broadcastId),
          eq(broadcastLogs.status, "pending"),
        ),
      );
    return Number(row?.count ?? 0);
  }

  async getFailReasons(limit: number = 50): Promise<Record<string, number>> {
    const rows = await db
      .select({
        message: broadcastLogs.lastErrorMessage,
        count: sql<number>`count(*)`,
      })
      .from(broadcastLogs)
      .where(and(eq(broadcastLogs.status, "failed"), isNotNull(broadcastLogs.lastErrorMessage)))
      .groupBy(broadcastLogs.lastErrorMessage)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    const result: Record<string, number> = {};
    rows.forEach((row) => {
      if (row.message) result[row.message] = Number(row.count);
    });
    return result;
  }
}

// Add or import missing helper from drizzle-orm
import { isNull, lte, or, isNotNull } from "drizzle-orm";

export const broadcastRepository = new BroadcastRepository();
