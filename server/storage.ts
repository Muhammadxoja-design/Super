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
  messageTemplates,
  billingTransactions,
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
  type MessageTemplate,
  type InsertMessageTemplate,
  type BillingTransaction,
  type InsertBillingTransaction,
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
  ilike,
  gte,
} from "drizzle-orm";

const normalizeSearchValue = (value: string) =>
  value
    .toLowerCase()
    .replace(/o['’ʻʼ]/g, "o")
    .replace(/g['’ʻʼ]/g, "g")
    .replace(/[\p{P}\p{S}]/gu, "")
    .replace(/\s+/g, "")
    .trim();

const normalizeDigits = (value: string) => value.replace(/\D/g, "");

function isSubsequence(query: string, target: string) {
  if (!query) return false;
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti += 1) {
    if (target[ti] === query[qi]) qi += 1;
  }
  return qi === query.length;
}

function editDistanceWithin(a: string, b: string, maxDistance: number) {
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
  const dp = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    let minRow = dp[0];
    for (let j = 1; j <= b.length; j += 1) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + cost,
      );
      prev = temp;
      if (dp[j] < minRow) minRow = dp[j];
    }
    if (minRow > maxDistance) return maxDistance + 1;
  }
  return dp[b.length];
}

function scoreMatch(query: string, target: string) {
  if (!query || !target) return 0;
  if (query === target) return 100;
  if (target.startsWith(query)) return 90;
  if (target.includes(query)) return 75;
  if (isSubsequence(query, target)) {
    return 60 + Math.round((query.length / target.length) * 10);
  }
  if (query.length <= 10 && target.length <= 32) {
    const distance = editDistanceWithin(query, target, 2);
    if (distance <= 2) {
      return 55 - distance * 10;
    }
  }
  return 0;
}

function scoreNumericMatch(query: string, target: string) {
  if (!query || !target) return 0;
  if (query === target) return 100;
  if (target.startsWith(query)) return 90;
  if (target.includes(query)) return 70;
  if (isSubsequence(query, target)) return 55;
  return 0;
}

