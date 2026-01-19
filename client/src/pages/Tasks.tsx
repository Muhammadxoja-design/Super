import { useTasks, useCompleteTask } from "@/hooks/use-tasks";
import { Loader2, CheckCircle2, Circle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

  const activeTasks = tasks?.filter(t => !t.completed) || [];
  const completedTasks = tasks?.filter(t => t.completed) || [];

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 page-enter">
      <h1 className="text-3xl font-display font-bold mb-6 pl-2">Vazifalar</h1>

      {tasks?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mb-4">
            <ClipboardXIcon className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">Vazifalar yo'q</h3>
          <p className="text-muted-foreground max-w-xs">Hozircha sizga biriktirilgan vazifalar mavjud emas.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Tasks */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground pl-2 mb-2">Bajarilishi kerak</h2>
            <AnimatePresence>
              {activeTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={() => completeTask.mutate({ id: task.id, completed: true })} />
              ))}
            </AnimatePresence>
            {activeTasks.length === 0 && (
              <p className="text-sm text-muted-foreground pl-2 italic">Hozircha faol vazifalar yo'q</p>
            )}
          </div>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground pl-2 mb-2 opacity-70">Yakunlangan</h2>
              <div className="opacity-60 grayscale-[0.5]">
                {completedTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onToggle={() => completeTask.mutate({ id: task.id, completed: false })} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onToggle }: { task: any, onToggle: () => void }) {
  const priorityColor = {
    low: "bg-blue-500/10 text-blue-500",
    medium: "bg-yellow-500/10 text-yellow-500",
    high: "bg-red-500/10 text-red-500",
  }[task.priority as "low" | "medium" | "high"] || "bg-gray-500/10 text-gray-500";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-4 rounded-2xl flex items-start gap-4 active:scale-[0.99] transition-transform duration-200"
    >
      <button 
        onClick={onToggle}
        className="mt-1 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
      >
        {task.completed ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : (
          <Circle className="w-6 h-6" />
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={cn("font-semibold text-lg leading-tight", task.completed && "line-through decoration-muted-foreground")}>
            {task.title}
          </h3>
          <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full whitespace-nowrap", priorityColor)}>
            {task.priority}
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>

        {task.deadline && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
            <Calendar className="w-3.5 h-3.5" />
            <span>{format(new Date(task.deadline), "d MMM, yyyy")}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ClipboardXIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m15 11-6 6"/><path d="m9 11 6 6"/></svg>
  );
}
