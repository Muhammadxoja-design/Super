import { useAuditLogs } from "@/hooks/use-admin";
import { Loader2 } from "lucide-react";

export function AuditPanel() {
  const { data: logs, isLoading, isError, error } = useAuditLogs();

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="text-center text-destructive py-10">
        {error instanceof Error
          ? error.message
          : "Audit loglarini olishda xatolik"}
      </div>
    );
  }

  return (
    <div className="admin-panel space-y-3">
      {logs?.length ? (
        logs.map((log) => (
          <div
            key={log.id}
            className="admin-card glass-card p-4 rounded-2xl border border-white/10"
          >
            <div className="text-sm font-semibold">{log.action}</div>
            <div className="text-xs text-muted-foreground">
              {log.targetType} #{log.targetId}
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-muted-foreground py-10">
          Audit loglari yo'q
        </p>
      )}
    </div>
  );
}
