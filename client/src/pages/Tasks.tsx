import { useTasks, useUpdateTaskStatus } from "@/hooks/use-tasks";
import { Loader2, Calendar, CircleCheck, CircleDashed } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { TASK_STATUSES } from "@shared/schema";
import { Button } from "@/components/ui/button";

const statusLabels: Record<string, string> = {
  pending: "Kutilmoqda",
  accepted: "Qabul qilingan",
  in_progress: "Jarayonda",
  rejected: "Rad etilgan",
  done: "Bajarildi",
};

export default function Tasks() {
  const { data: tasks, isLoading, error } = useTasks();
  const updateStatus = useUpdateTaskStatus();

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

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 page-enter">
      <h1 className="text-3xl font-display font-bold mb-6 pl-2">Buyruqlar</h1>

      <div className="space-y-4">
        <AnimatePresence>
          {tasks.map(({ assignment, task }) => (
            <TaskCard
              key={assignment.id}
              assignment={assignment}
              task={task}
              onStatus={(status) =>
                updateStatus.mutate({ assignmentId: assignment.id, status })
              }
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TaskCard({
  assignment,
  task,
  onStatus,
}: {
  assignment: any;
  task: any;
  onStatus: (status: (typeof TASK_STATUSES)[number]) => void;
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

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={status === "accepted" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatus("accepted")}
        >
          ✅ Qabul qildim
        </Button>
        <Button
          variant={status === "in_progress" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatus("in_progress")}
        >
          🟡 Jarayonda
        </Button>
        <Button
          variant={status === "rejected" ? "destructive" : "outline"}
          size="sm"
          onClick={() => onStatus("rejected")}
        >
          ❌ Rad etdim
        </Button>
        <Button
          variant={status === "done" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatus("done")}
        >
          <CircleCheck className="w-4 h-4 mr-1" />
          Bajarildi
        </Button>
      </div>
    </motion.div>
  );
}
