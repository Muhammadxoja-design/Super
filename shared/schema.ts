import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text as sqliteText,
  integer as sqliteInteger,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const TASK_STATUSES = [
  "pending",
  "accepted",
  "in_progress",
  "rejected",
  "done",
] as const;

export const USER_STATUSES = ["pending", "approved", "rejected"] as const;

export const DIRECTIONS = [
  "Bosh sardor",
  "Mutolaa",
  "Matbuot va media",
  "Iqtidor",
  "Qizlar akademiyasi",
  "Yashil makon",
  "Ustoz AI",
  "Ibrat farzandlari",
  "Jasorat",
] as const;

export const users = sqliteTable("users", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  telegramId: sqliteText("telegram_id").unique(),
  login: sqliteText("login").unique(),
  username: sqliteText("username"),
  firstName: sqliteText("first_name"),
  lastName: sqliteText("last_name"),
  phone: sqliteText("phone"),
  region: sqliteText("region"),
  district: sqliteText("district"),
  mahalla: sqliteText("mahalla"),
  address: sqliteText("address"),
  birthDate: sqliteText("birth_date"),
  direction: sqliteText("direction"),
  photoUrl: sqliteText("photo_url"),
  passwordHash: sqliteText("password_hash"),
  isAdmin: sqliteInteger("is_admin", { mode: "boolean" }).default(false),
  status: sqliteText("status").default("pending").notNull(),
  telegramStatus: sqliteText("telegram_status").default("active"),
  lastSeen: sqliteInteger("last_seen", { mode: "timestamp" }),
  approvedAt: sqliteInteger("approved_at", { mode: "timestamp" }),
  approvedBy: sqliteText("approved_by"),
  rejectedAt: sqliteInteger("rejected_at", { mode: "timestamp" }),
  rejectedBy: sqliteText("rejected_by"),
  rejectionReason: sqliteText("rejection_reason"),
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
  updatedAt: sqliteInteger("updated_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const tasks = sqliteTable("tasks", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  title: sqliteText("title").notNull(),
  description: sqliteText("description"),
  idempotencyKey: sqliteText("idempotency_key"),
  createdByAdminId: sqliteInteger("created_by_admin_id")
    .references(() => users.id)
    .notNull(),
  assignedTo: sqliteInteger("assigned_to"),
  status: sqliteText("status").default("pending"),
  dueDate: sqliteText("due_date"),
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const taskAssignments = sqliteTable("task_assignments", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  taskId: sqliteInteger("task_id")
    .references(() => tasks.id)
    .notNull(),
  userId: sqliteInteger("user_id")
    .references(() => users.id)
    .notNull(),
  status: sqliteText("status").default("pending").notNull(),
  statusUpdatedAt: sqliteInteger("status_updated_at", {
    mode: "timestamp",
  }).default(sql`(CURRENT_TIMESTAMP)`),
  note: sqliteText("note"),
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const sessions = sqliteTable("sessions", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  userId: sqliteInteger("user_id")
    .references(() => users.id)
    .notNull(),
  tokenHash: sqliteText("token_hash").notNull(),
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
  expiresAt: sqliteInteger("expires_at", { mode: "timestamp" }).notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  actorId: sqliteInteger("actor_id").references(() => users.id),
  action: sqliteText("action").notNull(),
  targetType: sqliteText("target_type").notNull(),
  targetId: sqliteInteger("target_id"),
  metadata: sqliteText("metadata"),
  payloadHash: sqliteText("payload_hash"),
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const taskEvents = sqliteTable("task_events", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  taskId: sqliteInteger("task_id")
    .references(() => tasks.id)
    .notNull(),
  assignmentId: sqliteInteger("assignment_id")
    .references(() => taskAssignments.id)
    .notNull(),
  userId: sqliteInteger("user_id")
    .references(() => users.id)
    .notNull(),
  status: sqliteText("status").notNull(),
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const broadcasts = sqliteTable("broadcasts", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  createdByAdminId: sqliteInteger("created_by_admin_id")
    .references(() => users.id)
    .notNull(),
  messageText: sqliteText("message_text"),
  mediaUrl: sqliteText("media_url"),
  status: sqliteText("status").default("draft").notNull(),
  totalCount: sqliteInteger("total_count").default(0),
  sentCount: sqliteInteger("sent_count").default(0),
  failedCount: sqliteInteger("failed_count").default(0),
  startedAt: sqliteInteger("started_at", { mode: "timestamp" }),
  finishedAt: sqliteInteger("finished_at", { mode: "timestamp" }),
  correlationId: sqliteText("correlation_id"),
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const broadcastLogs = sqliteTable("broadcast_logs", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  broadcastId: sqliteInteger("broadcast_id")
    .references(() => broadcasts.id)
    .notNull(),
  userId: sqliteInteger("user_id").references(() => users.id),
  telegramId: sqliteText("telegram_id"),
  status: sqliteText("status").default("pending").notNull(),
  attempts: sqliteInteger("attempts").default(0),
  lastErrorCode: sqliteInteger("last_error_code"),
  lastErrorMessage: sqliteText("last_error_message"),
  nextAttemptAt: sqliteInteger("next_attempt_at", { mode: "timestamp" }),
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
  updatedAt: sqliteInteger("updated_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const messageQueue = sqliteTable("message_queue", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  type: sqliteText("type").notNull(),
  userId: sqliteInteger("user_id").references(() => users.id),
  telegramId: sqliteText("telegram_id"),
  payload: sqliteText("payload").notNull(),
  status: sqliteText("status").default("pending").notNull(),
  attempts: sqliteInteger("attempts").default(0),
  lastErrorCode: sqliteInteger("last_error_code"),
  lastErrorMessage: sqliteText("last_error_message"),
  nextAttemptAt: sqliteInteger("next_attempt_at", { mode: "timestamp" }),
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
  updatedAt: sqliteInteger("updated_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const usersRelations = relations(users, ({ many }) => ({
  assignments: many(taskAssignments),
  createdTasks: many(tasks),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  creator: one(users, {
    fields: [tasks.createdByAdminId],
    references: [users.id],
  }),
  assignments: many(taskAssignments),
}));

export const taskAssignmentsRelations = relations(
  taskAssignments,
  ({ one }) => ({
    task: one(tasks, {
      fields: [taskAssignments.taskId],
      references: [tasks.id],
    }),
    user: one(users, {
      fields: [taskAssignments.userId],
      references: [users.id],
    }),
  }),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export const taskEventsRelations = relations(taskEvents, ({ one }) => ({
  task: one(tasks, {
    fields: [taskEvents.taskId],
    references: [tasks.id],
  }),
  assignment: one(taskAssignments, {
    fields: [taskEvents.assignmentId],
    references: [taskAssignments.id],
  }),
  user: one(users, {
    fields: [taskEvents.userId],
    references: [users.id],
  }),
}));

export const broadcastsRelations = relations(broadcasts, ({ one, many }) => ({
  creator: one(users, {
    fields: [broadcasts.createdByAdminId],
    references: [users.id],
  }),
  logs: many(broadcastLogs),
}));

export const broadcastLogsRelations = relations(broadcastLogs, ({ one }) => ({
  broadcast: one(broadcasts, {
    fields: [broadcastLogs.broadcastId],
    references: [broadcasts.id],
  }),
  user: one(users, {
    fields: [broadcastLogs.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isAdmin: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentSchema = createInsertSchema(taskAssignments).omit({
  id: true,
  createdAt: true,
  statusUpdatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertTaskEventSchema = createInsertSchema(taskEvents).omit({
  id: true,
  createdAt: true,
});

export const insertBroadcastSchema = createInsertSchema(broadcasts).omit({
  id: true,
  createdAt: true,
});

export const insertBroadcastLogSchema = createInsertSchema(broadcastLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageQueueSchema = createInsertSchema(messageQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type InsertTaskAssignment = z.infer<typeof insertAssignmentSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type TaskEvent = typeof taskEvents.$inferSelect;
export type InsertTaskEvent = z.infer<typeof insertTaskEventSchema>;
export type Broadcast = typeof broadcasts.$inferSelect;
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;
export type BroadcastLog = typeof broadcastLogs.$inferSelect;
export type InsertBroadcastLog = z.infer<typeof insertBroadcastLogSchema>;
export type MessageQueue = typeof messageQueue.$inferSelect;
export type InsertMessageQueue = z.infer<typeof insertMessageQueueSchema>;
