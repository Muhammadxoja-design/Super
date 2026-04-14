import { taskAssignments, type TaskAssignment, type InsertTaskAssignment, tasks, users } from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";

export class AssignmentRepository {
  async findById(id: number): Promise<TaskAssignment | undefined> {
    const [assignment] = await db
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.id, id));
    return assignment;
  }

  async findByUserId(userId: number, status?: "ACTIVE" | "DONE" | "CANNOT_DO" | "PENDING" | "WILL_DO"): Promise<Array<{ assignment: TaskAssignment; task: any }>> {
    const conditions = [
      eq(taskAssignments.userId, userId),
      status ? eq(taskAssignments.status, status) : undefined,
    ].filter(Boolean);

    const rows = await db
      .select({
        assignment: taskAssignments,
        task: tasks,
      })
      .from(taskAssignments)
      .innerJoin(tasks, eq(taskAssignments.taskId, tasks.id))
      .where(and(...conditions))
      .orderBy(desc(taskAssignments.createdAt));
    
    return rows;
  }

  async create(assignment: InsertTaskAssignment): Promise<TaskAssignment> {
    const [row] = await db.insert(taskAssignments).values(assignment).returning();
    return row;
  }

  async updateStatus(
    id: number,
    status: "ACTIVE" | "DONE" | "CANNOT_DO" | "PENDING" | "WILL_DO",
    note?: string,
    updatedByUserId?: number | null,
  ): Promise<TaskAssignment> {
    const [assignment] = await db
      .update(taskAssignments)
      .set({
        status,
        statusNote: note,
        statusUpdatedByUserId: updatedByUserId,
        statusUpdatedAt: new Date(),
      })
      .where(eq(taskAssignments.id, id))
      .returning();
    return assignment;
  }

  async updateProof(
    id: number,
    proof: {
      proofText?: string | null;
      proofFileId?: string | null;
      proofType?: string | null;
      proofSubmittedAt?: Date | null;
    },
  ): Promise<TaskAssignment> {
    const [assignment] = await db
      .update(taskAssignments)
      .set({ ...proof })
      .where(eq(taskAssignments.id, id))
      .returning();
    return assignment;
  }

  async updateDeliveryAt(id: number, deliveredAt: Date): Promise<TaskAssignment> {
    const [assignment] = await db
      .update(taskAssignments)
      .set({ deliveredAt })
      .where(eq(taskAssignments.id, id))
      .returning();
    return assignment;
  }

  async findTasksWithAssignments(params: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<{ task: any; assignments: Array<{ assignment: TaskAssignment; user: any }> }>> {
    const conditions = [
      params.status ? eq(tasks.status, params.status) : undefined,
      params.search ? sql`${tasks.title} ILIKE ${`%${params.search}%`}` : undefined,
    ].filter(Boolean);

    const taskRows = await db
      .select()
      .from(tasks)
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(params.limit ?? 20)
      .offset(params.offset ?? 0)
      .orderBy(desc(tasks.createdAt));

    const result = [];
    for (const task of taskRows) {
      const assignments = await db
        .select({
          assignment: taskAssignments,
          user: users,
        })
        .from(taskAssignments)
        .innerJoin(users, eq(taskAssignments.userId, users.id))
        .where(eq(taskAssignments.taskId, task.id));
      result.push({ task, assignments });
    }
    return result;
  }
}

export const assignmentRepository = new AssignmentRepository();
