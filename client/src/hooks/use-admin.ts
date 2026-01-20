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
}) {
  return useQuery({
    queryKey: [api.admin.users.list.path, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.region) params.append("region", filters.region);
      if (filters?.direction) params.append("direction", filters.direction);
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

export function useAdminTasks(status?: string, search?: string) {
  return useQuery({
    queryKey: [api.admin.tasks.list.path, status, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (search) params.append("search", search);
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
      const res = await fetch(api.admin.tasks.create.path, {
        method: api.admin.tasks.create.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
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
      userId,
      region,
      direction,
    }: {
      taskId: number;
      userId?: number;
      region?: string;
      direction?: string;
    }) => {
      const url = buildUrl(api.admin.tasks.assign.path, { id: taskId });
      const res = await fetch(url, {
        method: api.admin.tasks.assign.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, region, direction }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to assign task");
      return api.admin.tasks.assign.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.tasks.list.path] });
    },
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
