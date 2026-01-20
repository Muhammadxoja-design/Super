import { useTasks, useCompleteTask } from "@/hooks/use-tasks";
import { Loader2, Calendar, CircleDashed, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { TASK_STATUSES } from "@shared/schema";

const statusLabels: Record<string, string> = {
  pending: "Kutilmoqda",
  accepted: "Qabul qilingan",
  in_progress: "Jarayonda",
  rejected: "Rad etilgan",
  done: "Bajarildi",
};

export default function Tasks() {
  const { data: tasks, isLoading, error } = useTasks();
  const completeTask = useCompleteTask();

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

  const activeTasks = tasks.filter((item) => item.assignment.status !== "done");
  const completedTasks = tasks.filter((item) => item.assignment.status === "done");

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 page-enter">
      <h1 className="text-3xl font-display font-bold mb-6 pl-2">Buyruqlar</h1>

      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground pl-2">Faol buyruqlar</h2>
          <AnimatePresence>
            {activeTasks.map(({ assignment, task }) => (
              <TaskCard
                key={assignment.id}
                assignment={assignment}
                task={task}
                onComplete={() => completeTask.mutate({ assignmentId: assignment.id })}
              />
            ))}
          </AnimatePresence>
          {activeTasks.length === 0 && (
            <p className="text-sm text-muted-foreground pl-2 italic">Faol buyruqlar yo'q</p>
          )}
        </div>

        {completedTasks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground pl-2 mb-2 opacity-70">Bajarilgan</h2>
            <div className="opacity-60 grayscale-[0.5]">
              {completedTasks.map(({ assignment, task }) => (
                <TaskCard
                  key={assignment.id}
                  assignment={assignment}
                  task={task}
                  onComplete={() => null}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({
  assignment,
  task,
  onComplete,
}: {
  assignment: any;
  task: any;
  onComplete: () => void;
}) {
  const status = assignment.status as keyof typeof statusLabels;

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
            status === "done"
              ? "bg-green-500/10 text-green-500"
              : status === "rejected"
                ? "bg-red-500/10 text-red-500"
                : "bg-yellow-500/10 text-yellow-500"
          )}
        >
          {statusLabels[status]}
        </span>
      </div>

      {assignment.statusUpdatedAt && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
          <Calendar className="w-3.5 h-3.5" />
          <span>{format(new Date(assignment.statusUpdatedAt), "d MMM, yyyy")}</span>
        </div>
      )}

      <button
        onClick={onComplete}
        disabled={status === "done" || status === "rejected"}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        {status === "done" ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
        <span>
          {status === "done"
            ? "Bajarildi"
            : status === "rejected"
              ? "Rad etilgan"
              : "Bajarildi deb belgilash"}
        </span>
      </button>
    </motion.div>
  );
}
