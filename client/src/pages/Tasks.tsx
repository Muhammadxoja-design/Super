import { useTasks, useUpdateTaskStatus } from "@/hooks/use-tasks";
import { Loader2, Calendar, CircleDashed, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@shared/schema";
import { useMemo, useState } from "react";

const STATUS_ORDER = ["ACTIVE", "WILL_DO", "PENDING", "DONE", "CANNOT_DO"] as const;

export default function Tasks() {
  const { data: tasks, isLoading, error } = useTasks();
  const updateStatus = useUpdateTaskStatus();
  const [statusFilter, setStatusFilter] =
    useState<(typeof TASK_STATUSES)[number]>("ACTIVE");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background pb-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background pb-20 p-6 text-center">
        <p className="text-destructive">Xatolik yuz berdi. Iltimos qayta urinib ko'ring.</p>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-24 px-4 pt-6 page-enter">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mb-4">
            <CircleDashed className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">Buyruqlar yo'q</h3>
          <p className="text-muted-foreground max-w-xs">Hozircha sizga biriktirilgan buyruqlar mavjud emas.</p>
        </div>
      </div>
    );
  }

  const counts = useMemo(() => {
    return tasks.reduce<Record<string, number>>((acc, item) => {
      acc[item.assignment.status] = (acc[item.assignment.status] || 0) + 1;
      return acc;
    }, {});
  }, [tasks]);

  const filteredTasks = tasks.filter(
    (item) => item.assignment.status === statusFilter,
  );

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 page-enter">
      <h1 className="text-3xl font-display font-bold mb-6 pl-2">Buyruqlar</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-full border transition-all",
              statusFilter === status
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-card/50 text-muted-foreground border-border/60",
            )}
          >
            {TASK_STATUS_LABELS[status]} ({counts[status] || 0})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground pl-2">
          {TASK_STATUS_LABELS[statusFilter]}
        </h2>
        <AnimatePresence>
          {filteredTasks.map(({ assignment, task }) => (
            <TaskCard
              key={assignment.id}
              assignment={assignment}
              task={task}
              onStatusChange={(nextStatus, note) =>
                updateStatus.mutate({
                  assignmentId: assignment.id,
                  status: nextStatus,
                  note,
                })
              }
            />
          ))}
        </AnimatePresence>
        {filteredTasks.length === 0 && (
          <p className="text-sm text-muted-foreground pl-2 italic">
            Bu holatda buyruqlar yo'q
          </p>
        )}
      </div>
    </div>
  );
}

function TaskCard({
  assignment,
  task,
  onStatusChange,
}: {
  assignment: any;
  task: any;
  onStatusChange: (
    status: (typeof TASK_STATUSES)[number],
    note?: string,
  ) => void;
}) {
  const status = assignment.status as (typeof TASK_STATUSES)[number];

  const handleStatusChange = (nextStatus: (typeof TASK_STATUSES)[number]) => {
    if (nextStatus === "CANNOT_DO") {
      const note = window.prompt("Sabab (ixtiyoriy):") || undefined;
      onStatusChange(nextStatus, note);
      return;
    }
    onStatusChange(nextStatus);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-4 rounded-2xl flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-lg leading-tight">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        <span
          className={cn(
            "text-[10px] uppercase font-bold px-2 py-1 rounded-full whitespace-nowrap",
            status === "DONE"
              ? "bg-green-500/10 text-green-500"
              : status === "CANNOT_DO"
                ? "bg-red-500/10 text-red-500"
                : status === "ACTIVE"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-yellow-500/10 text-yellow-500"
          )}
        >
          {TASK_STATUS_LABELS[status]}
        </span>
      </div>

      {assignment.statusUpdatedAt && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
          <Calendar className="w-3.5 h-3.5" />
          <span>{format(new Date(assignment.statusUpdatedAt), "d MMM, yyyy")}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((nextStatus) => (
          <button
            key={nextStatus}
            onClick={() => handleStatusChange(nextStatus)}
            disabled={status === nextStatus}
            className={cn(
              "flex items-center gap-2 text-xs px-3 py-1 rounded-full border transition-colors",
              status === nextStatus
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-muted-foreground border-border/60 hover:text-primary",
            )}
          >
            {nextStatus === "DONE" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
            <span>{TASK_STATUS_LABELS[nextStatus]}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
