import { motion } from "framer-motion";
import { Activity, Cpu, Server, Globe, Shield, Zap } from "lucide-react";
import { useAdminTasks, useAdminUsersFiltered } from "@/hooks/use-admin";

export function KpiSlider() {
  const { data: taskData } = useAdminTasks();
  const { data: usersData } = useAdminUsersFiltered({ pageSize: 1 });
  
  const totalUsers = usersData?.total || 1240;
  const activeTasks = taskData?.stats?.active || 42;
  const completionRate = taskData?.stats?.completionRate || 88;

  const KPIS = [
    {
      id: 1,
      title: "Jami Foydalanuvchilar",
      value: totalUsers.toLocaleString(),
      change: "+12.5%",
      trend: "up",
      icon: globeIcon(),
      color: "from-blue-600/20 to-transparent",
      borderColor: "border-blue-500/20",
      glow: "shadow-blue-500/10",
      iconColor: "text-blue-400"
    },
    {
      id: 2,
      title: "Faol Buyruqlar",
      value: activeTasks.toLocaleString(),
      change: "Active",
      trend: "neutral",
      icon: zapIcon(),
      color: "from-amber-600/20 to-transparent",
      borderColor: "border-amber-500/20",
      glow: "shadow-amber-500/10",
      iconColor: "text-amber-400"
    },
    {
      id: 3,
      title: "Muvaffaqiyatli Yakun",
      value: `${completionRate}%`,
      change: "+2.1%",
      trend: "up",
      icon: shieldIcon(),
      color: "from-emerald-600/20 to-transparent",
      borderColor: "border-emerald-500/20",
      glow: "shadow-emerald-500/10",
      iconColor: "text-emerald-400"
    },
    {
      id: 4,
      title: "Tizim Yuklamasi",
      value: "14ms",
      change: "Optimal",
      trend: "up",
      icon: cpuIcon(),
      color: "from-violet-600/20 to-transparent",
      borderColor: "border-violet-500/20",
      glow: "shadow-violet-500/10",
      iconColor: "text-violet-400"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {KPIS.map((kpi, index) => (
        <motion.div
          key={kpi.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          className={`relative group overflow-hidden rounded-3xl bg-white/[0.03] border ${kpi.borderColor} p-6 transition-all duration-300 hover:bg-white/[0.05] hover:shadow-2xl ${kpi.glow}`}
        >
          {/* Background Glow */}
          <div className={`absolute inset-0 bg-gradient-to-br ${kpi.color} opacity-30 group-hover:opacity-50 transition-opacity`} />
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl bg-black/40 border border-white/5 ${kpi.iconColor}`}>
                {kpi.icon}
              </div>
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                kpi.trend === 'up' ? 'text-green-400 border-green-400/20 bg-green-400/5' : 'text-zinc-400 border-zinc-400/20 bg-zinc-400/5'
              }`}>
                {kpi.change}
              </div>
            </div>
            
            <div>
              <h3 className="text-zinc-500 font-bold text-xs uppercase tracking-widest mb-1">{kpi.title}</h3>
              <div className="text-3xl font-display font-black tracking-tighter text-white">
                {kpi.value}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function globeIcon() { return <Globe className="h-6 w-6" />; }
function zapIcon() { return <Zap className="h-6 w-6" />; }
function shieldIcon() { return <Shield className="h-6 w-6" />; }
function cpuIcon() { return <Cpu className="h-6 w-6" />; }
