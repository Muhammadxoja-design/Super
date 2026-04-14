import { billingTransactions, type BillingTransaction, type InsertBillingTransaction } from "@shared/schema";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";

export class BillingRepository {
  async create(entry: InsertBillingTransaction): Promise<BillingTransaction> {
    const [row] = await db.insert(billingTransactions).values(entry).returning();
    return row;
  }

  async findAll(userId?: number): Promise<BillingTransaction[]> {
    let query = db.select().from(billingTransactions);
    if (userId) {
      query = query.where(eq(billingTransactions.userId, userId)) as any;
    }
    return query.orderBy(desc(billingTransactions.createdAt));
  }
}

export const billingRepository = new BillingRepository();
