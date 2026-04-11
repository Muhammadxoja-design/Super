// ─────────────────────────────────────────────────────────────────────
//  ActivityChart.tsx  —  Real-time Line Chart (Recharts)
//  Shows: completed / pending / failed actions over the last 24 hours
// ─────────────────────────────────────────────────────────────────────
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { Activity } from "lucide-react";
import type { ChartDataPoint } from "@/types/bot-dashboard";

// ── Custom Tooltip ─────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border border-white/10 px-4 py-3 text-xs shadow-2xl"
      style={{ background: "rgba(10,15,30,0.98)", backdropFilter: "blur(16px)" }}
    >
      <p className="text-slate-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">
        {label}
      </p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-slate-400">{entry.name}</span>
          <span className="ml-auto font-bold text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Activity Area Chart ─────────────────────────────────────
interface ActivityChartProps {
  data: ChartDataPoint[];
  isLoading?: boolean;
}

export function ActivityChart({ data, isLoading = false }: ActivityChartProps) {
  return (
    <div
      id="activity-chart"
      className="rounded-2xl border border-white/[0.07] p-5"
      style={{
        background: "linear-gradient(135deg, rgba(10,15,30,0.95) 0%, rgba(15,23,42,0.80) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Activity size={15} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-display">Bot Faoliyati</h3>
            <p className="text-[10px] text-slate-500">So'nggi 24 soat</p>
          </div>
        </div>
        {/* Legend pills */}
        <div className="hidden sm:flex items-center gap-3">
          {[
            { label: "Bajarildi", color: "#10b981" },
            { label: "Kutilmoqda", color: "#f59e0b" },
            { label: "Xato",       color: "#f43f5e" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className="text-[10px] text-slate-500">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-[220px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-completed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="grad-pending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.20} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="grad-failed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.20} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: "#475569", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fill: "#475569", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="completed"
              name="Bajarildi"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#grad-completed)"
              dot={false}
              activeDot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="pending"
              name="Kutilmoqda"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#grad-pending)"
              dot={false}
              activeDot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="failed"
              name="Xato"
              stroke="#f43f5e"
              strokeWidth={1.5}
              fill="url(#grad-failed)"
              dot={false}
              activeDot={{ r: 4, fill: "#f43f5e", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Jitter Distribution Chart ──────────────────────────────
interface JitterChartProps {
  data: ChartDataPoint[];
  isLoading?: boolean;
}

function JitterTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border border-white/10 px-4 py-3 text-xs shadow-2xl"
      style={{ background: "rgba(10,15,30,0.98)", backdropFilter: "blur(16px)" }}
    >
      <p className="text-slate-400 font-semibold mb-1.5 text-[10px] uppercase tracking-wider">
        {label}
      </p>
      {payload.map((e: any) => (
        <div key={e.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: e.color }} />
          <span className="text-slate-400">{e.name}:</span>
          <span className="font-bold text-white">{e.value}</span>
        </div>
      ))}
    </div>
  );
}

export function JitterChart({ data, isLoading = false }: JitterChartProps) {
  // Compute cumulative jitter intensity
  const jitterData = data.map((d) => ({
    time: d.time,
    jitter: d.completed + d.pending,
    throughput: d.completed,
  }));

  return (
    <div
      id="jitter-chart"
      className="rounded-2xl border border-white/[0.07] p-5"
      style={{
        background: "linear-gradient(135deg, rgba(10,15,30,0.95) 0%, rgba(15,23,42,0.80) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Activity size={15} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white font-display">Jitter Taqsimoti</h3>
          <p className="text-[10px] text-slate-500">Bot yuklamasi va o'tkazuvchanlik</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[180px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={jitterData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="jitter-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
            <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<JitterTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="jitter"
              name="Umumiy yuklama"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="throughput"
              name="O'tkazuvchanlik"
              stroke="#06b6d4"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 4, fill: "#06b6d4", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
