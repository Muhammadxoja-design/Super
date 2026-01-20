import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { TASK_STATUSES } from "@shared/schema";

export function useTasks() {
  return useQuery({
    queryKey: [api.tasks.list.path],
    queryFn: async () => {
      const res = await fetch(api.tasks.list.path, {
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
      const url = buildUrl(api.tasks.updateStatus.path, { assignmentId });
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
