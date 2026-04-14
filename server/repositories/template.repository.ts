import { messageTemplates, type MessageTemplate, type InsertMessageTemplate } from "@shared/schema";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";

export class TemplateRepository {
  async findById(id: number): Promise<MessageTemplate | undefined> {
    const [template] = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, id));
    return template;
  }

  async findAll(): Promise<MessageTemplate[]> {
    return db.select().from(messageTemplates).orderBy(desc(messageTemplates.createdAt));
  }

  async create(entry: InsertMessageTemplate): Promise<MessageTemplate> {
    const [row] = await db.insert(messageTemplates).values(entry).returning();
    return row;
  }

  async update(id: number, updates: Partial<InsertMessageTemplate>): Promise<MessageTemplate> {
    const [row] = await db
      .update(messageTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(messageTemplates.id, id))
      .returning();
    return row;
  }

  async delete(id: number): Promise<void> {
    await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
  }
}

export const templateRepository = new TemplateRepository();
