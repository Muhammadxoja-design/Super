// ────────────────────────────────────────────────────────────────
//  LogsTable.tsx  —  Real-time Action Logs Table with Status Badges
// ────────────────────────────────────────────────────────────────
import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, Filter, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionLog, LogStatus } from "@/types/bot-dashboard";
import { formatDistanceToNow } from "date-fns";

// ── Status Badge ─────────────────────────────────────────────
type StatusCfg = {
  label: string;
  dot: string;
  badge: string;
};

const STATUS_CONFIG: Record<LogStatus, StatusCfg> = {
  pending: {
    label: "Kutilmoqda",
    dot: "bg-amber-400",
    badge: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  completed: {
    label: "Bajarildi",
    dot: "bg-emerald-400",
    badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  failed: {
    label: "Xato",
    dot: "bg-rose-400",
    badge: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  },
  running: {
    label: "Ishlayapti",
    dot: "bg-blue-400 animate-pulse",
    badge: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
};

function StatusBadge({ status }: { status: LogStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase",
        cfg.badge
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ── Action Type Pills ────────────────────────────────────────
const ACTION_COLORS: Record<string, string> = {
  like_post:       "text-pink-400 bg-pink-400/10 border-pink-400/20",
  leave_comment:   "text-violet-400 bg-violet-400/10 border-violet-400/20",
  subscribe:       "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  share_content:   "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  view_profile:    "text-slate-400 bg-slate-400/10 border-slate-400/20",
};

function ActionBadge({ type }: { type: string }) {
  const color = ACTION_COLORS[type] ?? "text-slate-400 bg-slate-400/10 border-slate-400/20";
  return (
    <span
      className={cn(
        "inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border tracking-wide",
        color
      )}
    >
      {type.replace(/_/g, " ")}
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────
interface LogsTableProps {
  logs: ActionLog[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

type SortKey = keyof ActionLog;
type SortDir = "asc" | "desc";

const STATUS_FILTERS: Array<{ value: LogStatus | "all"; label: string }> = [
  { value: "all",       label: "Barchasi"    },
  { value: "pending",   label: "Kutilmoqda"  },
  { value: "running",   label: "Ishlayapti"  },
  { value: "completed", label: "Bajarildi"   },
  { value: "failed",    label: "Xato"        },
];

export function LogsTable({ logs, isLoading = false, onRefresh }: LogsTableProps) {
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<LogStatus | "all">("all");
  const [sortKey, setSortKey]       = useState<SortKey>("execute_at");
  const [sortDir, setSortDir]       = useState<SortDir>("desc");
  const [page, setPage]             = useState(0);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    let result = [...logs];
    if (statusFilter !== "all") result = result.filter((l) => l.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.telegram_id.includes(q) ||
          l.action_type.toLowerCase().includes(q) ||
          l.id.includes(q)
      );
    }
    result.sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return result;
  }, [logs, statusFilter, search, sortKey, sortDir]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp size={12} className="opacity-20" />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="text-indigo-400" />
    ) : (
      <ChevronDown size={12} className="text-indigo-400" />
    );
  }

  return (
    <div
      id="logs-table-section"
      className="rounded-2xl border border-white/[0.07] overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(10,15,30,0.95) 0%, rgba(15,23,42,0.80) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Table Header & Controls */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-sm font-bold text-white font-display">Action Logs</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">{filtered.length} ta yozuv</p>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[160px] flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
          <Search size={12} className="text-slate-500 flex-shrink-0" />
          <input
            id="logs-search"
            type="text"
            placeholder="ID yoki Telegram ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full bg-transparent text-xs text-white placeholder:text-slate-600 outline-none"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              id={`filter-${f.value}`}
              onClick={() => { setStatus(f.value as LogStatus | "all"); setPage(0); }}
              className={cn(
                "text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all",
                statusFilter === f.value
                  ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                  : "border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          id="logs-refresh"
          onClick={onRefresh}
          className="flex items-center justify-center w-8 h-8 rounded-xl border border-white/[0.06] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {[
                { key: "id",           label: "ID"          },
                { key: "telegram_id",  label: "Telegram ID" },
                { key: "action_type",  label: "Harakat turi" },
                { key: "status",       label: "Holat"        },
                { key: "simulated_ip", label: "IP"           },
                { key: "execute_at",   label: "Vaqt"         },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key as SortKey)}
                  className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-5 py-3 cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <SortIcon k={key as SortKey} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {isLoading
              ? Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }, (__, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-3 rounded bg-white/[0.06] w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              : paged.length === 0
              ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-slate-600">
                      Hech qanday log topilmadi
                    </td>
                  </tr>
                )
              : paged.map((log) => (
                  <tr
                    key={log.id}
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-slate-400 group-hover:text-slate-200 transition-colors">
                      <span title={log.id}>{log.id.slice(0, 8)}…</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {log.telegram_id}
                    </td>
                    <td className="px-5 py-3.5">
                      <ActionBadge type={log.action_type} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500 text-[10px]">
                      {log.simulated_ip || "–"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {log.execute_at
                        ? formatDistanceToNow(new Date(log.execute_at), { addSuffix: true })
                        : "–"}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
          <span className="text-[10px] text-slate-600">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              id="logs-prev"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg border border-white/[0.06] text-[10px] text-slate-400 hover:text-white disabled:opacity-30 transition-all"
            >
              ← Oldingi
            </button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
              const p = Math.min(Math.max(page - 2, 0), Math.max(pages - 5, 0)) + i;
              return (
                <button
                  key={p}
                  id={`logs-page-${p}`}
                  onClick={() => setPage(p)}
                  className={cn(
                    "w-7 h-7 rounded-lg border text-[10px] font-semibold transition-all",
                    page === p
                      ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                      : "border-white/[0.06] text-slate-500 hover:text-white"
                  )}
                >
                  {p + 1}
                </button>
              );
            })}
            <button
              id="logs-next"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg border border-white/[0.06] text-[10px] text-slate-400 hover:text-white disabled:opacity-30 transition-all"
            >
              Keyingi →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
