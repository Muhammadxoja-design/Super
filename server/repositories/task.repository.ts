import { tasks, type Task, type InsertTask } from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, sql, or, ilike } from "drizzle-orm";

export class TaskRepository {
  async findById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async create(insertTask: InsertTask): Promise<Task> {
    const normalizedTask = {
      ...insertTask,
      description: insertTask.description ?? "",
    };

    if (normalizedTask.idempotencyKey) {
      const [task] = await db
        .insert(tasks)
        .values(normalizedTask)
        .onConflictDoNothing({ target: tasks.idempotencyKey })
        .returning();
      if (task) return task;
      const [existing] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.idempotencyKey, normalizedTask.idempotencyKey));
      if (existing) return existing;
    }

    const [task] = await db.insert(tasks).values(normalizedTask).returning();
    return task;
  }

  async update(id: number, updates: Partial<InsertTask>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ ...updates })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async findAllWithFilters(params: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    const conditions = [
      params.status ? eq(tasks.status, params.status) : undefined,
      params.search ? ilike(tasks.title, `%${params.search}%`) : undefined,
    ].filter(Boolean);

    let query: any = db.select().from(tasks);
    if (conditions.length) {
      query = query.where(and(...conditions));
    }
    query = query.orderBy(desc(tasks.createdAt));
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.offset(params.offset);
    }
    return await query;
  }
}

export const taskRepository = new TaskRepository();
