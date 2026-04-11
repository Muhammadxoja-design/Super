import { Activity, Cpu, Server } from "lucide-react";

const KPIS = [
  {
    id: 1,
    title: "Faol Botlar",
    value: "2,408",
    change: "+12.5%",
    trend: "up",
    icon: Activity,
    color: "from-blue-500/20 to-cyan-500/0",
    iconColor: "text-cyan-400",
    shadow: "shadow-[0_0_15px_rgba(34,211,238,0.15)]",
  },
  {
    id: 2,
    title: "API So'rovlar (Bugun)",
    value: "145.2K",
    change: "+4.1%",
    trend: "up",
    icon: Cpu,
    color: "from-purple-500/20 to-fuchsia-500/0",
    iconColor: "text-purple-400",
    shadow: "shadow-[0_0_15px_rgba(168,85,247,0.15)]",
  },
  {
    id: 3,
    title: "Server Uptime",
    value: "99.98%",
    change: "Normal",
    trend: "neutral",
    icon: Server,
    color: "from-green-500/20 to-emerald-500/0",
    iconColor: "text-emerald-400",
    shadow: "shadow-[0_0_15px_rgba(52,211,153,0.15)]",
  },
];

export function KpiSlider() {
  return (
    <div className="w-full mb-8">
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              className={`min-w-[240px] md:min-w-[280px] lg:flex-1 snap-start relative overflow-hidden rounded-3xl bg-[#111218]/90 backdrop-blur-2xl border border-white/[0.08] ${kpi.shadow} transition-all duration-300 hover:-translate-y-1`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.color} opacity-50`}></div>
              <div className="relative p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl bg-white/[0.03] border border-white/5 ${kpi.iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    kpi.trend === 'up' ? 'text-green-400 bg-green-400/10' : 'text-zinc-400 bg-zinc-400/10'
                  }`}>
                    {kpi.change}
                  </div>
                </div>
                <div>
                  <h3 className="text-zinc-400 font-medium text-sm mb-1">{kpi.title}</h3>
                  <div className="text-2xl font-bold tracking-tight text-white/95">
                    {kpi.value}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
