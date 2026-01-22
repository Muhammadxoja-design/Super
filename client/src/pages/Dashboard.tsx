import { useUser } from "@/hooks/use-auth";
import { useTasks } from "@/hooks/use-tasks";
import { Link } from "wouter";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: user, isLoading } = useUser();
  const isApproved = Boolean(user?.isAdmin || user?.status === "approved");
  const { data: tasks } = useTasks({ enabled: isApproved });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const doneCount = tasks?.filter((t) => t.assignment.status === "DONE").length || 0;
  const activeCount = tasks?.filter((t) =>
    ["ACTIVE", "WILL_DO", "PENDING"].includes(t.assignment.status)
  ).length || 0;
  const totalCount = doneCount + activeCount;
  const completionRate = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const profileComplete = Boolean(
    user?.firstName &&
      user?.lastName &&
      user?.phone &&
      user?.region &&
      user?.district &&
      user?.mahalla &&
      user?.address &&
      user?.direction &&
      user?.birthDate
  );

  if (!user) {
    return null;
  }

  if (!user.isAdmin && !profileComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
          <span className="text-3xl">📝</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Ro'yxatdan o'ting</h2>
        <p className="text-muted-foreground max-w-xs mx-auto mb-6">
          Platformadan foydalanish uchun ro'yxatdan o'tish formani to'ldiring.
        </p>
        <Link href="/register">
          <Button className="rounded-xl">Ro'yxatdan o'tish</Button>
        </Link>
      </div>
    );
  }

  if (!user.isAdmin && user.status === "pending") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6">
          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Arizangiz ko'rib chiqilmoqda</h2>
        <p className="text-muted-foreground max-w-xs mx-auto mb-6">
          Adminlar sizning arizangizni ko'rib chiqmoqda. Tez orada javob olasiz.
        </p>
        <span className="text-xs font-medium px-4 py-1.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
          Kutilmoqda
        </span>
      </div>
    );
  }

  if (!user.isAdmin && user.status === "rejected") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <span className="text-3xl">🚫</span>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-destructive">Arizangiz rad etildi</h2>
        <p className="text-muted-foreground max-w-xs mx-auto mb-6">
          {user.rejectionReason || "Ma'lumotlaringiz talablarga javob bermadi."}
        </p>
        <Link href="/register">
          <Button variant="outline" className="rounded-xl">Qayta yuborish</Button>
        </Link>
      </div>
    );
  }

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
        <div className="glass-card p-4 rounded-2xl col-span-2">
          <div className="text-2xl font-bold text-green-500 mb-1">{completionRate}%</div>
          <div className="text-xs text-muted-foreground">Bajarilganlar ulushi</div>
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
