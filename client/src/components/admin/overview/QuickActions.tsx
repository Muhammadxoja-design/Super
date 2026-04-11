import { motion } from "framer-motion";
import { RotateCw, Trash2, PlusCircle, Settings2, ShieldAlert, Database } from "lucide-react";

export function QuickActions() {
  const actions = [
    { label: "Restart System", icon: RotateCw, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    { label: "Flush Cache", icon: Trash2, color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" },
    { label: "New Bot", icon: PlusCircle, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    { label: "Settings", icon: Settings2, color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/20" },
    { label: "Security Audit", icon: ShieldAlert, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    { label: "DB Backup", icon: Database, color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20" },
  ];

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-6 px-2">
        <div>
          <h2 className="text-lg font-display font-bold text-white/95">Tezkor Boshqaruv</h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">System Command Shortcuts</p>
        </div>
        <button className="px-4 py-1.5 rounded-xl border border-white/5 bg-white/[0.03] text-xs font-bold text-violet-400 hover:text-white hover:bg-violet-600 transition-all">
          View All
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action, i) => (
          <motion.button 
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + (i * 0.05) }}
            className={`flex flex-col items-center justify-center gap-4 p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all hover:-translate-y-1 group relative overflow-hidden`}
          >
            {/* Hover Glow Effect */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-transparent to-white/[0.02] pointer-events-none`} />
            
            <div className={`p-4 rounded-2xl ${action.bg} ${action.color} group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-black/20`}>
              <action.icon className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white uppercase tracking-tight text-center">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
