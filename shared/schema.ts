import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const TASK_STATUSES = [
  "ACTIVE",
  "DONE",
  "CANNOT_DO",
  "PENDING",
  "WILL_DO",
] as const;

export const TASK_STATUS_LABELS: Record<(typeof TASK_STATUSES)[number], string> =
  {
    ACTIVE: "Faol",
    DONE: "Qildim",
    CANNOT_DO: "Qila olmadim",
    PENDING: "Kutilmoqda",
    WILL_DO: "Endi qilaman",
  };

export const USER_STATUSES = ["pending", "approved", "rejected"] as const;

export const USER_ROLES = [
  "user",
  "moderator",
  "admin",
  "super_admin",
] as const;

export const USER_PLANS = ["FREE", "PRO"] as const;

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

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    telegramId: text("telegram_id"),
    login: text("login"),
    username: text("username"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    region: text("region"),
    district: text("district"),
    viloyat: text("viloyat"),
    tuman: text("tuman"),
    shahar: text("shahar"),
    mahalla: text("mahalla"),
    address: text("address"),
    birthDate: text("birth_date"),
    direction: text("direction"),
    photoUrl: text("photo_url"),
    passwordHash: text("password_hash"),
    isAdmin: boolean("is_admin").default(false),
    role: text("role").default("user").notNull(),
    plan: text("plan").default("FREE").notNull(),
    proUntil: timestamp("pro_until", { mode: "date" }),
    status: text("status").default("approved").notNull(),
    telegramStatus: text("telegram_status").default("active"),
    lastSeen: timestamp("last_seen", { mode: "date" }),
    lastActive: timestamp("last_active", { mode: "date" }),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    approvedBy: text("approved_by"),
    rejectedAt: timestamp("rejected_at", { mode: "date" }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  },
  (table) => ({
    usersTelegramIdUnique: uniqueIndex("users_telegram_id_unique").on(
      table.telegramId,
    ),
    usersLoginUnique: uniqueIndex("users_login_unique").on(table.login),
    usersStatusIndex: index("users_status_index").on(table.status),
    usersLastSeenIndex: index("users_last_seen_index").on(table.lastSeen),
    usersCreatedAtIndex: index("users_created_at_index").on(table.createdAt),
    usersRoleIndex: index("users_role_index").on(table.role),
    usersDirectionIndex: index("users_direction_index").on(table.direction),
    usersViloyatIndex: index("users_viloyat_index").on(table.viloyat),
    usersTumanIndex: index("users_tuman_index").on(table.tuman),
    usersMahallaIndex: index("users_mahalla_index").on(table.mahalla),
    usersNameIndex: index("users_name_index").on(table.firstName, table.lastName),
    usersUsernameIndex: index("users_username_index").on(table.username),
    usersPhoneIndex: index("users_phone_index").on(table.phone),
  }),
);

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: serial("id").primaryKey(),
    title: text("title"),
    body: text("body").notNull(),
    isActive: boolean("is_active").default(true),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  },
  (table) => ({
    messageTemplatesCreatedAtIndex: index(
      "message_templates_created_at_index",
    ).on(table.createdAt),
  }),
);

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    idempotencyKey: text("idempotency_key"),
    createdByAdminId: integer("created_by_admin_id")
      .references(() => users.id)
      .notNull(),
    assignedTo: integer("assigned_to"),
    status: text("status").default("ACTIVE"),
    dueDate: text("due_date"),
    targetType: text("target_type"),
    targetValue: text("target_value"),
    targetCount: integer("target_count").default(0),
    templateId: integer("template_id").references(() => messageTemplates.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  },
  (table) => ({
    tasksIdempotencyKeyUnique: uniqueIndex(
      "tasks_idempotency_key_unique",
    ).on(table.idempotencyKey),
    tasksAssignedToIndex: index("tasks_assigned_to_index").on(
      table.assignedTo,
    ),
    tasksStatusIndex: index("tasks_status_index").on(table.status),
    tasksDueDateIndex: index("tasks_due_date_index").on(table.dueDate),
    tasksCreatedAtIndex: index("tasks_created_at_index").on(table.createdAt),
  }),
);

