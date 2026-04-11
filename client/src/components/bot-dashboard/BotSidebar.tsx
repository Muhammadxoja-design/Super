// ─────────────────────────────────────────────────────
//  BotSidebar.tsx  —  Premium Glassmorphism Sidebar
// ─────────────────────────────────────────────────────
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Bot,
  FileText,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Database,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string | number;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/bot-dashboard" },
  { icon: Bot,             label: "Botlar",    href: "/bot-dashboard/bots" },
  { icon: FileText,        label: "Loglar",    href: "/bot-dashboard/logs" },
  { icon: Activity,        label: "Monitoring",href: "/bot-dashboard/monitoring" },
  { icon: Database,        label: "Baza",      href: "/bot-dashboard/database" },
  { icon: Cpu,             label: "Navbat",    href: "/bot-dashboard/queue" },
  { icon: Settings,        label: "Sozlamalar",href: "/bot-dashboard/settings" },
];

interface BotSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function BotSidebar({ collapsed = false, onToggle }: BotSidebarProps) {
  const [location] = useLocation();

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen transition-all duration-300 ease-in-out",
        "border-r border-white/[0.06]",
        // Glassmorphism sidebar background
        "bg-[#0a0f1e]/90 backdrop-blur-2xl",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}
      style={{
        boxShadow: "inset -1px 0 0 rgba(99,102,241,0.08), 4px 0 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Ambient gradient blob */}
      <div
        className="absolute top-0 left-0 w-full h-48 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.18) 0%, transparent 70%)",
        }}
      />

      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {/* Online pulse */}
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0f1e] animate-pulse" />
        </div>

        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight font-display">BotControl</p>
            <p className="text-[10px] text-indigo-400/80 font-medium tracking-widest uppercase">
              Automation Hub
            </p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const active = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <a
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  collapsed && "justify-center px-2",
                  active
                    ? "text-white bg-gradient-to-r from-indigo-600/30 to-purple-600/10 border border-indigo-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500" />
                )}
                <Icon
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    active ? "text-indigo-400 w-4.5 h-4.5" : "w-4 h-4 group-hover:text-slate-200"
                  )}
                  size={18}
                />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    {item.badge}
                  </span>
                )}
                {/* Tooltip on collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-3 hidden group-hover:flex items-center z-50">
                    <div className="bg-[#1e2749] border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-xl">
                      {item.label}
                    </div>
                  </div>
                )}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-2 pb-4 border-t border-white/[0.06] pt-3">
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all text-sm font-medium",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <>
              <ChevronLeft size={16} />
              <span>Yig'ish</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
