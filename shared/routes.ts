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
          status: true,
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
      method: "POST" as const,
      path: "/api/tasks/:assignmentId/status",
      input: z.object({
        status: z.enum(TASK_STATUSES),
        note: z.string().optional(),
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
        input: insertTaskSchema.omit({ createdByAdminId: true }),
        responses: {
          201: z.custom<typeof tasks.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      assign: {
        method: "POST" as const,
        path: "/api/admin/tasks/:id/assign",
        input: z.object({
          userId: z.number().optional(),
          region: z.string().optional(),
          direction: z.string().optional(),
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
              inProgress: z.number(),
              accepted: z.number(),
              rejected: z.number(),
              pending: z.number(),
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
            status: z.enum(USER_STATUSES).optional(),
            region: z.string().optional(),
            direction: z.string().optional(),
            search: z.string().optional(),
          })
          .optional(),
        responses: {
          201: z.custom<typeof tasks.$inferSelect>(),
          400: errorSchemas.validation,
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
          201: z.object({
            assigned: z.number(),
            assignments: z.array(z.custom<typeof taskAssignments.$inferSelect>()),
          }),
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
