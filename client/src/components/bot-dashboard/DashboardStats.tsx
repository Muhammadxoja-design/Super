// ───────────────────────────────────────────────────────────────
//  DashboardStats.tsx  —  Top KPI cards (BullMQ, Supabase, SQLite)
// ───────────────────────────────────────────────────────────────
import { Bot, Cpu, FileText, CheckCircle2, XCircle, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/types/bot-dashboard";

interface StatItem {
  id: string;
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;         // tailwind color class
  glow: string;          // box-shadow color
  trend?: string;
  trendUp?: boolean;
  source: string;
}

function buildStats(data: DashboardStats): StatItem[] {
  return [
    {
      id: "active-workers",
      label: "Faol Workerlar",
      value: data.activeWorkers,
      icon: Cpu,
      color: "from-indigo-500 to-purple-600",
      glow: "rgba(99,102,241,0.35)",
      trend: "+2 so'nggi soat",
      trendUp: true,
      source: "BullMQ",
    },
    {
      id: "total-bots",
      label: "Jami Botlar",
      value: data.totalBots.toLocaleString(),
      icon: Bot,
      color: "from-cyan-500 to-blue-600",
      glow: "rgba(6,182,212,0.35)",
      trend: "1000 ta maqsad",
      trendUp: true,
      source: "Supabase",
    },
    {
      id: "pending-logs",
      label: "Kutilmoqda",
      value: data.pendingLogs.toLocaleString(),
      icon: Clock,
      color: "from-amber-500 to-orange-600",
      glow: "rgba(245,158,11,0.35)",
      trend: "Navbatda",
      trendUp: false,
      source: "SQLite",
    },
    {
      id: "completed-logs",
      label: "Bajarildi",
      value: data.completedLogs.toLocaleString(),
      icon: CheckCircle2,
      color: "from-emerald-500 to-teal-600",
      glow: "rgba(16,185,129,0.35)",
      trend: `${Math.round((data.completedLogs / (data.completedLogs + data.pendingLogs + data.failedLogs)) * 100)}% muvaffaqiyat`,
      trendUp: true,
      source: "SQLite",
    },
    {
      id: "failed-logs",
      label: "Xatoliklar",
      value: data.failedLogs.toLocaleString(),
      icon: XCircle,
      color: "from-rose-500 to-red-600",
      glow: "rgba(239,68,68,0.30)",
      trend: "Retry navbatida",
      trendUp: false,
      source: "BullMQ",
    },
    {
      id: "queued-jobs",
      label: "Navbatdagi Ishlar",
      value: data.queuedJobs.toLocaleString(),
      icon: Zap,
      color: "from-violet-500 to-purple-700",
      glow: "rgba(139,92,246,0.35)",
      trend: "Rejada kutmoqda",
      trendUp: true,
      source: "BullMQ",
    },
    {
      id: "total-users",
      label: "Foydalanuvchilar",
      value: data.totalUsers.toLocaleString(),
      icon: FileText,
      color: "from-pink-500 to-rose-600",
      glow: "rgba(236,72,153,0.30)",
      trend: "Barcha DBda",
      trendUp: true,
      source: "Supabase",
    },
  ];
}

interface DashboardStatsProps {
  data: DashboardStats;
  isLoading?: boolean;
}

function StatCard({ stat, index }: { stat: StatItem; index: number }) {
  const Icon = stat.icon;
  return (
    <div
      id={`stat-card-${stat.id}`}
      className="relative group overflow-hidden rounded-2xl border border-white/[0.07] p-5 transition-transform duration-300 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.60) 100%)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)`,
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Ambient glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ boxShadow: `inset 0 0 40px ${stat.glow}` }}
      />

      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
            stat.color
          )}
          style={{ boxShadow: `0 8px 16px ${stat.glow}` }}
        >
          <Icon size={18} className="text-white" />
        </div>
        {/* Source badge */}
        <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-500 border border-white/[0.06]">
          {stat.source}
        </span>
      </div>

      {/* Value */}
      <div className="mb-1">
        <span className="text-3xl font-bold text-white tracking-tight font-display">
          {stat.value}
        </span>
      </div>

      {/* Label */}
      <p className="text-xs font-medium text-slate-400 mb-2">{stat.label}</p>

      {/* Trend */}
      {stat.trend && (
        <div
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-semibold",
            stat.trendUp ? "text-emerald-400" : "text-amber-400"
          )}
        >
          <span>{stat.trendUp ? "↑" : "→"}</span>
          <span>{stat.trend}</span>
        </div>
      )}

      {/* Progress bar decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-2xl">
        <div
          className={cn("h-full w-full bg-gradient-to-r opacity-60", stat.color)}
        />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.07] p-5 animate-pulse bg-white/[0.03]">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/[0.07]" />
        <div className="w-14 h-4 rounded-full bg-white/[0.05]" />
      </div>
      <div className="w-20 h-8 rounded-lg bg-white/[0.07] mb-2" />
      <div className="w-28 h-3 rounded-lg bg-white/[0.05] mb-3" />
      <div className="w-20 h-2.5 rounded-lg bg-white/[0.04]" />
    </div>
  );
}

export function DashboardStats({ data, isLoading = false }: DashboardStatsProps) {
  const stats = buildStats(data);
  return (
    <section id="dashboard-stats" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
      {isLoading
        ? Array.from({ length: 7 }, (_, i) => <SkeletonCard key={i} />)
        : stats.map((stat, i) => (
            <StatCard key={stat.id} stat={stat} index={i} />
          ))}
    </section>
  );
}
