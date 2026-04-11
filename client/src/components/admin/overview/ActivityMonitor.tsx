import { Play, Pause, AlertCircle, CheckCircle2 } from "lucide-react";

const SCRIPTS = [
  { id: 1, name: "Telegram Bot Scraper", status: "Yurmoqda", progress: 75, icon: Play, color: "text-emerald-400", bg: "bg-emerald-400" },
  { id: 2, name: "Data Sync Worker", status: "Kutishda", progress: 30, icon: Pause, color: "text-zinc-400", bg: "bg-zinc-400" },
  { id: 3, name: "Bulk Broadcast", status: "Xatolik", progress: 85, icon: AlertCircle, color: "text-rose-400", bg: "bg-rose-400" },
  { id: 4, name: "Farg'ona Fake Seeder", status: "Tugadi", progress: 100, icon: CheckCircle2, color: "text-blue-400", bg: "bg-blue-400" },
];

export function ActivityMonitor() {
  return (
    <div className="w-full mb-8">
      <div className="rounded-3xl p-6 bg-[#111218]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <h2 className="text-lg font-semibold text-white/95 mb-5">Faol Skriptlar qatorlari</h2>
        
        <div className="flex flex-col gap-4">
          {SCRIPTS.map((script) => {
            const Icon = script.icon;
            return (
              <div key={script.id} className="group flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] transition-colors">
                <div className={`p-2.5 rounded-xl bg-white/[0.05] ${script.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-white/90">{script.name}</h4>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${script.color}`}>{script.status}</span>
                  </div>
                  
                  <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${script.bg} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: \`\${script.progress}%\` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
