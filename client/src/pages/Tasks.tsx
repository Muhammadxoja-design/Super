import { useTasks, useUpdateTaskStatus } from "@/hooks/use-tasks";
import {
  Loader2,
  Calendar,
  CircleDashed,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@shared/schema";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { TaskAIChat } from "@/components/ui/TaskAIChat";
import { usePageTitle } from "@/hooks/use-page-title";

const STATUS_ORDER = [
  "ACTIVE",
  "WILL_DO",
  "PENDING",
  "DONE",
  "CANNOT_DO",
] as const;

/* ── Task Status Dialog ─────────────────────────────────── */

type StatusDialogState =
  | { open: false }
  | { open: true; type: "DONE"; assignmentId: number; taskTitle: string }
  | { open: true; type: "CANNOT_DO"; assignmentId: number; taskTitle: string };

function TaskStatusDialog({
  state,
  onClose,
  onConfirm,
  isPending,
}: {
  state: StatusDialogState;
  onClose: () => void;
  onConfirm: (
    status: "DONE" | "CANNOT_DO",
    opts: { note?: string; proofText?: string },
  ) => void;
  isPending: boolean;
}) {
  const [proofText, setProofText] = useState("");
  const [note, setNote] = useState("");

  if (!state.open) return null;

  const isDone = state.type === "DONE";
  const title = isDone ? "Bajarilganligini tasdiqlang" : "Sabab kiriting";
  const description = isDone
    ? `"${state.taskTitle}" buyrug'ini bajarilgan deb belgilash uchun dalil kiriting (kamida 5 ta belgi).`
    : `"${state.taskTitle}" buyrug'ini bajara olmasligingiz sababini kiriting.`;

  const canSubmit = isDone ? proofText.trim().length >= 5 : true;

  const handleSubmit = () => {
    if (isDone) {
      onConfirm("DONE", { proofText: proofText.trim() });
    } else {
      onConfirm("CANNOT_DO", { note: note.trim() || undefined });
    }
    setProofText("");
    setNote("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setProofText("");
      setNote("");
      onClose();
    }
  };

  return (
    <Dialog open={state.open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {isDone ? (
          <Textarea
            placeholder="Dalil matnini kiriting..."
            value={proofText}
            onChange={(e) => setProofText(e.target.value)}
            className="min-h-[100px] bg-card/50"
            autoFocus
          />
        ) : (
          <Input
            placeholder="Sabab (ixtiyoriy)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-11 bg-card/50"
            autoFocus
          />
        )}

        {isDone &&
          proofText.trim().length > 0 &&
          proofText.trim().length < 5 && (
            <p className="text-xs text-destructive">
              Kamida 5 ta belgi kiriting
            </p>
          )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Bekor qilish
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            variant={isDone ? "default" : "destructive"}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Yuborilmoqda...
              </>
            ) : isDone ? (
              "Bajarildi ✓"
            ) : (
              "Yuborish"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Tasks Page ───────────────────────────────────── */

export default function Tasks() {
  usePageTitle("Buyruqlar — TaskBot");
  const { data: tasks, isLoading, error } = useTasks();
  const updateStatus = useUpdateTaskStatus();
  const [statusFilter, setStatusFilter] =
    useState<(typeof TASK_STATUSES)[number]>("ACTIVE");
  const [dialogState, setDialogState] = useState<StatusDialogState>({
    open: false,
  });
  const [aiTask, setAiTask] = useState<{
    title: string;
    description?: string | null;
  } | null>(null);

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
        <p className="text-destructive">
          Xatolik yuz berdi. Iltimos qayta urinib ko'ring.
        </p>
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
          <p className="text-muted-foreground max-w-xs">
            Hozircha sizga biriktirilgan buyruqlar mavjud emas.
          </p>
        </div>
      </div>
    );
  }

  const counts = tasks.reduce<Record<string, number>>((acc, item) => {
    acc[item.assignment.status] = (acc[item.assignment.status] || 0) + 1;
    return acc;
  }, {});

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
              onExplain={(t) => setAiTask(t)}
              onStatusChange={(nextStatus) => {
                if (nextStatus === "DONE") {
                  setDialogState({
                    open: true,
                    type: "DONE",
                    assignmentId: assignment.id,
                    taskTitle: task.title,
                  });
                } else if (nextStatus === "CANNOT_DO") {
                  setDialogState({
                    open: true,
                    type: "CANNOT_DO",
                    assignmentId: assignment.id,
                    taskTitle: task.title,
                  });
                } else {
                  updateStatus.mutate({
                    assignmentId: assignment.id,
                    status: nextStatus,
                  });
                }
              }}
            />
          ))}
        </AnimatePresence>
        {filteredTasks.length === 0 && (
          <p className="text-sm text-muted-foreground pl-2 italic">
            Bu holatda buyruqlar yo'q
          </p>
        )}
      </div>

      <TaskStatusDialog
        state={dialogState}
        onClose={() => setDialogState({ open: false })}
        isPending={updateStatus.isPending}
        onConfirm={(status, opts) => {
          if (!dialogState.open) return;
          updateStatus.mutate(
            {
              assignmentId: dialogState.assignmentId,
              status,
              note: opts.note,
              proofText: opts.proofText,
            },
            {
              onSuccess: () => setDialogState({ open: false }),
            },
          );
        }}
      />

      <AnimatePresence>
        {aiTask && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full"
            >
              <TaskAIChat task={aiTask} onClose={() => setAiTask(null)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Task Card ──────────────────────────────────── */

function TaskCard({
  assignment,
  task,
  onStatusChange,
  onExplain,
}: {
  assignment: any;
  task: any;
  onStatusChange: (status: (typeof TASK_STATUSES)[number]) => void;
  onExplain: (task: { title: string; description?: string | null }) => void;
}) {
  const status = assignment.status as (typeof TASK_STATUSES)[number];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-4 rounded-2xl flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg leading-tight">
              {task.title}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExplain(task)}
              className="h-7 px-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center gap-1.5 group"
            >
              <Sparkles className="w-3.5 h-3.5 group-hover:animate-pulse" />
              <span className="text-[10px] font-bold uppercase">AI bilan</span>
            </Button>
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        <span
          className={cn(
            "text-[10px] uppercase font-bold px-2 py-1 rounded-full whitespace-nowrap shrink-0",
            status === "DONE"
              ? "bg-green-500/10 text-green-500"
              : status === "CANNOT_DO"
                ? "bg-red-500/10 text-red-500"
                : status === "ACTIVE"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-yellow-500/10 text-yellow-500",
          )}
        >
          {TASK_STATUS_LABELS[status]}
        </span>
      </div>

      {assignment.statusUpdatedAt && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {format(new Date(assignment.statusUpdatedAt), "d MMM, yyyy")}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((nextStatus) => (
          <button
            key={nextStatus}
            onClick={() => onStatusChange(nextStatus)}
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
