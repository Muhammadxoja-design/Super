import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useAdminUsers() {
  return useQuery({
    queryKey: [api.admin.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.admin.users.list.path, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Access denied");
        throw new Error("Failed to fetch users");
      }
      return api.admin.users.list.responses[200].parse(await res.json());
    },
  });
}

export function useAdminUsersFiltered(filters?: {
  status?: string;
  region?: string;
  direction?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: [api.admin.users.list.path, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.region) params.append("region", filters.region);
      if (filters?.direction) params.append("direction", filters.direction);
      if (filters?.search) params.append("search", filters.search);
      if (filters?.limit !== undefined) params.append("limit", String(filters.limit));
      if (filters?.offset !== undefined) params.append("offset", String(filters.offset));
      const url = params.toString()
        ? `${api.admin.users.list.path}?${params.toString()}`
        : api.admin.users.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.admin.users.list.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      status,
      rejectionReason,
    }: {
      userId: number;
      status: string;
      rejectionReason?: string;
    }) => {
      const url = buildUrl(api.admin.users.updateStatus.path, { id: userId });
      const res = await fetch(url, {
        method: api.admin.users.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update user status");
      return api.admin.users.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.list.path] });
    },
  });
}

export function useAdminTasks(
  status?: string,
  search?: string,
  limit?: number,
  offset?: number,
) {
  return useQuery({
    queryKey: [api.admin.tasks.list.path, status, search, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (search) params.append("search", search);
      if (limit !== undefined) params.append("limit", String(limit));
      if (offset !== undefined) params.append("offset", String(offset));
      const url = params.toString()
        ? `${api.admin.tasks.list.path}?${params.toString()}`
        : api.admin.tasks.list.path;
      const res = await fetch(url, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return api.admin.tasks.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string | null }) => {
      const payload = { ...data, idempotencyKey: crypto.randomUUID() };
      const res = await fetch(api.admin.tasks.create.path, {
        method: api.admin.tasks.create.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create task");
      return api.admin.tasks.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.tasks.list.path] });
    },
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      targetType,
      targetValue,
      userId,
      forwardMessageId,
      templateId,
    }: {
      taskId: number;
      targetType: string;
      targetValue?: string;
      userId?: number;
      forwardMessageId?: number;
      templateId?: number;
    }) => {
      const url = buildUrl(api.admin.tasks.assign.path, { id: taskId });
      const res = await fetch(url, {
        method: api.admin.tasks.assign.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetType,
          targetValue,
          userId,
          forwardMessageId,
          templateId,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || "Failed to assign task");
      }
      return api.admin.tasks.assign.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.tasks.list.path] });
    },
  });
}

export function usePreviewTaskTarget() {
  return useMutation({
    mutationFn: async (payload: {
      targetType: string;
      targetValue?: string;
      userId?: number;
    }) => {
      const res = await fetch(api.admin.tasks.previewTarget.path, {
        method: api.admin.tasks.previewTarget.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to preview target");
      }
      return api.admin.tasks.previewTarget.responses[200].parse(await res.json());
    },
  });
}

export function useAdminUserSearch(filters?: {
  q?: string;
  status?: string;
  viloyat?: string;
  tuman?: string;
  shahar?: string;
  mahalla?: string;
  direction?: string;
  lastActiveAfter?: string;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [api.admin.users.search.path, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.q) params.append("q", filters.q);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.viloyat) params.append("viloyat", filters.viloyat);
      if (filters?.tuman) params.append("tuman", filters.tuman);
      if (filters?.shahar) params.append("shahar", filters.shahar);
      if (filters?.mahalla) params.append("mahalla", filters.mahalla);
      if (filters?.direction) params.append("direction", filters.direction);
      if (filters?.lastActiveAfter) params.append("lastActiveAfter", filters.lastActiveAfter);
      if (filters?.sort) params.append("sort", filters.sort);
      if (filters?.page !== undefined) params.append("page", String(filters.page));
      if (filters?.limit !== undefined) params.append("limit", String(filters.limit));
      const url = params.toString()
        ? `${api.admin.users.search.path}?${params.toString()}`
        : api.admin.users.search.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to search users");
      return api.admin.users.search.responses[200].parse(await res.json());
    },
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: [api.admin.templates.list.path],
    queryFn: async () => {
      const res = await fetch(api.admin.templates.list.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return api.admin.templates.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title?: string; body: string; isActive?: boolean }) => {
      const res = await fetch(api.admin.templates.create.path, {
        method: api.admin.templates.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create template");
      return api.admin.templates.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.templates.list.path] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: number;
      title?: string;
      body?: string;
      isActive?: boolean;
    }) => {
      const url = buildUrl(api.admin.templates.update.path, { id });
      const res = await fetch(url, {
        method: api.admin.templates.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update template");
      return api.admin.templates.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.templates.list.path] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.admin.templates.delete.path, { id });
      const res = await fetch(url, {
        method: api.admin.templates.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete template");
      return api.admin.templates.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.templates.list.path] });
    },
  });
}

