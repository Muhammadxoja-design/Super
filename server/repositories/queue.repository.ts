import { messageQueue, type MessageQueue, type InsertMessageQueue } from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, sql, lte, or, isNull } from "drizzle-orm";

export class QueueRepository {
  async enqueue(entry: InsertMessageQueue): Promise<MessageQueue> {
    const [row] = await db.insert(messageQueue).values(entry).returning();
    return row;
  }

  async findPending(limit: number = 20, now: Date = new Date()): Promise<MessageQueue[]> {
    return db
      .select()
      .from(messageQueue)
      .where(
        and(
          eq(messageQueue.status, "pending"),
          or(
            isNull(messageQueue.nextAttemptAt),
            lte(messageQueue.nextAttemptAt, now)
          )
        )
      )
      .limit(limit)
      .orderBy(messageQueue.createdAt);
  }

  async update(id: number, updates: Partial<InsertMessageQueue>): Promise<MessageQueue> {
    const [row] = await db
      .update(messageQueue)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(messageQueue.id, id))
      .returning();
    return row;
  }

  async countRecent(filters: { userId: number; since: Date }): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messageQueue)
      .where(
        and(
          eq(messageQueue.userId, filters.userId),
          gte(messageQueue.createdAt, filters.since)
        )
      );
    return Number(row?.count ?? 0);
  }
}

import { gte } from "drizzle-orm";

export const queueRepository = new QueueRepository();
