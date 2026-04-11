import { motion } from "framer-motion";
import { Activity, Clock, ShieldCheck, Zap } from "lucide-react";

export function ActivityMonitor() {
  const scripts = [
    { name: "Scraper v2.4", status: "Active", progress: 85, bg: "bg-blue-500" },
    { name: "Parser Engine", status: "Live", progress: 42, bg: "bg-violet-500" },
    { name: "AI NLP Core", status: "Wait", progress: 12, bg: "bg-amber-500" },
  ];

  return (
    <div className="w-full mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[2rem] p-8 bg-white/[0.02] border border-white/[0.08] shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-white tracking-tight">Real-time Scripts</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Automation Runtime Monitor</p>
            </div>
          </div>

          <div className="space-y-6">
            {scripts.map((script, i) => (
              <div key={script.name} className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white/90">{script.name}</span>
                    <span className="text-[9px] font-black uppercase tracking-tighter text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">{script.status}</span>
                  </div>
                  <span className="text-xs font-black text-white">{script.progress}%</span>
                </div>
                <div className="h-2 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${script.progress}%` }}
                    transition={{ duration: 1.5, ease: "circOut", delay: i * 0.2 }}
                    className={`h-full ${script.bg} rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] p-8 bg-white/[0.02] border border-white/[0.08] shadow-xl flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 rounded-[1.5rem] bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/5">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-white tracking-tight">System Shield</h3>
              <p className="text-xs text-zinc-500 font-medium">All systems operational. No active threats detected in the last 24 hours.</p>
            </div>
          </div>
          
          <div className="mt-4 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-widest font-black text-zinc-600">Last Baseline</span>
              <p className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                <Clock className="h-3 w-3 text-violet-400" /> 14:05:22
              </p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[10px] uppercase tracking-widest font-black text-zinc-600">Health Index</span>
              <p className="text-sm font-bold text-emerald-400">99.8%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