export const taskAssignments = pgTable(
  "task_assignments",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .references(() => tasks.id)
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    status: text("status").default("ACTIVE").notNull(),
    statusUpdatedAt: timestamp("status_updated_at", {
      mode: "date",
    }).default(sql`CURRENT_TIMESTAMP`),
    statusUpdatedByUserId: integer("status_updated_by_user_id").references(
      () => users.id,
    ),
    statusNote: text("status_note"),
    note: text("note"),
    proofText: text("proof_text"),
    proofFileId: text("proof_file_id"),
    proofType: text("proof_type"),
    proofSubmittedAt: timestamp("proof_submitted_at", { mode: "date" }),
    deliveredAt: timestamp("delivered_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  },
  (table) => ({
    taskAssignmentsUserStatusIndex: index(
      "task_assignments_user_status_index",
    ).on(table.userId, table.status),
    taskAssignmentsCreatedAtIndex: index(
      "task_assignments_created_at_index",
    ).on(table.createdAt),
    taskAssignmentsTaskStatusIndex: index(
      "task_assignments_task_status_index",
    ).on(table.taskId, table.status),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  },
  (table) => ({
    sessionsTokenHashIndex: index("sessions_token_hash_index").on(
      table.tokenHash,
    ),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id").references(() => users.id),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: integer("target_id"),
    metadata: text("metadata"),
    payloadHash: text("payload_hash"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  },
  (table) => ({
    auditLogsDedupeUnique: uniqueIndex("audit_logs_dedupe_unique").on(
      table.actorId,
      table.action,
      table.payloadHash,
    ),
    auditLogsCreatedAtIndex: index("audit_logs_created_at_index").on(
      table.createdAt,
    ),
    auditLogsActorIndex: index("audit_logs_actor_index").on(table.actorId),
    auditLogsActionIndex: index("audit_logs_action_index").on(table.action),
  }),
);

export const taskEvents = pgTable(
  "task_events",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .references(() => tasks.id)
      .notNull(),
    assignmentId: integer("assignment_id")
      .references(() => taskAssignments.id)
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  },
  (table) => ({
    taskEventsTaskCreatedIndex: index("task_events_task_created_index").on(
      table.taskId,
      table.createdAt,
    ),
  }),
);

export const broadcasts = pgTable(
  "broadcasts",
  {
    id: serial("id").primaryKey(),
    createdByAdminId: integer("created_by_admin_id")
      .references(() => users.id)
      .notNull(),
    messageText: text("message_text"),
    mediaUrl: text("media_url"),
    mode: text("mode").default("copy").notNull(),
    sourceChatId: text("source_chat_id"),
    sourceMessageId: integer("source_message_id"),
    status: text("status").default("draft").notNull(),
    totalCount: integer("total_count").default(0),
    sentCount: integer("sent_count").default(0),
    failedCount: integer("failed_count").default(0),
    startedAt: timestamp("started_at", { mode: "date" }),
    finishedAt: timestamp("finished_at", { mode: "date" }),
    correlationId: text("correlation_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  },
  (table) => ({
    broadcastsStatusIndex: index("broadcasts_status_index").on(table.status),
    broadcastsCreatedAtIndex: index("broadcasts_created_at_index").on(
      table.createdAt,
    ),
  }),
);

export const broadcastLogs = pgTable(
  "broadcast_logs",
  {
    id: serial("id").primaryKey(),
    broadcastId: integer("broadcast_id")
      .references(() => broadcasts.id)
      .notNull(),
    userId: integer("user_id").references(() => users.id),
    telegramId: text("telegram_id"),
    status: text("status").default("pending").notNull(),
    attempts: integer("attempts").default(0),
    lastErrorCode: integer("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    nextAttemptAt: timestamp("next_attempt_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  },
  (table) => ({
    broadcastLogsBroadcastStatusIndex: index(
      "broadcast_logs_broadcast_status_index",
    ).on(table.broadcastId, table.status),
  }),
);

export const messageQueue = pgTable(
  "message_queue",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    userId: integer("user_id").references(() => users.id),
    telegramId: text("telegram_id"),
    payload: text("payload").notNull(),
    status: text("status").default("pending").notNull(),
    attempts: integer("attempts").default(0),
    lastErrorCode: integer("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    nextAttemptAt: timestamp("next_attempt_at", { mode: "date" }),
    deliveredAt: timestamp("delivered_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  },
  (table) => ({
    messageQueueStatusIndex: index("message_queue_status_index").on(
      table.status,
    ),
  }),
);

export const billingTransactions = pgTable(
  "billing_transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").default("UZS"),
    method: text("method").default("manual"),
    note: text("note"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  },
  (table) => ({
    billingTransactionsUserIndex: index("billing_transactions_user_index").on(
      table.userId,
    ),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  assignments: many(taskAssignments),
  createdTasks: many(tasks),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
  billingTransactions: many(billingTransactions),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  creator: one(users, {
    fields: [tasks.createdByAdminId],
    references: [users.id],
  }),
  assignments: many(taskAssignments),
  template: one(messageTemplates, {
    fields: [tasks.templateId],
    references: [messageTemplates.id],
  }),
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

export const messageTemplatesRelations = relations(
  messageTemplates,
  ({ one, many }) => ({
    creator: one(users, {
      fields: [messageTemplates.createdBy],
      references: [users.id],
    }),
    tasks: many(tasks),
  }),
);

export const billingTransactionsRelations = relations(
  billingTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [billingTransactions.userId],
      references: [users.id],
    }),
    creator: one(users, {
      fields: [billingTransactions.createdBy],
      references: [users.id],
    }),
  }),
);

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
  statusUpdatedByUserId: true,
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

export const insertMessageTemplateSchema = createInsertSchema(
  messageTemplates,
).omit({ id: true, createdAt: true, updatedAt: true });

export const insertBillingTransactionSchema = createInsertSchema(
  billingTransactions,
).omit({ id: true, createdAt: true });

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
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;
export type BillingTransaction = typeof billingTransactions.$inferSelect;
export type InsertBillingTransaction = z.infer<
  typeof insertBillingTransactionSchema
>;
