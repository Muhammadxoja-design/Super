// ─────────────────────────────────────────────────────────
//  BotHeader.tsx  —  Top Bar with Search, Status & Avatar
// ─────────────────────────────────────────────────────────
import { Bell, Search, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface BotHeaderProps {
  title?: string;
  subtitle?: string;
  isOnline?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function BotHeader({
  title = "Bot Dashboard",
  subtitle = "Real-time monitoring & kontroli",
  isOnline = true,
  onRefresh,
  isRefreshing = false,
}: BotHeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-4 px-6 py-3.5 border-b border-white/[0.06]"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,15,30,0.98) 0%, rgba(10,15,30,0.85) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Page Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold text-white leading-tight truncate font-display">
          {title}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
      </div>

      {/* Search */}
      <div
        className={cn(
          "hidden sm:flex items-center gap-2 rounded-xl border px-3 py-2 transition-all duration-200",
          searchFocused
            ? "border-indigo-500/50 bg-indigo-500/[0.07] w-56"
            : "border-white/[0.06] bg-white/[0.03] w-44"
        )}
      >
        <Search
          size={14}
          className={cn(
            "flex-shrink-0 transition-colors",
            searchFocused ? "text-indigo-400" : "text-slate-500"
          )}
        />
        <input
          id="header-search"
          type="text"
          placeholder="Qidirish..."
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full bg-transparent text-xs text-white placeholder:text-slate-600 outline-none"
        />
      </div>

      {/* Connection Status */}
      <div
        className={cn(
          "hidden md:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide border",
          isOnline
            ? "text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20"
            : "text-red-400 bg-red-400/[0.08] border-red-400/20"
        )}
      >
        {isOnline ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </>
        ) : (
          <>
            <WifiOff size={10} />
            OFFLINE
          </>
        )}
      </div>

      {/* Refresh */}
      <button
        id="header-refresh"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center justify-center w-8 h-8 rounded-xl border border-white/[0.06] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] hover:border-white/10 transition-all disabled:opacity-40"
      >
        <RefreshCw
          size={14}
          className={cn(isRefreshing && "animate-spin")}
        />
      </button>

      {/* Notifications */}
      <button
        id="header-notifications"
        className="relative flex items-center justify-center w-8 h-8 rounded-xl border border-white/[0.06] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] hover:border-white/10 transition-all"
      >
        <Bell size={14} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
      </button>

      {/* Avatar */}
      <div className="flex items-center gap-2 pl-2 border-l border-white/[0.06]">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white shadow-lg shadow-indigo-500/20">
          BA
        </div>
      </div>
    </header>
  );
}
