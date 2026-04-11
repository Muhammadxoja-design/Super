// ─────────────────────────────────────────────
//  Bot Automation Dashboard — Type Definitions
// ─────────────────────────────────────────────

export type LogStatus = "pending" | "completed" | "failed" | "running";

export interface ActionLog {
  id: string;
  telegram_id: string;
  assignment_id?: number;
  action_type: string;
  proof_text?: string;
  simulated_ip?: string;
  execute_at?: string;
  status: LogStatus;
}

export interface DashboardStats {
  activeWorkers: number;
  totalBots: number;         // from Supabase (users count)
  totalUsers: number;        // from Supabase
  pendingLogs: number;       // from SQLite
  completedLogs: number;
  failedLogs: number;
  queuedJobs: number;        // BullMQ waiting
}

export interface ChartDataPoint {
  time: string;
  completed: number;
  pending: number;
  failed: number;
}

export interface BotUser {
  id: number;
  telegram_id: string;
  username?: string;
  full_name?: string;
  region?: string;
  status: string;
}
