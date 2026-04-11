import { useAuditLogs } from "@/hooks/use-admin";
import { Loader2, ScrollText, Clock, Hash } from "lucide-react";
import { motion } from "framer-motion";

export function AuditPanel() {
  const { data: logs, isLoading, isError, error } = useAuditLogs();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-zinc-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-2">
        <ScrollText className="h-5 w-5 text-zinc-500" />
        <h2 className="text-xl font-display font-bold text-white tracking-tight">System Audit Journal</h2>
      </div>

      <div className="space-y-3">
        {logs?.length ? (
          logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="group relative overflow-hidden rounded-2xl p-4 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                  <Hash className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{log.action}</div>
                  <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">
                    {log.targetType} <span className="text-zinc-500">#{log.targetId}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1.5 text-zinc-600 justify-end">
                  <Clock className="h-3 w-3" />
                  <span className="text-[9px] font-black uppercase tracking-tighter">
                    {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : 'Recently'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-20 text-center text-zinc-500 font-medium">Jurnal bo'sh</div>
        )}
      </div>
    </div>
  );
}
