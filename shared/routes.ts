
import { z } from 'zod';
import { insertUserSchema, insertTaskSchema, users, tasks } from './schema';

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

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/telegram',
      input: z.object({
        initData: z.string(),
      }),
      responses: {
        200: z.object({
          token: z.string(),
          user: z.custom<typeof users.$inferSelect>(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/me',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema.omit({ telegramId: true }), // telegramId comes from session/token
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  tasks: {
    list: {
      method: 'GET' as const,
      path: '/api/tasks',
      responses: {
        200: z.array(z.custom<typeof tasks.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    complete: {
      method: 'POST' as const,
      path: '/api/tasks/:id/complete',
      input: z.object({ completed: z.boolean() }),
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  admin: {
    users: {
      list: {
        method: 'GET' as const,
        path: '/api/admin/users',
        input: z.object({
          status: z.enum(['pending', 'approved', 'rejected', 'all']).optional(),
        }).optional(),
        responses: {
          200: z.array(z.custom<typeof users.$inferSelect>()),
          403: errorSchemas.forbidden,
        },
      },
      approve: {
        method: 'POST' as const,
        path: '/api/admin/users/:id/approve',
        input: z.object({
          approved: z.boolean(),
          reason: z.string().optional(),
        }),
        responses: {
          200: z.custom<typeof users.$inferSelect>(),
          404: errorSchemas.notFound,
        },
      },
    },
    tasks: {
      create: {
        method: 'POST' as const,
        path: '/api/admin/tasks',
        input: insertTaskSchema,
        responses: {
          201: z.custom<typeof tasks.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
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
