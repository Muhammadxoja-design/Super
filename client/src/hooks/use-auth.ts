import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type RegisterUserRequest } from "@shared/routes";
import { getAuthHeaders } from "@/lib/queryClient";

// Hook to check current user session
export function useUser() {
  const token =
    typeof window === "undefined" ? null : window.localStorage.getItem("authToken");
  return useQuery({
    queryKey: [api.auth.me.path],
    enabled: Boolean(token),
    initialData: null,
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.auth.me.responses[200].parse(await res.json());
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to login with Telegram initData
export function useTelegramLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (initData: string) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized Telegram session");
        throw new Error("Login failed");
      }
      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      window.localStorage.setItem("authToken", data.token);
      // Update the 'user' query with the returned user data
      queryClient.setQueryData([api.auth.me.path], data.user);
      // Optionally store token if your API requires Bearer header, 
      // but 'credentials: include' implies cookie-based session which is safer.
      // Assuming cookie-based for this implementation.
    },
  });
}

// Hook to register a new user
export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<RegisterUserRequest, "telegramId">) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }
      return api.auth.register.responses[200].parse(await res.json());
    },
    onSuccess: (newUser) => {
      queryClient.setQueryData([api.auth.me.path], newUser);
    },
  });
}
