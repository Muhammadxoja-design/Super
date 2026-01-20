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
  const { data: user, isLoading: isUserLoading } = useUser();
  const login = useTelegramLogin();
  const [isInitializing, setIsInitializing] = useState(true);

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

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Switch>
        <Route path="/register">
          <Register />
        </Route>

        <Route path="/">
          {!user ? <Welcome /> : <Dashboard />}
        </Route>

        <Route path="/tasks">
          {!user ? <Welcome /> : <Tasks />}
        </Route>

        <Route path="/profile">
          {!user ? <Welcome /> : <Profile />}
        </Route>

        <Route path="/admin">
          {!user ? <Welcome /> : user.isAdmin ? <Admin /> : <Dashboard />}
        </Route>

        <Route component={NotFound} />
      </Switch>

      {user && location !== "/register" && <BottomNav />}
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