function computeUserScore(user: User, queryRaw: string, similarityScore?: number) {
  const normalizedQuery = normalizeSearchValue(queryRaw.replace(/^@/, ""));
  const digitQuery = normalizeDigits(queryRaw);
  if (!normalizedQuery && !digitQuery) return 0;

  const fullName = normalizeSearchValue(
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
  );
  const firstName = normalizeSearchValue(user.firstName ?? "");
  const lastName = normalizeSearchValue(user.lastName ?? "");
  const username = normalizeSearchValue(user.username ?? "");
  const phoneDigits = normalizeDigits(user.phone ?? "");
  const telegramDigits = normalizeDigits(user.telegramId ?? "");
  const idDigits = String(user.id ?? "");

  const nameScore = Math.max(
    scoreMatch(normalizedQuery, fullName),
    scoreMatch(normalizedQuery, firstName),
    scoreMatch(normalizedQuery, lastName),
  );
  const usernameScore = scoreMatch(normalizedQuery, username) * 0.9;
  const phoneScore = digitQuery
    ? scoreNumericMatch(digitQuery, phoneDigits) * 0.95
    : 0;
  const telegramScore = digitQuery
    ? scoreNumericMatch(digitQuery, telegramDigits) * 0.8
    : 0;
  const idScore = digitQuery ? scoreNumericMatch(digitQuery, idDigits) * 0.75 : 0;

  const baseScore = Math.max(
    nameScore,
    usernameScore,
    phoneScore,
    telegramScore,
    idScore,
  );

  const similarityBonus =
    typeof similarityScore === "number"
      ? Math.round(similarityScore * 35)
      : 0;

  return baseScore + similarityBonus;
}

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
    district?: string;
    viloyat?: string;
    tuman?: string;
    shahar?: string;
    mahalla?: string;
    direction?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<User[]>;
  searchUsers(params: {
    query?: string;
    status?: string;
    region?: string;
    district?: string;
    viloyat?: string;
    tuman?: string;
    shahar?: string;
    mahalla?: string;
    direction?: string;
    lastActiveAfter?: Date;
    sort?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
  }): Promise<{
    items: User[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>;
  updateUserStatus(
    id: number,
    status: string,
    rejectionReason?: string
  ): Promise<User>;
  updateUserLastSeen(id: number, lastSeen: Date): Promise<User>;
  updateUserPlan(
    id: number,
    updates: { plan?: string; proUntil?: Date | null }
  ): Promise<User>;
  listBroadcastRecipients(): Promise<User[]>;
  listUsersByTarget(params: {
    targetType: string;
    targetValue?: string | number | null;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<User[]>;
  countUsersByTarget(params: {
    targetType: string;
    targetValue?: string | number | null;
    status?: string;
  }): Promise<number>;

  createTask(task: InsertTask): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task>;
  listTaskAssignmentsByUser(userId: number): Promise<TaskAssignment[]>;
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
  getAssignmentsByUserId(userId: number, status?: string): Promise<
    Array<{ assignment: TaskAssignment; task: Task }>
  >;
  getAssignment(id: number): Promise<TaskAssignment | undefined>;
  updateAssignmentStatus(
    id: number,
    status: string,
    note?: string,
    updatedByUserId?: number | null
  ): Promise<TaskAssignment>;
  updateAssignmentStatusIfChanged(
    id: number,
    status: string,
    note?: string,
    updatedByUserId?: number | null
  ): Promise<TaskAssignment | null>;
  updateAssignmentProof(
    id: number,
    proof: {
      proofText?: string | null;
      proofFileId?: string | null;
      proofType?: string | null;
      proofSubmittedAt?: Date | null;
    },
  ): Promise<TaskAssignment>;
  updateAssignmentDelivery(
    id: number,
    deliveredAt: Date,
  ): Promise<TaskAssignment>;

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
  countRecentMessages(params: {
    userId: number;
    since: Date;
  }): Promise<number>;
  updateMessage(
    id: number,
    updates: Partial<InsertMessageQueue>
  ): Promise<MessageQueue>;
  getBroadcastFailReasons(limit?: number): Promise<Record<string, number>>;
  countBroadcasts(): Promise<number>;

  createMessageTemplate(entry: InsertMessageTemplate): Promise<MessageTemplate>;
  getMessageTemplate(id: number): Promise<MessageTemplate | undefined>;
  listMessageTemplates(): Promise<MessageTemplate[]>;
  updateMessageTemplate(
    id: number,
    updates: Partial<InsertMessageTemplate>
  ): Promise<MessageTemplate>;
  deleteMessageTemplate(id: number): Promise<void>;

  createBillingTransaction(
    entry: InsertBillingTransaction
  ): Promise<BillingTransaction>;
  listBillingTransactions(userId?: number): Promise<BillingTransaction[]>;
}

export class DatabaseStorage implements IStorage {
  private pgTrgmAvailablePromise?: Promise<boolean>;

  private async hasPgTrgmExtension(): Promise<boolean> {
    if (!this.pgTrgmAvailablePromise) {
      this.pgTrgmAvailablePromise = db
        .execute(sql`select 1 from pg_extension where extname = 'pg_trgm' limit 1`)
        .then((result) => {
          if (result && "rows" in result) {
            return result.rows.length > 0;
          }
          if (Array.isArray(result)) {
            return result.length > 0;
          }
          return false;
        })
        .catch(() => false);
    }
    return this.pgTrgmAvailablePromise;
  }

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
    district?: string;
    viloyat?: string;
    tuman?: string;
    shahar?: string;
    mahalla?: string;
    direction?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<User[]> {
    const searchTerm = filters.search?.trim();
    const searchCondition = searchTerm
      ? or(
          ilike(users.firstName, `%${searchTerm}%`),
          ilike(users.lastName, `%${searchTerm}%`),
          ilike(users.username, `%${searchTerm}%`),
          ilike(users.phone, `%${searchTerm}%`),
          ilike(users.region, `%${searchTerm}%`),
          ilike(users.district, `%${searchTerm}%`),
          ilike(users.mahalla, `%${searchTerm}%`),
          ilike(users.viloyat, `%${searchTerm}%`),
          ilike(users.tuman, `%${searchTerm}%`),
          ilike(users.shahar, `%${searchTerm}%`),
        )
      : undefined;
    const conditions = [
      filters.status ? eq(users.status, filters.status) : undefined,
      filters.region ? eq(users.region, filters.region) : undefined,
      filters.district ? eq(users.district, filters.district) : undefined,
      filters.viloyat ? eq(users.viloyat, filters.viloyat) : undefined,
      filters.tuman ? eq(users.tuman, filters.tuman) : undefined,
      filters.shahar ? eq(users.shahar, filters.shahar) : undefined,
      filters.mahalla ? eq(users.mahalla, filters.mahalla) : undefined,
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

  async searchUsers(params: {
    query?: string;
    status?: string;
    region?: string;
    district?: string;
    viloyat?: string;
    tuman?: string;
    shahar?: string;
    mahalla?: string;
    direction?: string;
    lastActiveAfter?: Date;
    sort?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
  }): Promise<{
    items: User[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }> {
    const rawQuery = params.query ?? "";
    const searchTerm = rawQuery.trim();
    const normalizedQuery = normalizeSearchValue(searchTerm.replace(/^@/, ""));
    const digitQuery = normalizeDigits(searchTerm);
    const conditions = [
      params.status ? eq(users.status, params.status) : undefined,
      params.region ? eq(users.region, params.region) : undefined,
      params.district ? eq(users.district, params.district) : undefined,
      params.viloyat ? eq(users.viloyat, params.viloyat) : undefined,
      params.tuman ? eq(users.tuman, params.tuman) : undefined,
      params.shahar ? eq(users.shahar, params.shahar) : undefined,
      params.mahalla ? eq(users.mahalla, params.mahalla) : undefined,
      params.direction ? eq(users.direction, params.direction) : undefined,
      params.lastActiveAfter
        ? gte(users.lastActive, params.lastActiveAfter)
        : undefined,
    ].filter(Boolean);

    const page = Math.max(1, params.page ?? 1);
    const requestedPageSize = params.pageSize ?? params.limit ?? 20;
    const pageSize = Math.min(100, Math.max(1, requestedPageSize));
    const offset = (page - 1) * pageSize;
    const sort = params.sort ?? "created_at";
    const orderBy =
      sort === "tasks_completed"
        ? sql`(select count(*) from task_assignments ta where ta.user_id = ${users.id} and ta.status = 'DONE') desc`
        : sort === "last_active"
          ? desc(users.lastActive)
          : desc(users.createdAt);
    if (params.query !== undefined) {
      console.log("[searchUsers] query received", {
        query: searchTerm,
        normalizedQuery,
        digitQuery,
      });
      if (!searchTerm || (normalizedQuery.length < 2 && digitQuery.length < 2)) {
        console.log("[searchUsers] query too short or empty");
        return { items: [], page, pageSize, total: 0, totalPages: 1 };
      }
    }

    const hasSearch = Boolean(searchTerm);

    if (!hasSearch) {
      let query = db.select().from(users);
      if (conditions.length) {
        query = query.where(and(...conditions));
      }
      const items = await query
        .orderBy(orderBy, desc(users.createdAt))
        .limit(pageSize)
        .offset(offset);

      const totalQuery = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(conditions.length ? and(...conditions) : undefined);
      const totalRaw = totalQuery[0]?.count ?? 0;
      const total = Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : 0;
      const totalPages = total ? Math.max(1, Math.ceil(total / pageSize)) : 1;

      return { items, page, pageSize, total, totalPages };
    }

    const similarityScore = (await this.hasPgTrgmExtension())
      ? sql<number>`greatest(
          similarity(coalesce(${users.firstName}, ''), ${searchTerm}),
          similarity(coalesce(${users.lastName}, ''), ${searchTerm}),
          similarity(coalesce(${users.username}, ''), ${searchTerm}),
          similarity(coalesce(${users.phone}, ''), ${searchTerm}),
          similarity(coalesce(${users.telegramId}, ''), ${searchTerm})
        )`
      : sql<number>`0`;

    const baseQuery = db.select({ user: users, similarity: similarityScore }).from(users);
    const rows = await (conditions.length
      ? baseQuery.where(and(...conditions))
      : baseQuery);
    console.log("[searchUsers] candidate rows fetched", { count: rows.length });

    const scored = rows
      .map((row) => ({
        user: row.user,
        score: computeUserScore(row.user, searchTerm, row.similarity),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aTime = a.user.createdAt ? new Date(a.user.createdAt).getTime() : 0;
        const bTime = b.user.createdAt ? new Date(b.user.createdAt).getTime() : 0;
        return bTime - aTime;
      });

    const total = scored.length;
    const totalPages = total ? Math.max(1, Math.ceil(total / pageSize)) : 1;
    const items = scored
      .slice(offset, offset + pageSize)
      .map((row) => row.user);

    return { items, page, pageSize, total, totalPages };
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
      .set({ lastSeen, lastActive: lastSeen, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPlan(
    id: number,
    updates: { plan?: string; proUntil?: Date | null }
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
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

  async listUsersByTarget(params: {
    targetType: string;
    targetValue?: string | number | null;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<User[]> {
    const targetValue = params.targetValue ?? null;
    let condition;
    switch (params.targetType) {
      case "USER":
        condition =
          typeof targetValue === "number"
            ? eq(users.id, targetValue)
            : targetValue
              ? eq(users.telegramId, String(targetValue))
              : undefined;
        break;
      case "DIRECTION":
        condition = targetValue ? eq(users.direction, String(targetValue)) : undefined;
        break;
      case "VILOYAT":
        condition = targetValue ? eq(users.viloyat, String(targetValue)) : undefined;
        break;
      case "TUMAN":
        condition = targetValue ? eq(users.tuman, String(targetValue)) : undefined;
        break;
      case "SHAHAR":
        condition = targetValue ? eq(users.shahar, String(targetValue)) : undefined;
        break;
      case "MAHALLA":
        condition = targetValue ? eq(users.mahalla, String(targetValue)) : undefined;
        break;
      case "ALL":
        condition = undefined;
        break;
      default:
        condition = undefined;
    }

    let query = db.select().from(users);
    if (condition && params.status) {
      query = query.where(and(condition, eq(users.status, params.status)));
    } else if (condition) {
      query = query.where(condition);
    } else if (params.status) {
      query = query.where(eq(users.status, params.status));
    }
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.offset(params.offset);
    }
    return query;
  }

  async countUsersByTarget(params: {
    targetType: string;
    targetValue?: string | number | null;
    status?: string;
  }): Promise<number> {
    const baseCondition =
      params.targetType === "USER"
        ? typeof params.targetValue === "number"
          ? eq(users.id, params.targetValue)
          : params.targetValue
            ? eq(users.telegramId, String(params.targetValue))
            : undefined
        : params.targetType === "DIRECTION"
          ? params.targetValue
            ? eq(users.direction, String(params.targetValue))
            : undefined
          : params.targetType === "VILOYAT"
            ? params.targetValue
              ? eq(users.viloyat, String(params.targetValue))
              : undefined
            : params.targetType === "TUMAN"
              ? params.targetValue
                ? eq(users.tuman, String(params.targetValue))
                : undefined
              : params.targetType === "SHAHAR"
                ? params.targetValue
                  ? eq(users.shahar, String(params.targetValue))
                  : undefined
                : params.targetType === "MAHALLA"
                  ? params.targetValue
                    ? eq(users.mahalla, String(params.targetValue))
                    : undefined
                  : undefined;
    const whereClause =
      baseCondition && params.status
        ? and(baseCondition, eq(users.status, params.status))
        : baseCondition
          ? baseCondition
          : params.status
            ? eq(users.status, params.status)
            : undefined;
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);
    const rawCount = row?.count ?? 0;
    const count = Number(rawCount);
    return Number.isFinite(count) ? count : 0;
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

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ ...updates })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async listTaskAssignmentsByUser(userId: number): Promise<TaskAssignment[]> {
    return db
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.userId, userId))
      .orderBy(desc(taskAssignments.createdAt));
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

  async getAssignmentsByUserId(userId: number, status?: string) {
    const assignmentRows = await db
      .select()
      .from(taskAssignments)
      .where(
        and(
          eq(taskAssignments.userId, userId),
          status ? eq(taskAssignments.status, status) : undefined,
        ),
      )
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
    note?: string,
    updatedByUserId?: number | null,
  ): Promise<TaskAssignment> {
    const [row] = await db
      .update(taskAssignments)
      .set({
        status,
        statusNote: note ?? null,
        note: note ?? null,
        statusUpdatedAt: new Date(),
        statusUpdatedByUserId: updatedByUserId ?? null,
      })
      .where(eq(taskAssignments.id, id))
      .returning();
    return row;
  }

  async updateAssignmentStatusIfChanged(
    id: number,
    status: string,
    note?: string,
    updatedByUserId?: number | null,
  ): Promise<TaskAssignment | null> {
    const [row] = await db
      .update(taskAssignments)
      .set({
        status,
        statusNote: note ?? null,
        note: note ?? null,
        statusUpdatedAt: new Date(),
        statusUpdatedByUserId: updatedByUserId ?? null,
      })
      .where(and(eq(taskAssignments.id, id), sql`${taskAssignments.status} != ${status}`))
      .returning();
    return row ?? null;
  }

  async updateAssignmentProof(
    id: number,
    proof: {
      proofText?: string | null;
      proofFileId?: string | null;
      proofType?: string | null;
      proofSubmittedAt?: Date | null;
    },
  ): Promise<TaskAssignment> {
    const [row] = await db
      .update(taskAssignments)
      .set({ ...proof })
      .where(eq(taskAssignments.id, id))
      .returning();
    return row;
  }

  async updateAssignmentDelivery(id: number, deliveredAt: Date): Promise<TaskAssignment> {
    const [row] = await db
      .update(taskAssignments)
      .set({ deliveredAt })
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
    await db.insert(broadcastLogs).values(entries).execute();
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

  async countRecentMessages(params: {
    userId: number;
    since: Date;
  }): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messageQueue)
      .where(
        and(
          eq(messageQueue.userId, params.userId),
          eq(messageQueue.status, "sent"),
          gte(messageQueue.deliveredAt, params.since),
        ),
      );
    return row?.count ?? 0;
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

  async createMessageTemplate(entry: InsertMessageTemplate): Promise<MessageTemplate> {
    const [row] = await db.insert(messageTemplates).values(entry).returning();
    return row;
  }

  async getMessageTemplate(id: number): Promise<MessageTemplate | undefined> {
    const [row] = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, id));
    return row;
  }

  async listMessageTemplates(): Promise<MessageTemplate[]> {
    return db.select().from(messageTemplates).orderBy(desc(messageTemplates.createdAt));
  }

  async updateMessageTemplate(
    id: number,
    updates: Partial<InsertMessageTemplate>
  ): Promise<MessageTemplate> {
    const [row] = await db
      .update(messageTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(messageTemplates.id, id))
      .returning();
    return row;
  }

  async deleteMessageTemplate(id: number): Promise<void> {
    await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
  }

  async createBillingTransaction(
    entry: InsertBillingTransaction
  ): Promise<BillingTransaction> {
    const [row] = await db.insert(billingTransactions).values(entry).returning();
    return row;
  }

  async listBillingTransactions(userId?: number): Promise<BillingTransaction[]> {
    let query = db.select().from(billingTransactions);
    if (userId) {
      query = query.where(eq(billingTransactions.userId, userId));
    }
    return query.orderBy(desc(billingTransactions.createdAt));
  }

  async countBroadcasts(): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(broadcasts);
    return row?.count ?? 0;
  }
}

export const storage = new DatabaseStorage();
