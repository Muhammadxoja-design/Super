import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { getAuthHeaders } from "@/lib/queryClient";

// Get users list (admin)
export function useAdminUsers(status?: 'pending' | 'approved' | 'rejected' | 'all') {
  return useQuery({
    queryKey: [api.admin.users.list.path, status],
    queryFn: async () => {
      const url = status 
        ? `${api.admin.users.list.path}?status=${status}` 
        : api.admin.users.list.path;
        
      const res = await fetch(url, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Access denied");
        throw new Error("Failed to fetch users");
      }
      return api.admin.users.list.responses[200].parse(await res.json());
    },
  });
}

// Approve/Reject user
export function useApproveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approved, reason }: { id: number; approved: boolean; reason?: string }) => {
      const url = buildUrl(api.admin.users.approve.path, { id });
      const res = await fetch(url, {
        method: api.admin.users.approve.method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ approved, reason }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to process user application");
      return api.admin.users.approve.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.list.path] });
    },
  });
}
