import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { TASK_STATUSES } from "@shared/schema";

export function useTasks(options?: { enabled?: boolean; status?: (typeof TASK_STATUSES)[number] }) {
  return useQuery({
    queryKey: [api.tasks.list.path, options?.status],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.status) params.append("status", options.status);
      const url = params.toString()
        ? `${api.tasks.list.path}?${params.toString()}`
        : api.tasks.list.path;
      const res = await fetch(url, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return api.tasks.list.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignmentId,
      status,
      note,
    }: {
      assignmentId: number;
      status: (typeof TASK_STATUSES)[number];
      note?: string;
    }) => {
      const url = buildUrl(api.tasks.updateStatus.path, { id: assignmentId });
      const res = await fetch(url, {
        method: api.tasks.updateStatus.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, note }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update task status");
      return api.tasks.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId }: { assignmentId: number }) => {
      const url = buildUrl(api.tasks.complete.path, { id: assignmentId });
      const res = await fetch(url, {
        method: api.tasks.complete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to complete task");
      return api.tasks.complete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
    },
  });
}
