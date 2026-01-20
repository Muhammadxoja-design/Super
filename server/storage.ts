import { db } from "./db";
import {
  users,
  tasks,
  taskAssignments,
  sessions,
  auditLogs,
  type User,
  type InsertUser,
  type Task,
  type InsertTask,
  type TaskAssignment,
  type InsertTaskAssignment,
  type Session,
  type InsertSession,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { eq, and, like, inArray, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  getUserByLogin(login: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersByFilters(filters: {
    status?: string;
    region?: string;
    direction?: string;
  }): Promise<User[]>;
  updateUserStatus(
    id: number,
    status: string,
    rejectionReason?: string
  ): Promise<User>;

  createTask(task: InsertTask): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  listTasksWithAssignments(params: {
    status?: string;
    search?: string;
  }): Promise<
    Array<{
      task: Task;
      assignments: Array<{ assignment: TaskAssignment; user: User }>;
    }>
  >;

  assignTask(assignment: InsertTaskAssignment): Promise<TaskAssignment>;
  getAssignmentsByUserId(userId: number): Promise<
    Array<{ assignment: TaskAssignment; task: Task }>
  >;
  getAssignment(id: number): Promise<TaskAssignment | undefined>;
  updateAssignmentStatus(
    id: number,
    status: string,
    note?: string
  ): Promise<TaskAssignment>;

  createSession(session: InsertSession): Promise<Session>;
  getSessionByTokenHash(tokenHash: string): Promise<Session | undefined>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
  deleteUserSessions(userId: number): Promise<void>;

  createAuditLog(entry: InsertAuditLog): Promise<AuditLog>;
  listAuditLogs(limit?: number): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId));
    return user;
  }

  async getUserByLogin(login: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.login, login));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [row] = await db.insert(users).values(user).returning();
    return row;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByFilters(filters: {
    status?: string;
    region?: string;
    direction?: string;
  }): Promise<User[]> {
    const conditions = [
      filters.status ? eq(users.status, filters.status) : undefined,
      filters.region ? eq(users.region, filters.region) : undefined,
      filters.direction ? eq(users.direction, filters.direction) : undefined,
    ].filter(Boolean);

    return db
      .select()
      .from(users)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(users.createdAt));
  }

  async updateUserStatus(
    id: number,
    status: string,
    rejectionReason?: string
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ status, rejectionReason, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async listTasksWithAssignments(params: {
    status?: string;
    search?: string;
  }) {
    const taskRows = await db
      .select()
      .from(tasks)
      .where(
        params.search
          ? like(tasks.title, `%${params.search}%`)
          : undefined
      )
      .orderBy(desc(tasks.createdAt));

    if (taskRows.length === 0) {
      return [];
    }

    const taskIds = taskRows.map((task) => task.id);
    const assignmentRows = await db
      .select()
      .from(taskAssignments)
      .where(
        and(
          inArray(taskAssignments.taskId, taskIds),
          params.status ? eq(taskAssignments.status, params.status) : undefined
        )
      );

    const userIds = assignmentRows.map((assignment) => assignment.userId);
    const usersRows = userIds.length
      ? await db
          .select()
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

    const userById = new Map(usersRows.map((user) => [user.id, user]));
    const assignmentsByTask = new Map<number, Array<{ assignment: TaskAssignment; user: User }>>();

    assignmentRows.forEach((assignment) => {
      const user = userById.get(assignment.userId);
      if (!user) return;
      const list = assignmentsByTask.get(assignment.taskId) || [];
      list.push({ assignment, user });
      assignmentsByTask.set(assignment.taskId, list);
    });

    return taskRows.map((task) => ({
      task,
      assignments: assignmentsByTask.get(task.id) || [],
    }));
  }

  async assignTask(assignment: InsertTaskAssignment): Promise<TaskAssignment> {
    const [row] = await db
      .insert(taskAssignments)
      .values(assignment)
      .returning();
    return row;
  }

  async getAssignmentsByUserId(userId: number) {
    const assignmentRows = await db
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.userId, userId))
      .orderBy(desc(taskAssignments.createdAt));

    const taskIds = assignmentRows.map((assignment) => assignment.taskId);
    const taskRows = taskIds.length
      ? await db
          .select()
          .from(tasks)
          .where(inArray(tasks.id, taskIds))
      : [];

    const taskById = new Map(taskRows.map((task) => [task.id, task]));

    return assignmentRows
      .map((assignment) => {
        const task = taskById.get(assignment.taskId);
        if (!task) return null;
        return { assignment, task };
      })
      .filter(Boolean) as Array<{ assignment: TaskAssignment; task: Task }>;
  }

  async getAssignment(id: number): Promise<TaskAssignment | undefined> {
    const [row] = await db
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.id, id));
    return row;
  }

  async updateAssignmentStatus(
    id: number,
    status: string,
    note?: string
  ): Promise<TaskAssignment> {
    const [row] = await db
      .update(taskAssignments)
      .set({
        status,
        note,
        statusUpdatedAt: new Date(),
      })
      .where(eq(taskAssignments.id, id))
      .returning();
    return row;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [row] = await db.insert(sessions).values(session).returning();
    return row;
  }

  async getSessionByTokenHash(tokenHash: string): Promise<Session | undefined> {
    const [row] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash));
    return row;
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  async deleteUserSessions(userId: number): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async createAuditLog(entry: InsertAuditLog): Promise<AuditLog> {
    const [row] = await db.insert(auditLogs).values(entry).returning();
    return row;
  }

  async listAuditLogs(limit = 50): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }
}

export const storage = new DatabaseStorage();
