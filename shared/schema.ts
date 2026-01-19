
import { sql } from "drizzle-orm";
import { sqliteTable, text as sqliteText, integer as sqliteInteger } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const ROLES = ["user", "admin", "superadmin"] as const;
export const STATUSES = ["pending", "approved", "rejected"] as const;
export const DIRECTIONS = [
  "Boshsardor",
  "Mutoala",
  "Matbuot va media",
  "Iqtidor",
  "Qizlar akademiyasi",
  "Yashil makon",
  "Ustoz AI",
  "Ibrat farzandlari",
  "Jasorat"
] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

// Users Table
export const users = sqliteTable("users", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  telegramId: sqliteText("telegram_id").unique().notNull(), // Stored as string to handle big ints safely
  username: sqliteText("username"),
  fullName: sqliteText("full_name"),
  phone: sqliteText("phone"),
  
  // Region info
  region: sqliteText("region"),
  district: sqliteText("district"),
  mahalla: sqliteText("mahalla"),
  address: sqliteText("address"),
  
  // Profile
  direction: sqliteText("direction"), // One of DIRECTIONS
  birthDate: sqliteText("birth_date"),
  photoUrl: sqliteText("photo_url"),
  
  // System
  role: sqliteText("role").default("user").notNull(), // One of ROLES
  status: sqliteText("status").default("pending").notNull(), // One of STATUSES
  rejectionReason: sqliteText("rejection_reason"),
  createdAt: sqliteInteger("created_at", { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
});

// Tasks Table
export const tasks = sqliteTable("tasks", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  title: sqliteText("title").notNull(),
  description: sqliteText("description").notNull(),
  priority: sqliteText("priority").default("medium").notNull(),
  deadline: sqliteInteger("deadline", { mode: 'timestamp' }),
  completed: sqliteInteger("completed", { mode: 'boolean' }).default(false),
  completedAt: sqliteInteger("completed_at", { mode: 'timestamp' }),
  
  assignedToId: sqliteInteger("assigned_to_id").references(() => users.id),
  createdById: sqliteInteger("created_by_id").references(() => users.id),
  createdAt: sqliteInteger("created_at", { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignee: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
    relationName: "assignedTasks",
  }),
  creator: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
    relationName: "createdTasks",
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true,
  role: true,    // defaulting to user
  status: true   // defaulting to pending
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ 
  id: true, 
  createdAt: true,
  completed: true,
  completedAt: true 
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// API Types
export type AuthTelegramRequest = {
  initData: string;
};

export type RegisterUserRequest = InsertUser; // Full registration data

export type CreateTaskRequest = InsertTask;

export type UpdateTaskStatusRequest = {
  completed: boolean;
};

export type ApprovalRequest = {
  approved: boolean;
  reason?: string; // If rejected
};
