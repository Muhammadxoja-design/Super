import { db } from "./db";
import crypto from "crypto";
import {
  users,
  tasks,
  taskAssignments,
  sessions,
  auditLogs,
  taskEvents,
  broadcasts,
  broadcastLogs,
  messageQueue,
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
  type TaskEvent,
  type InsertTaskEvent,
  type Broadcast,
  type InsertBroadcast,
  type BroadcastLog,
  type InsertBroadcastLog,
  type MessageQueue,
  type InsertMessageQueue,
} from "@shared/schema";
import {
  eq,
  and,
  or,
  like,
  inArray,
  desc,
  isNull,
  lte,
  sql,
  asc,
} from "drizzle-orm";

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
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<User[]>;
  updateUserStatus(
    id: number,
    status: string,
    rejectionReason?: string
  ): Promise<User>;
  updateUserLastSeen(id: number, lastSeen: Date): Promise<User>;
  listBroadcastRecipients(): Promise<User[]>;

  createTask(task: InsertTask): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  listTasksWithAssignments(params: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
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
  updateAssignmentStatusIfChanged(
    id: number,
    status: string,
    note?: string
  ): Promise<TaskAssignment | null>;

  createSession(session: InsertSession): Promise<Session>;
  getSessionByTokenHash(tokenHash: string): Promise<Session | undefined>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
  deleteUserSessions(userId: number): Promise<void>;

  createAuditLog(entry: InsertAuditLog): Promise<AuditLog>;
  listAuditLogs(limit?: number): Promise<AuditLog[]>;

  createTaskEvent(entry: InsertTaskEvent): Promise<TaskEvent>;

  createBroadcast(entry: InsertBroadcast): Promise<Broadcast>;
  updateBroadcast(id: number, updates: Partial<InsertBroadcast>): Promise<Broadcast>;
  listBroadcasts(params: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Broadcast[]>;
  getBroadcast(id: number): Promise<Broadcast | undefined>;
  createBroadcastLogs(entries: InsertBroadcastLog[]): Promise<void>;
  listPendingBroadcastLogs(params: {
    broadcastId: number;
    limit: number;
    now: Date;
  }): Promise<BroadcastLog[]>;
  updateBroadcastLog(
    id: number,
    updates: Partial<InsertBroadcastLog>
  ): Promise<BroadcastLog>;
  countBroadcastLogs(broadcastId: number): Promise<{ sent: number; failed: number }>;
  countPendingBroadcastLogs(broadcastId: number): Promise<number>;

  enqueueMessage(entry: InsertMessageQueue): Promise<MessageQueue>;
  listPendingMessages(params: {
    limit: number;
    now: Date;
  }): Promise<MessageQueue[]>;
  updateMessage(
    id: number,
    updates: Partial<InsertMessageQueue>
  ): Promise<MessageQueue>;
  getBroadcastFailReasons(limit?: number): Promise<Record<string, number>>;
  countBroadcasts(): Promise<number>;
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
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<User[]> {
    const searchTerm = filters.search?.trim();
    const searchCondition = searchTerm
      ? or(
          like(users.firstName, `%${searchTerm}%`),
          like(users.lastName, `%${searchTerm}%`),
          like(users.username, `%${searchTerm}%`),
          like(users.phone, `%${searchTerm}%`),
        )
      : undefined;
    const conditions = [
      filters.status ? eq(users.status, filters.status) : undefined,
      filters.region ? eq(users.region, filters.region) : undefined,
      filters.direction ? eq(users.direction, filters.direction) : undefined,
      searchCondition,
    ].filter(Boolean);

    let query = db.select().from(users);
    if (conditions.length) {
      query = query.where(and(...conditions));
    }
    query = query.orderBy(desc(users.createdAt));
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    return query;
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

  async updateUserLastSeen(id: number, lastSeen: Date): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ lastSeen, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async listBroadcastRecipients(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(
        and(
          eq(users.status, "approved"),
          eq(users.telegramStatus, "active"),
          sql`${users.telegramId} is not null`
        )
      )
      .orderBy(asc(users.id));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
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

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async listTasksWithAssignments(params: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let taskQuery = db
      .select()
      .from(tasks)
      .where(
        params.search ? like(tasks.title, `%${params.search}%`) : undefined
      )
      .orderBy(desc(tasks.createdAt));

    if (params.limit) {
      taskQuery = taskQuery.limit(params.limit);
    }
    if (params.offset) {
      taskQuery = taskQuery.offset(params.offset);
    }

    const taskRows = await taskQuery;

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

  async updateAssignmentStatusIfChanged(
    id: number,
    status: string,
    note?: string
  ): Promise<TaskAssignment | null> {
    const [row] = await db
      .update(taskAssignments)
      .set({
        status,
        note,
        statusUpdatedAt: new Date(),
      })
      .where(and(eq(taskAssignments.id, id), sql`${taskAssignments.status} != ${status}`))
      .returning();
    return row ?? null;
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
    const payloadHash =
      entry.payloadHash ||
      crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            targetType: entry.targetType,
            targetId: entry.targetId ?? null,
            metadata: entry.metadata ?? null,
          }),
        )
        .digest("hex");

    const [row] = await db
      .insert(auditLogs)
      .values({ ...entry, payloadHash })
      .onConflictDoNothing({
        target: [auditLogs.actorId, auditLogs.action, auditLogs.payloadHash],
      })
      .returning();

    if (row) return row;

    const actorFilter =
      entry.actorId === null || entry.actorId === undefined
        ? isNull(auditLogs.actorId)
        : eq(auditLogs.actorId, entry.actorId);

    const [existing] = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          actorFilter,
          eq(auditLogs.action, entry.action),
          eq(auditLogs.payloadHash, payloadHash),
        ),
      );

    if (existing) return existing;
    throw new Error("Failed to create audit log");
  }

  async listAuditLogs(limit = 50): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  async createTaskEvent(entry: InsertTaskEvent): Promise<TaskEvent> {
    const [row] = await db.insert(taskEvents).values(entry).returning();
    return row;
  }

  async createBroadcast(entry: InsertBroadcast): Promise<Broadcast> {
    const [row] = await db.insert(broadcasts).values(entry).returning();
    return row;
  }

  async updateBroadcast(
    id: number,
    updates: Partial<InsertBroadcast>
  ): Promise<Broadcast> {
    const [row] = await db
      .update(broadcasts)
      .set({ ...updates })
      .where(eq(broadcasts.id, id))
      .returning();
    return row;
  }

  async listBroadcasts(params: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Broadcast[]> {
    let query = db
      .select()
      .from(broadcasts)
      .where(params.status ? eq(broadcasts.status, params.status) : undefined)
      .orderBy(desc(broadcasts.createdAt));
    if (params.limit) query = query.limit(params.limit);
    if (params.offset) query = query.offset(params.offset);
    return query;
  }

  async getBroadcast(id: number): Promise<Broadcast | undefined> {
    const [row] = await db
      .select()
      .from(broadcasts)
      .where(eq(broadcasts.id, id));
    return row;
  }

  async createBroadcastLogs(entries: InsertBroadcastLog[]): Promise<void> {
    if (entries.length === 0) return;
    await db.insert(broadcastLogs).values(entries).run();
  }

  async listPendingBroadcastLogs(params: {
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
            lte(broadcastLogs.nextAttemptAt, params.now)
          )
        )
      )
      .orderBy(asc(broadcastLogs.id))
      .limit(params.limit);
  }

  async updateBroadcastLog(
    id: number,
    updates: Partial<InsertBroadcastLog>
  ): Promise<BroadcastLog> {
    const [row] = await db
      .update(broadcastLogs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(broadcastLogs.id, id))
      .returning();
    return row;
  }

  async countBroadcastLogs(broadcastId: number): Promise<{ sent: number; failed: number }> {
    const [row] = await db
      .select({
        sent: sql<number>`sum(case when ${broadcastLogs.status} = 'sent' then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${broadcastLogs.status} = 'failed' then 1 else 0 end)`,
      })
      .from(broadcastLogs)
      .where(eq(broadcastLogs.broadcastId, broadcastId));
    return {
      sent: row?.sent ?? 0,
      failed: row?.failed ?? 0,
    };
  }

  async countPendingBroadcastLogs(broadcastId: number): Promise<number> {
    const [row] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(broadcastLogs)
      .where(and(eq(broadcastLogs.broadcastId, broadcastId), eq(broadcastLogs.status, "pending")));
    return row?.count ?? 0;
  }

  async enqueueMessage(entry: InsertMessageQueue): Promise<MessageQueue> {
    const [row] = await db.insert(messageQueue).values(entry).returning();
    return row;
  }

  async listPendingMessages(params: {
    limit: number;
    now: Date;
  }): Promise<MessageQueue[]> {
    return db
      .select()
      .from(messageQueue)
      .where(
        and(
          eq(messageQueue.status, "pending"),
          or(
            isNull(messageQueue.nextAttemptAt),
            lte(messageQueue.nextAttemptAt, params.now)
          )
        )
      )
      .orderBy(asc(messageQueue.id))
      .limit(params.limit);
  }

  async updateMessage(
    id: number,
    updates: Partial<InsertMessageQueue>
  ): Promise<MessageQueue> {
    const [row] = await db
      .update(messageQueue)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(messageQueue.id, id))
      .returning();
    return row;
  }

  async getBroadcastFailReasons(limit = 10): Promise<Record<string, number>> {
    const rows = await db
      .select({
        reason: broadcastLogs.lastErrorCode,
        count: sql<number>`count(*)`,
      })
      .from(broadcastLogs)
      .where(eq(broadcastLogs.status, "failed"))
      .groupBy(broadcastLogs.lastErrorCode)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return rows.reduce<Record<string, number>>((acc, row) => {
      const key = row.reason === null ? "unknown" : String(row.reason);
      acc[key] = row.count ?? 0;
      return acc;
    }, {});
  }

  async countBroadcasts(): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(broadcasts);
    return row?.count ?? 0;
  }
}

export const storage = new DatabaseStorage();
