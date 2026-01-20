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
  "Boshsardor",
  "Mutoala",
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
  approvedAt: sqliteInteger("approved_at", { mode: "timestamp" }),
  approvedBy: sqliteText("approved_by"),
  rejectedAt: sqliteInteger("rejected_at", { mode: "timestamp" }),
  rejectedBy: sqliteText("rejected_by"),
  rejectionReason: sqliteText("rejection_reason"),
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`
  ),
  updatedAt: sqliteInteger("updated_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`
  ),
});

export const tasks = sqliteTable("tasks", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  title: sqliteText("title").notNull(),
  description: sqliteText("description"),
  createdByAdminId: sqliteInteger("created_by_admin_id")
    .references(() => users.id)
    .notNull(),
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`
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
  statusUpdatedAt: sqliteInteger("status_updated_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`
  ),
  note: sqliteText("note"),
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`
  ),
});

export const sessions = sqliteTable("sessions", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  userId: sqliteInteger("user_id")
    .references(() => users.id)
    .notNull(),
  tokenHash: sqliteText("token_hash").notNull(),
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`
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
  createdAt: sqliteInteger("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`
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

export const taskAssignmentsRelations = relations(taskAssignments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskAssignments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskAssignments.userId],
    references: [users.id],
  }),
}));

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
