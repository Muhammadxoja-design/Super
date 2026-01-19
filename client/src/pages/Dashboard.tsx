import { useUser } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Loader2, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Pending State
  if (user?.status === "pending") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6">
          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Arizangiz ko'rib chiqilmoqda</h2>
        <p className="text-muted-foreground max-w-xs mx-auto mb-8">
          Sizning arizangiz adminlar tomonidan tekshirilmoqda. Tez orada javob olasiz.
        </p>
        <StatusBadge status="pending" className="px-4 py-1.5 text-sm" />
      </div>
    );
  }

  // Rejected State
  if (user?.status === "rejected") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <span className="text-3xl">🚫</span>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-destructive">Arizangiz rad etildi</h2>
        <p className="text-muted-foreground max-w-xs mx-auto mb-6">
          {user.rejectionReason || "Ma'lumotlaringiz talablarga javob bermadi."}
        </p>
        <Button variant="outline" className="rounded-xl">Qayta yuborish</Button>
      </div>
    );
  }

  // Main Dashboard Content
  return (
    <div className="min-h-screen bg-background pb-24 px-6 pt-8 page-enter">
      <header className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Xush kelibsiz,</p>
          <h1 className="text-2xl font-display font-bold text-gradient">{user?.fullName?.split(' ')[0]} 👋</h1>
        </div>
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
          <span className="font-bold text-primary">{user?.fullName?.charAt(0)}</span>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass-card p-4 rounded-2xl">
          <div className="text-3xl font-bold text-primary mb-1">0</div>
          <div className="text-xs text-muted-foreground">Bajarilgan vazifalar</div>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <div className="text-3xl font-bold text-yellow-500 mb-1">0</div>
          <div className="text-xs text-muted-foreground">Faol vazifalar</div>
        </div>
      </div>

      {/* Main Action Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-blue-700 p-6 mb-8 text-white shadow-lg shadow-primary/20">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Vazifalarni bajaring</h3>
          <p className="text-blue-100 text-sm mb-4 max-w-[80%]">
            Yangi vazifalarni qabul qiling va reytingingizni oshiring.
          </p>
          <Link href="/tasks">
            <Button size="sm" variant="secondary" className="rounded-xl text-primary font-bold bg-white hover:bg-white/90">
              O'tish <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        
        {/* Decorative Circles */}
        <div className="absolute top-[-20%] right-[-10%] w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-24 h-24 rounded-full bg-blue-900/20 blur-xl" />
      </div>

      {/* Quick Actions / Recent Activity */}
      <h3 className="text-lg font-semibold mb-4">So'nggi yangiliklar</h3>
      <div className="space-y-4">
        <div className="bg-card/50 border border-border/50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <span className="text-xl">🎉</span>
          </div>
          <div>
            <h4 className="font-medium">Tabriklaymiz!</h4>
            <p className="text-xs text-muted-foreground">Siz muvaffaqiyatli ro'yxatdan o'tdingiz</p>
          </div>
        </div>
      </div>
    </div>
  );
}
