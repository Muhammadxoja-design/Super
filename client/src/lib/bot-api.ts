// ─────────────────────────────────────────────────────────────
//  bot-api.ts — Dashboard data fetching layer
//  All functions can be replaced with direct DB calls later.
// ─────────────────────────────────────────────────────────────

import type { ActionLog, DashboardStats, ChartDataPoint } from "@/types/bot-dashboard";

const API_BASE = "/api/bot-dashboard";

// ── Action Logs (SQLite via express route) ──────────────────
export async function fetchActionLogs(
  limit = 50,
  status?: string
): Promise<ActionLog[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set("status", status);
  const res = await fetch(`${API_BASE}/logs?${params}`);
  if (!res.ok) throw new Error("Failed to fetch action logs");
  return res.json();
}

// ── Dashboard Stats (BullMQ + Supabase + SQLite) ───────────
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch dashboard stats");
  return res.json();
}

// ── Chart Data (activity over last N hours) ─────────────────
export async function fetchChartData(hours = 24): Promise<ChartDataPoint[]> {
  const res = await fetch(`${API_BASE}/chart?hours=${hours}`);
  if (!res.ok) throw new Error("Failed to fetch chart data");
  return res.json();
}

// ── Mock fallback for development (when API not yet wired) ──
export const MOCK_LOGS: ActionLog[] = Array.from({ length: 30 }, (_, i) => ({
  id: crypto.randomUUID(),
  telegram_id: `${Math.floor(100_000_000 + Math.random() * 900_000_000)}`,
  assignment_id: Math.floor(Math.random() * 1000),
  action_type: ["like_post", "leave_comment", "subscribe", "share_content", "view_profile"][
    Math.floor(Math.random() * 5)
  ],
  simulated_ip: `213.230.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  execute_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
  status: (["pending", "completed", "completed", "completed", "failed", "running"] as const)[
    Math.floor(Math.random() * 6)
  ],
}));

export const MOCK_STATS: DashboardStats = {
  activeWorkers: 4,
  totalBots: 1000,
  totalUsers: 1024,
  pendingLogs: 218,
  completedLogs: 756,
  failedLogs: 26,
  queuedJobs: 184,
};

export const MOCK_CHART: ChartDataPoint[] = Array.from({ length: 24 }, (_, i) => {
  const t = new Date(Date.now() - (23 - i) * 3600000);
  const completed = Math.floor(20 + Math.random() * 80);
  const pending = Math.floor(5 + Math.random() * 40);
  const failed = Math.floor(Math.random() * 10);
  return {
    time: t.getHours().toString().padStart(2, "0") + ":00",
    completed,
    pending,
    failed,
  };
});
