import { useState, useEffect, useCallback } from "react";
import { DashboardStats } from "./DashboardStats";
import { LogsTable } from "./LogsTable";
import { ActivityChart, JitterChart } from "./ActivityChart";
import {
  MOCK_LOGS,
  MOCK_STATS,
  MOCK_CHART,
  fetchActionLogs,
  fetchDashboardStats,
  fetchChartData,
} from "@/lib/bot-api";
import type { ActionLog, DashboardStats as DashStats, ChartDataPoint } from "@/types/bot-dashboard";
import { RefreshCw, TrendingUp, Bot } from "lucide-react";

const USE_MOCK = true;

export function BotDashboardContent() {
  const [stats, setStats] = useState<DashStats>(MOCK_STATS);
  const [logs, setLogs] = useState<ActionLog[]>(MOCK_LOGS);
  const [chart, setChart] = useState<ChartDataPoint[]>(MOCK_CHART);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    if (USE_MOCK) {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 600));
      setStats(MOCK_STATS);
      setLogs(MOCK_LOGS);
      setChart(MOCK_CHART);
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [s, l, c] = await Promise.all([
        fetchDashboardStats(),
        fetchActionLogs(50),
        fetchChartData(24),
      ]);
      setStats(s);
      setLogs(l);
      setChart(c);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      setStats(MOCK_STATS);
      setLogs(MOCK_LOGS);
      setChart(MOCK_CHART);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-2xl font-display font-bold text-white/90">Bot Automation</h1>
        <p className="text-xs text-zinc-400">Oxirgi yangilanish: {lastUpdated.toLocaleTimeString("uz-UZ")}</p>
      </div>

      <DashboardStats data={stats} isLoading={loading} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <ActivityChart data={chart} isLoading={loading} />
        </div>
        <div>
          <JitterChart data={chart} isLoading={loading} />
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-4 rounded-2xl border border-indigo-500/20 px-5 py-4"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Bot size={15} className="text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">
              {USE_MOCK ? "Mock ma'lumotlar ko'rsatilmoqda" : "Live ma'lumotlar"}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {USE_MOCK
                ? "API yo'llari tayyor bo'lgandan so'ng USE_MOCK = false qiling"
                : "SQLite, Supabase va BullMQ'dan real-time ma'lumot"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <TrendingUp size={13} />
            <span className="text-xs font-semibold">
              {Math.round(
                (stats.completedLogs /
                  Math.max(stats.completedLogs + stats.pendingLogs + stats.failedLogs, 1)) *
                  100
              )}
              % muvaffaqiyat
            </span>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 text-xs font-semibold px-3 py-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Yangilash
          </button>
        </div>
      </div>

      <LogsTable logs={logs} isLoading={loading} onRefresh={loadData} />
    </div>
  );
}
