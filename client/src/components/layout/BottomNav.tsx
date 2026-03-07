import { Link, useLocation } from "wouter";
import { Home, ClipboardList, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-auth";
import { useProfileComplete } from "@/hooks/use-profile";

export function BottomNav() {
  const [location] = useLocation();
  const { data: user } = useUser();
  const { profileComplete, isLoading: isProfileLoading } = useProfileComplete();

  const isAdmin = Boolean(
    user?.isAdmin ||
    user?.role === "limited_admin" ||
    user?.role === "super_admin",
  );

  const navItems = [
    { href: "/", icon: Home, label: "Bosh sahifa" },
    { href: "/tasks", icon: ClipboardList, label: "Buyruqlar" },
    { href: "/profile", icon: User, label: "Profil" },
    ...(isAdmin ? [{ href: "/admin", icon: Shield, label: "Admin" }] : []),
  ];

  if (!user || isProfileLoading) return null;

  // Show BottomNav only for approved users or admins
  const isApproved = user.status === "approved" || isAdmin;
  if (!isApproved || (!isAdmin && !profileComplete)) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-2xl border-t border-white/5 pb-safe ring-1 ring-white/5">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-2xl transition-all duration-500 relative group",
                  isActive && "bg-primary/10",
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-110" />
                )}
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-300 relative z-10",
                    isActive
                      ? "stroke-[2.5px] scale-110"
                      : "stroke-2 group-hover:scale-110",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                  isActive
                    ? "opacity-100 translate-y-0"
                    : "opacity-60 translate-y-0.5",
                )}
              >
                {label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full blur-[2px]" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
