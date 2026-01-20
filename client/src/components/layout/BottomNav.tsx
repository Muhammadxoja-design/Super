import { Link, useLocation } from "wouter";
import { Home, ClipboardList, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-auth";

export function BottomNav() {
  const [location] = useLocation();
  const { data: user } = useUser();

  const isAdmin = user?.isAdmin;
  const profileComplete = Boolean(
    user?.firstName &&
      user?.lastName &&
      user?.phone &&
      user?.region &&
      user?.district &&
      user?.mahalla &&
      user?.address &&
      user?.direction &&
      user?.birthDate
  );

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/tasks", icon: ClipboardList, label: "Tasks" },
    { href: "/profile", icon: User, label: "Profile" },
    ...(isAdmin ? [{ href: "/admin", icon: Shield, label: "Admin" }] : []),
  ];

  if (!user) return null;
  if (!isAdmin && (!profileComplete || user.status !== "approved")) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border/50 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href} className="flex-1">
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-300 cursor-pointer",
                  isActive
                    ? "text-primary scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-all duration-300",
                    isActive && "bg-primary/10 shadow-[0_0_15px_-3px_rgba(var(--primary),0.3)]"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
