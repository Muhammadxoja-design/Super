import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useTelegramLogin, useUser } from "@/hooks/use-auth";

import Welcome from "@/pages/Welcome";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";
import { BottomNav } from "@/components/layout/BottomNav";

function AuthWrapper() {
  const [location] = useLocation();
  const [isInitializing, setIsInitializing] = useState(true);
  const { data: user, isLoading: isUserLoading } = useUser({
    enabled: !isInitializing,
  });
  const login = useTelegramLogin();
  const subscriptionRequired = Boolean(
    (user as any)?.__subscriptionRequired,
  );
  const subscriptionChannels = (user as any)?.channels || [];
  const effectiveUser = subscriptionRequired ? null : user;

  const isAdmin = Boolean(
    effectiveUser?.isAdmin ||
      effectiveUser?.role === "admin" ||
      effectiveUser?.role === "super_admin",
  );
  const profileComplete = Boolean(
    effectiveUser?.firstName &&
      effectiveUser?.lastName &&
      effectiveUser?.phone &&
      (effectiveUser?.viloyat || effectiveUser?.region) &&
      (effectiveUser?.tuman || effectiveUser?.district || effectiveUser?.shahar) &&
      effectiveUser?.mahalla &&
      effectiveUser?.address &&
      effectiveUser?.direction &&
      effectiveUser?.birthDate
  );
  const needsRegistration = Boolean(effectiveUser && !isAdmin && !profileComplete);
  const isApproved = Boolean(isAdmin || effectiveUser?.status === "approved");

  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;

    if (initData) {
      login.mutate(initData, {
        onSettled: () => setIsInitializing(false),
      });
    } else {
      setIsInitializing(false);
    }

    window.Telegram?.WebApp?.expand();
    window.Telegram?.WebApp?.ready();
  }, []);

  if (isInitializing || isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm font-medium animate-pulse">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (subscriptionRequired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-2xl font-bold">Obuna talab qilinadi</div>
          <p className="text-sm text-muted-foreground">
            Bot va Web Appdan foydalanish uchun quyidagi kanallarga obuna bo'ling.
            So'ngra Web Appni qayta oching.
          </p>
          {subscriptionChannels.length > 0 && (
            <div className="flex flex-col gap-2">
              {subscriptionChannels.map((channel: any) => (
                channel.url ? (
                  <a
                    key={channel.id}
                    href={channel.url}
                    className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
                  >
                    {channel.label || channel.id}
                  </a>
                ) : (
                  <div
                    key={channel.id}
                    className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground"
                  >
                    {channel.label || channel.id}
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Switch>
        <Route path="/register">
          <Register />
        </Route>

        <Route path="/">
          {!effectiveUser ? <Welcome /> : <Dashboard />}
        </Route>

        <Route path="/tasks">
          {!effectiveUser || !isApproved ? <Dashboard /> : <Tasks />}
        </Route>

        <Route path="/profile">
          {!effectiveUser || !isApproved ? <Dashboard /> : <Profile />}
        </Route>

        <Route path="/admin">
          {!effectiveUser ? <Welcome /> : isAdmin ? <Admin /> : <Dashboard />}
        </Route>

        <Route component={NotFound} />
      </Switch>

      {effectiveUser &&
        location !== "/register" &&
        !needsRegistration && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthWrapper />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
