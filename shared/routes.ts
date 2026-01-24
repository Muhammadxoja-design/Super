import { z } from "zod";
import {
  insertTaskSchema,
  insertUserSchema,
  taskAssignments,
  tasks,
  users,
  TASK_STATUSES,
  USER_STATUSES,
  auditLogs,
  messageTemplates,
  billingTransactions,
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function paginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number(),
    pageSize: z.number(),
    total: z.coerce.number(),
    totalPages: z.coerce.number(),
  });
}

const passwordSchema = z
  .string()
  .min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak");

const loginSchema = z
  .string()
  .min(3, "Login kamida 3 ta belgidan iborat bo'lishi kerak");

export const api = {
  auth: {
    telegram: {
      method: "POST" as const,
      path: "/api/auth/telegram",
      input: z.object({
        initData: z.string(),
      }),
      responses: {
        200: z.object({
          user: z.custom<typeof users.$inferSelect>(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    login: {
      method: "POST" as const,
      path: "/api/auth/login",
      input: z.object({
        login: loginSchema,
        password: passwordSchema,
      }),
      responses: {
        200: z.object({
          user: z.custom<typeof users.$inferSelect>(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout",
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    register: {
      method: "POST" as const,
      path: "/api/auth/register",
      input: insertUserSchema
        .omit({
          telegramId: true,
          passwordHash: true,
          isAdmin: true,
          role: true,
          plan: true,
          proUntil: true,
          status: true,
          telegramStatus: true,
          lastSeen: true,
          lastActive: true,
          rejectionReason: true,
          createdAt: true,
          updatedAt: true,
        })
        .extend({
          login: loginSchema,
          password: passwordSchema,
        }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/me",
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  tasks: {
    list: {
      method: "GET" as const,
      path: "/api/tasks",
      input: z
        .object({
          status: z.enum(TASK_STATUSES).optional(),
        })
        .optional(),
      responses: {
        200: z.array(
          z.object({
            assignment: z.custom<typeof taskAssignments.$inferSelect>(),
            task: z.custom<typeof tasks.$inferSelect>(),
          })
        ),
        401: errorSchemas.unauthorized,
      },
    },
    updateStatus: {
      method: "PATCH" as const,
      path: "/api/tasks/:id/status",
      input: z.object({
        status: z.enum(TASK_STATUSES),
        note: z.string().optional(),
        proofText: z.string().min(5).optional(),
        proofFileId: z.string().optional(),
        proofType: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof taskAssignments.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    complete: {
      method: "POST" as const,
      path: "/api/tasks/:id/complete",
      responses: {
        200: z.custom<typeof taskAssignments.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  admin: {
    tasks: {
      create: {
        method: "POST" as const,
        path: "/api/admin/tasks",
        input: insertTaskSchema
          .omit({ createdByAdminId: true })
          .extend({ idempotencyKey: z.string().uuid() }),
        responses: {
          201: z.custom<typeof tasks.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      previewTarget: {
        method: "POST" as const,
        path: "/api/admin/tasks/preview-target",
        input: z.object({
          targetType: z.enum([
            "USER",
            "DIRECTION",
            "VILOYAT",
            "TUMAN",
            "SHAHAR",
            "MAHALLA",
            "ALL",
          ]),
          targetValue: z.string().optional(),
          userId: z.number().optional(),
        }),
        responses: {
          200: z.object({
            count: z.number(),
            sample: z.array(z.custom<typeof users.$inferSelect>()),
          }),
        },
      },
      assign: {
        method: "POST" as const,
        path: "/api/admin/tasks/:id/assign",
        input: z.object({
          targetType: z.enum([
            "USER",
            "DIRECTION",
            "VILOYAT",
            "TUMAN",
            "SHAHAR",
            "MAHALLA",
            "ALL",
          ]),
          targetValue: z.string().optional(),
          userId: z.number().optional(),
          forwardMessageId: z.number().optional(),
          templateId: z.number().optional(),
        }),
        responses: {
          201: z.object({
            assigned: z.number(),
            assignments: z.array(z.custom<typeof taskAssignments.$inferSelect>()),
          }),
          404: errorSchemas.notFound,
        },
      },
      list: {
        method: "GET" as const,
        path: "/api/admin/tasks",
        input: z.object({
          status: z.enum(TASK_STATUSES).optional(),
          search: z.string().optional(),
          limit: z.coerce.number().optional(),
          offset: z.coerce.number().optional(),
        }),
        responses: {
          200: z.object({
            tasks: z.array(
              z.object({
                task: z.custom<typeof tasks.$inferSelect>(),
                assignments: z.array(
                  z.object({
                    assignment: z.custom<typeof taskAssignments.$inferSelect>(),
                    user: z.custom<typeof users.$inferSelect>(),
                  })
                ),
              })
            ),
            stats: z.object({
              total: z.number(),
              done: z.number(),
              willDo: z.number(),
              cannotDo: z.number(),
              pending: z.number(),
              active: z.number(),
              completionRate: z.number(),
            }),
          }),
        },
      },
    },
    users: {
      list: {
        method: "GET" as const,
        path: "/api/admin/users",
        input: z
          .object({
            q: z.string().optional(),
            status: z.enum(USER_STATUSES).optional(),
            viloyat: z.string().optional(),
            tuman: z.string().optional(),
            shahar: z.string().optional(),
            mahalla: z.string().optional(),
            direction: z.string().optional(),
            lastActiveAfter: z.string().optional(),
            sort: z.string().optional(),
            page: z.coerce.number().optional(),
            pageSize: z.coerce.number().optional(),
            // legacy params
            search: z.string().optional(),
            region: z.string().optional(),
            district: z.string().optional(),
            limit: z.coerce.number().optional(),
            offset: z.coerce.number().optional(),
          })
          .optional(),
        responses: {
          200: paginatedSchema(z.custom<typeof users.$inferSelect>()),
          400: errorSchemas.validation,
        },
      },
      search: {
        method: "GET" as const,
        path: "/api/admin/users/search",
        input: z
          .object({
            q: z.string().optional(),
            status: z.enum(USER_STATUSES).optional(),
            viloyat: z.string().optional(),
            tuman: z.string().optional(),
            shahar: z.string().optional(),
            mahalla: z.string().optional(),
            direction: z.string().optional(),
            lastActiveAfter: z.string().optional(),
            sort: z.string().optional(),
            page: z.coerce.number().optional(),
            pageSize: z.coerce.number().optional(),
            limit: z.coerce.number().optional(),
          })
          .optional(),
        responses: {
          200: paginatedSchema(z.custom<typeof users.$inferSelect>()),
        },
      },
      updateStatus: {
        method: "POST" as const,
        path: "/api/admin/users/:id/status",
        input: z.object({
          status: z.enum(USER_STATUSES),
          rejectionReason: z.string().optional(),
        }),
        responses: {
          200: z.custom<typeof users.$inferSelect>(),
          404: errorSchemas.notFound,
        },
      },
    },
    auditLogs: {
      list: {
        method: "GET" as const,
        path: "/api/admin/audit-logs",
        responses: {
          200: z.array(z.custom<typeof auditLogs.$inferSelect>()),
        },
      },
    },
    templates: {
      list: {
        method: "GET" as const,
        path: "/api/admin/templates",
        responses: {
          200: z.array(z.custom<typeof messageTemplates.$inferSelect>()),
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/admin/templates",
        input: z.object({
          title: z.string().optional(),
          body: z.string().min(1),
          isActive: z.boolean().optional(),
        }),
        responses: {
          201: z.custom<typeof messageTemplates.$inferSelect>(),
        },
      },
      update: {
        method: "PATCH" as const,
        path: "/api/admin/templates/:id",
        input: z.object({
          title: z.string().optional(),
          body: z.string().min(1).optional(),
          isActive: z.boolean().optional(),
        }),
        responses: {
          200: z.custom<typeof messageTemplates.$inferSelect>(),
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/admin/templates/:id",
        responses: {
          200: z.object({ message: z.string() }),
        },
      },
    },
    broadcasts: {
      preview: {
        method: "POST" as const,
        path: "/api/admin/broadcasts/preview",
        input: z.object({
          messageText: z.string().min(1),
          mediaUrl: z.string().url().optional(),
          sourceMessageId: z.number().optional(),
        }),
        responses: {
          200: z.object({
            id: z.number(),
            totalCount: z.number(),
            status: z.string(),
          }),
        },
      },
      confirm: {
        method: "POST" as const,
        path: "/api/admin/broadcasts/:id/confirm",
        responses: {
          200: z.object({
            id: z.number(),
            status: z.string(),
            totalCount: z.number(),
          }),
        },
      },
      list: {
        method: "GET" as const,
        path: "/api/admin/broadcasts",
        input: z.object({
          status: z.string().optional(),
          limit: z.coerce.number().optional(),
          offset: z.coerce.number().optional(),
        }),
        responses: {
          200: z.array(z.custom<any>()),
        },
      },
      progress: {
        method: "GET" as const,
        path: "/api/admin/broadcasts/:id/progress",
        responses: {
          200: z.object({
            id: z.number(),
            sentCount: z.number(),
            failedCount: z.number(),
            totalCount: z.number(),
            status: z.string(),
          }),
        },
      },
    },
    metrics: {
      broadcasts: {
        method: "GET" as const,
        path: "/api/admin/metrics/broadcasts",
        responses: {
          200: z.object({
            totalBroadcasts: z.number(),
            lastDurationSeconds: z.number().nullable(),
            lastThroughput: z.number().nullable(),
            failReasons: z.record(z.string(), z.number()),
          }),
        },
      },
    },
  },
  superadmin: {
    billing: {
      setPro: {
        method: "POST" as const,
        path: "/api/superadmin/billing/set-pro",
        input: z.object({
          userId: z.number(),
          days: z.number().min(1),
          note: z.string().optional(),
          amount: z.number().optional(),
          currency: z.string().optional(),
        }),
        responses: {
          200: z.custom<typeof users.$inferSelect>(),
        },
      },
      transactions: {
        method: "GET" as const,
        path: "/api/superadmin/billing/transactions",
        input: z
          .object({
            userId: z.coerce.number().optional(),
          })
          .optional(),
        responses: {
          200: z.array(z.custom<typeof billingTransactions.$inferSelect>()),
        },
      },
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
