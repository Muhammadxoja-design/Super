import { Menu } from "lucide-react";
import { useUser } from "@/hooks/use-auth";

export function OverviewHeader() {
  const { data: user } = useUser();
  const displayName = user?.firstName || user?.username || "Admin";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
          <span className="font-display font-bold text-white text-lg tracking-tighter">AG</span>
          <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background bg-green-500"></div>
        </div>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-white/90">Antigravity</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest text-violet-400">Hub</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col text-right mr-2">
          <span className="text-sm font-semibold text-white/90">{displayName}</span>
          <span className="text-[10px] uppercase tracking-wider text-green-400/80 font-medium">Super Admin</span>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md overflow-hidden ring-1 ring-white/5 transition-all hover:bg-white/10">
          <span className="font-medium text-sm text-zinc-300">{initial}</span>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
          <Menu className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
