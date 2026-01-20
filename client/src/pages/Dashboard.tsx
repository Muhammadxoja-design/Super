import { useUser } from "@/hooks/use-auth";
import { useTasks } from "@/hooks/use-tasks";
import { Link } from "wouter";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: user, isLoading } = useUser();
  const { data: tasks } = useTasks();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const doneCount = tasks?.filter((t) => t.assignment.status === "done").length || 0;
  const activeCount = tasks?.filter((t) =>
    ["pending", "accepted", "in_progress"].includes(t.assignment.status)
  ).length || 0;

  return (
    <div className="min-h-screen bg-background pb-24 px-6 pt-8 page-enter">
      <header className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Xush kelibsiz,</p>
          <h1 className="text-2xl font-display font-bold text-gradient">
            {user?.firstName || "Foydalanuvchi"} 👋
          </h1>
        </div>
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
          <span className="font-bold text-primary">
            {user?.firstName?.charAt(0) || "T"}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass-card p-4 rounded-2xl">
          <div className="text-3xl font-bold text-primary mb-1">{doneCount}</div>
          <div className="text-xs text-muted-foreground">Bajarilgan buyruqlar</div>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <div className="text-3xl font-bold text-yellow-500 mb-1">{activeCount}</div>
          <div className="text-xs text-muted-foreground">Faol buyruqlar</div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-blue-700 p-6 mb-8 text-white shadow-lg shadow-primary/20">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Buyruqlarni bajaring</h3>
          <p className="text-blue-100 text-sm mb-4 max-w-[80%]">
            Yangi buyruqlarni qabul qiling va jarayonni kuzatib boring.
          </p>
          <Link href="/tasks">
            <Button size="sm" variant="secondary" className="rounded-xl text-primary font-bold bg-white hover:bg-white/90">
              O'tish <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="absolute top-[-20%] right-[-10%] w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-24 h-24 rounded-full bg-blue-900/20 blur-xl" />
      </div>

      <h3 className="text-lg font-semibold mb-4">So'nggi yangiliklar</h3>
      <div className="space-y-4">
        <div className="bg-card/50 border border-border/50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <span className="text-xl">🎉</span>
          </div>
          <div>
            <h4 className="font-medium">Tabriklaymiz!</h4>
            <p className="text-xs text-muted-foreground">Siz muvaffaqiyatli tizimga kirdingiz</p>
          </div>
        </div>
      </div>
    </div>
  );
}
