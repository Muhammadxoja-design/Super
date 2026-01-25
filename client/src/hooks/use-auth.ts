import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useUser(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [api.auth.me.path],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, {
        credentials: "include",
      });
      if (res.status === 401) return null;
      if (res.status === 403) {
        const payload = await res.json().catch(() => null);
        if (payload?.code === "SUBSCRIPTION_REQUIRED") {
          return {
            __subscriptionRequired: true,
            channels: payload.missingChannels || [],
          } as any;
        }
        throw new Error(payload?.message || "Forbidden");
      }
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.auth.me.responses[200].parse(await res.json());
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTelegramLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (initData: string) => {
      const res = await fetch(api.auth.telegram.path, {
        method: api.auth.telegram.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 403) {
          const payload = await res.json().catch(() => null);
          if (payload?.code === "SUBSCRIPTION_REQUIRED") {
            return {
              __subscriptionRequired: true,
              channels: payload.missingChannels || [],
            } as any;
          }
          throw new Error(payload?.message || "Login failed");
        }
        if (res.status === 401) throw new Error("Unauthorized Telegram session");
        throw new Error("Login failed");
      }
      return api.auth.telegram.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      if ((data as any)?.__subscriptionRequired) {
        queryClient.setQueryData([api.auth.me.path], data as any);
        return;
      }
      queryClient.setQueryData([api.auth.me.path], (data as any).user);
    },
  });
}

export function usePasswordLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ login, password }: { login: string; password: string }) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 403) {
          const payload = await res.json().catch(() => null);
          if (payload?.code === "SUBSCRIPTION_REQUIRED") {
            return {
              __subscriptionRequired: true,
              channels: payload.missingChannels || [],
            } as any;
          }
          throw new Error(payload?.message || "Login failed");
        }
        const error = await res.json();
        throw new Error(error.message || "Login failed");
      }
      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      if ((data as any)?.__subscriptionRequired) {
        queryClient.setQueryData([api.auth.me.path], data as any);
        return;
      }
      queryClient.setQueryData([api.auth.me.path], (data as any).user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
      return api.auth.logout.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      login: string;
      password: string;
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      birthDate?: string | null;
      region?: string | null;
      district?: string | null;
      mahalla?: string | null;
      address?: string | null;
      direction?: string | null;
    }) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 403) {
          const payload = await res.json().catch(() => null);
          if (payload?.code === "SUBSCRIPTION_REQUIRED") {
            return {
              __subscriptionRequired: true,
              channels: payload.missingChannels || [],
            } as any;
          }
          throw new Error(payload?.message || "Registration failed");
        }
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }
      return api.auth.register.responses[200].parse(await res.json());
    },
    onSuccess: (newUser) => {
      if ((newUser as any)?.__subscriptionRequired) {
        queryClient.setQueryData([api.auth.me.path], newUser as any);
        return;
      }
      queryClient.setQueryData([api.auth.me.path], newUser as any);
    },
  });
}
