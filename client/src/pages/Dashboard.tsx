import { useUser } from "@/hooks/use-auth";
import { useTasks } from "@/hooks/use-tasks";
import { useProfileComplete } from "@/hooks/use-profile";
import { Link } from "wouter";
import {
  Loader2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { usePageTitle } from "@/hooks/use-page-title";

export default function Dashboard() {
  usePageTitle("Bosh sahifa — TaskBot");
  const { data: user, isLoading } = useUser();
  const { profileComplete, isLoading: isProfileLoading } = useProfileComplete();
  const isAdmin = Boolean(
    user?.isAdmin ||
    user?.role === "limited_admin" ||
    user?.role === "super_admin",
  );
  const isApproved = Boolean(isAdmin || user?.status === "approved");
  const { data: tasks } = useTasks({ enabled: isApproved });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !isProfileLoading && containerRef.current) {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
        tl.fromTo(
          ".dashboard-hero",
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5 },
        ).fromTo(
          ".dashboard-stat",
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 },
          "-=0.2",
        ).fromTo(
          ".dashboard-cta",
          { opacity: 0, y: 18, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.55 },
          "-=0.25",
        );
      }, containerRef);
      return () => ctx.revert();
    }
  }, [isLoading, isProfileLoading]);

  if (isLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const doneCount =
    tasks?.filter((t) => t.assignment.status === "DONE").length || 0;
  const activeCount =
    tasks?.filter((t) =>
      ["ACTIVE", "WILL_DO", "PENDING"].includes(t.assignment.status),
    ).length || 0;
  const totalCount = doneCount + activeCount;
  const completionRate = totalCount
    ? Math.round((doneCount / totalCount) * 100)
    : 0;

  if (!user) {
    return null;
  }

  if (!isAdmin && !profileComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background page-enter">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
          <Sparkles className="w-10 h-10 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">Xush kelibsiz!</h2>
        <p className="text-muted-foreground max-w-xs mx-auto mb-8">
          Platformadan foydalanish uchun avval ro'yxatdan o'tish jarayonini
          yakunlashingiz kerak.
        </p>
        <Link href="/register">
          <Button className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20">
            Ro'yxatdan o'tish <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  if (!isAdmin && user.status === "pending") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background page-enter">
        <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6">
          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Arizangiz kutilmoqda</h2>
        <p className="text-muted-foreground max-w-xs mx-auto mb-6">
          Adminlarimiz sizning ma'lumotlaringizni tekshirmoqda. Tez orada natija
          haqida xabar beramiz.
        </p>
        <div className="px-4 py-1.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs font-bold uppercase tracking-wider">
          Tekshiruv jarayonida
        </div>
      </div>
    );
  }

  if (!isAdmin && user.status === "rejected") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background page-enter">
        <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6 border border-destructive/20">
          <span className="text-3xl">🚫</span>
        </div>
        <h2 className="text-2xl font-display font-bold mb-2 text-destructive">
          Arizangiz rad etildi
        </h2>
        <p className="text-muted-foreground max-w-xs mx-auto mb-8">
          {user.rejectionReason ||
            "Ma'lumotlaringiz talablarga javob bermadi. Qayta urinib ko'ring."}
        </p>
        <Link href="/register">
          <Button variant="outline" className="h-12 px-8 rounded-2xl">
            Qayta yuborish
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background pb-24 px-6 pt-8 page-enter"
    >
      <header className="flex items-center justify-between mb-8 dashboard-hero">
        <div>
          <p className="text-sm text-muted-foreground mb-1 uppercase tracking-widest font-semibold opacity-70">
            {user?.direction
              ? `${user.direction} yo'nalishi`
              : "Bosh sahifa"}
          </p>
          <h1 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            {user?.firstName || "Foydalanuvchi"} 👋
          </h1>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
          <span className="font-bold text-lg text-primary">
            {user?.firstName?.charAt(0) || "U"}
          </span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass-card p-5 rounded-3xl border border-white/5 dashboard-stat relative overflow-hidden group">
          <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <CheckCircle2 className="w-16 h-16" />
          </div>
          <div className="text-sm text-muted-foreground mb-1 font-medium">
            Bajarilgan
          </div>
          <div className="text-3xl font-bold text-primary">{doneCount}</div>
        </div>
        <div className="glass-card p-5 rounded-3xl border border-white/5 dashboard-stat relative overflow-hidden group">
          <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <LayoutDashboard className="w-16 h-16" />
          </div>
          <div className="text-sm text-muted-foreground mb-1 font-medium">
            Faol
          </div>
          <div className="text-3xl font-bold text-yellow-500">
            {activeCount}
          </div>
        </div>
        <div className="glass-card p-6 rounded-3xl border border-white/5 dashboard-stat col-span-2 flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1 font-medium">
              Umumiy samaradorlik
            </div>
            <div className="text-4xl font-bold text-primary">
              {completionRate}%
            </div>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center text-[10px] font-bold">
            PRO
          </div>
        </div>
      </div>

      <div className="dashboard-cta">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-blue-600 p-8 text-white shadow-xl shadow-primary/20 group">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-3">Buyruqlar Paneli</h3>
            <p className="text-blue-100/80 text-sm mb-6 max-w-[80%] leading-relaxed">
              Yangi vazifalarni qabul qiling, jarayonni boshqaring va
              natijalarni yuboring.
            </p>
            <Link href="/tasks">
              <Button
                size="lg"
                className="rounded-2xl px-8 bg-white text-primary hover:bg-white/90 font-bold border-none transition-transform group-hover:scale-105 active:scale-95 shadow-lg"
              >
                Vazifalarga o'tish <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="absolute top-[-20%] right-[-10%] w-48 h-48 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-700" />
          <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 rounded-full bg-black/20 blur-3xl" />
        </div>
      </div>

      <div className="mt-10 dashboard-stat">
        <h3 className="text-lg font-bold mb-4 px-1">So'nggi yangiliklar</h3>
        <div className="glass-card border border-white/5 rounded-[2rem] p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shrink-0">
            <Sparkles className="w-7 h-7 text-green-500" />
          </div>
          <div>
            <h4 className="font-bold text-foreground">Xush kelibsiz!</h4>
            <p className="text-sm text-muted-foreground leading-snug mt-0.5">
              Siz muvaffaqiyatli TaskBot platformasiga ulandingiz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
