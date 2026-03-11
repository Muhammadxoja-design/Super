import { useUser, useLogout } from "@/hooks/use-auth";
import {
  Loader2,
  User as UserIcon,
  LogOut,
  MapPin,
  Phone,
  Briefcase,
  Palette,
  ChevronRight,
  ShieldCheck,
  Check,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/use-page-title";

const ACCENT_COLORS = [
  { id: "blue", label: "Sapphire", color: "bg-blue-500" },
  { id: "emerald", label: "Emerald", color: "bg-emerald-500" },
  { id: "rose", label: "Rose", color: "bg-rose-500" },
  { id: "amber", label: "Amber", color: "bg-amber-500" },
  { id: "violet", label: "Violet", color: "bg-violet-500" },
] as const;

export default function Profile() {
  usePageTitle("Profil — TaskBot");
  const { data: user, isLoading } = useUser();
  const logout = useLogout();
  const [, setLocation] = useLocation();
  const [accent, setAccent] = useState<string>("blue");

  useEffect(() => {
    const saved = localStorage.getItem("theme-accent") || "blue";
    setAccent(saved);
    document.documentElement.setAttribute("data-theme-accent", saved);
  }, []);

  const handleAccentChange = (id: string) => {
    setAccent(id);
    localStorage.setItem("theme-accent", id);
    document.documentElement.setAttribute("data-theme-accent", id);
  };

  if (isLoading)
    return (
      <div className="flex justify-center pt-20">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  if (!user) return null;

  const isAdmin = user.role === "super_admin" || user.role === "limited_admin";

  return (
    <div className="min-h-screen bg-background pb-24 page-enter">
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-3xl font-display font-bold mb-1">
          {user.firstName ? `${user.firstName} profili` : "Profil"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Shaxsiy ma'lumotlar, yo'nalish va ilova ko‘rinishi
        </p>
      </div>

      <div className="px-4 space-y-6">
        {/* User Card */}
        <div className="glass-card p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <UserIcon className="w-20 h-20" />
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
              <UserIcon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {user.firstName} {user.lastName}
              </h2>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-0.5">
                <span className="font-mono text-xs opacity-70">
                  ID: {user.id}
                </span>
                {isAdmin && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span className="flex items-center gap-1 text-primary font-semibold text-xs uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3" />
                      {user.role?.replace("_", " ")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-foreground/80 font-medium">
                {user.phone}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-foreground/80 font-medium">
                {user.birthDate || "Ma'lumot yo'q"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-foreground/80 font-medium">
                {user.viloyat || user.region}, {user.tuman || user.district}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-foreground/80 font-medium">
                {user.direction}
              </span>
            </div>
          </div>
        </div>

        {/* Personalization */}
        <div className="glass-card p-6 rounded-3xl border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold">Ilovaning asosiy rangi</h3>
              <p className="text-xs text-muted-foreground">
                TaskBot ko‘rinishini o‘zingizga moslang – bu faqat sizda ko‘rinadi
              </p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => handleAccentChange(c.id)}
                className={cn(
                  "relative flex flex-col items-center gap-2 group transition-all",
                  accent === c.id ? "scale-110" : "scale-100 hover:scale-105",
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all",
                    c.color,
                    accent === c.id
                      ? "ring-4 ring-white/20 ring-offset-2 ring-offset-background"
                      : "",
                  )}
                >
                  {accent === c.id && <Check className="w-6 h-6 text-white" />}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase transition-colors",
                    accent === c.id ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {c.id}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-14 rounded-2xl justify-between px-6 border-white/10 bg-secondary/30"
            onClick={() => setLocation("/register")}
          >
            <div className="flex items-center gap-3">
              <ChevronRight className="w-5 h-5 text-muted-foreground rotate-180" />
              <span className="font-semibold">Malumotlarni yangilash</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            className="w-full h-14 rounded-2xl justify-center px-6 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            {logout.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <LogOut className="w-5 h-5 mr-2" />
            )}
            Chiqish
          </Button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground py-4 uppercase tracking-[0.2em] font-semibold opacity-50">
          TaskBot Fergana v1.2.0
        </p>
      </div>
    </div>
  );
}