export function useSetPro() {
  return useMutation({
    mutationFn: async (payload: {
      userId: number;
      days: number;
      note?: string;
      amount?: number;
      currency?: string;
    }) => {
      const res = await fetch(api.superadmin.billing.setPro.path, {
        method: api.superadmin.billing.setPro.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to set PRO");
      return api.superadmin.billing.setPro.responses[200].parse(await res.json());
    },
  });
}

export function useBillingTransactions(userId?: number) {
  return useQuery({
    queryKey: [api.superadmin.billing.transactions.path, userId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userId) params.append("userId", String(userId));
      const url = params.toString()
        ? `${api.superadmin.billing.transactions.path}?${params.toString()}`
        : api.superadmin.billing.transactions.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch billing transactions");
      return api.superadmin.billing.transactions.responses[200].parse(await res.json());
    },
    enabled: Boolean(userId),
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: [api.admin.auditLogs.list.path],
    queryFn: async () => {
      const res = await fetch(api.admin.auditLogs.list.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return api.admin.auditLogs.list.responses[200].parse(await res.json());
    },
  });
}

export function useBroadcasts(filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: [api.admin.broadcasts.list.path, filters],
    refetchInterval: 5000,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.limit !== undefined) params.append("limit", String(filters.limit));
      if (filters?.offset !== undefined) params.append("offset", String(filters.offset));
      const url = params.toString()
        ? `${api.admin.broadcasts.list.path}?${params.toString()}`
        : api.admin.broadcasts.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch broadcasts");
      return api.admin.broadcasts.list.responses[200].parse(await res.json());
    },
  });
}

export function useBroadcastPreview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      messageText: string;
      mediaUrl?: string;
      sourceMessageId?: number;
    }) => {
      const res = await fetch(api.admin.broadcasts.preview.path, {
        method: api.admin.broadcasts.preview.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to preview broadcast");
      }
      return api.admin.broadcasts.preview.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.broadcasts.list.path] });
    },
  });
}

export function useBroadcastConfirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (broadcastId: number) => {
      const url = buildUrl(api.admin.broadcasts.confirm.path, { id: broadcastId });
      const res = await fetch(url, {
        method: api.admin.broadcasts.confirm.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to confirm broadcast");
      return api.admin.broadcasts.confirm.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.broadcasts.list.path] });
    },
  });
}

export function useBroadcastProgress(broadcastId?: number) {
  return useQuery({
    queryKey: [api.admin.broadcasts.progress.path, broadcastId],
    enabled: Boolean(broadcastId),
    queryFn: async () => {
      const url = buildUrl(api.admin.broadcasts.progress.path, { id: broadcastId as number });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch broadcast progress");
      return api.admin.broadcasts.progress.responses[200].parse(await res.json());
    },
    refetchInterval: 2000,
  });
}
