import { useAdminTasks } from "@/hooks/use-admin";
import { useUser } from "@/hooks/use-auth";
import { gsap } from "gsap";
import {
  ClipboardList,
  CreditCard,
  LayoutGrid,
  Radio,
  ScrollText,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Modular admin panels
import { AuditPanel } from "./admin/AuditPanel";
import { BillingPanel } from "./admin/BillingPanel";
import { BroadcastPanel } from "./admin/BroadcastPanel";
import { RegistrationsPanel } from "./admin/RegistrationsPanel";
import { TaskPanel } from "./admin/TaskPanel";
import { TemplatesPanel } from "./admin/TemplatesPanel";
import { UsersPanel } from "./admin/UsersPanel";
import { usePageTitle } from "@/hooks/use-page-title";

type AdminTab =
  | "tasks"
  | "registrations"
  | "users"
  | "broadcast"
  | "audit"
  | "templates"
  | "billing";

export default function Admin() {
  usePageTitle("Admin panel — TaskBot");
  const { data: user } = useUser();
  const isSuperAdmin = user?.role === "super_admin";
  const canSearchUsers = Boolean(isSuperAdmin);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<AdminTab>("tasks");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [searchTerm, setSearchTerm] = useState("");
  const [taskPage, setTaskPage] = useState(0);
  const taskLimit = 20;

  useEffect(() => {
    setTaskPage(0);
  }, [statusFilter, searchTerm]);

  const { data: taskData, isLoading: tasksLoading } = useAdminTasks(
    statusFilter === "all" ? undefined : statusFilter,
    searchTerm,
    taskLimit,
    taskPage * taskLimit,
  );

  useLayoutEffect(() => {
    if (!pageRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".admin-hero",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
      );
      gsap.fromTo(
        ".admin-tab",
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.05,
          delay: 0.1,
        },
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    if (!pageRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".admin-panel",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
      );
      gsap.fromTo(
        ".admin-card",
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.04,
          delay: 0.05,
        },
      );
    }, pageRef);
    return () => ctx.revert();
  }, [tab]);

  const tabs = [
    { key: "tasks", label: "Buyruqlar", icon: ClipboardList },
    { key: "registrations", label: "Ro'yxatlar", icon: UserCheck },
    { key: "users", label: "Foydalanuvchilar", icon: Users },
    { key: "broadcast", label: "Xabar tarqatish", icon: Radio },
    { key: "audit", label: "Jurnal", icon: ScrollText },
    ...(isSuperAdmin
      ? [
          { key: "templates", label: "Shablonlar", icon: LayoutGrid },
          { key: "billing", label: "To'lovlar", icon: CreditCard },
        ]
      : []),
  ] as const;

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-background pb-24 px-4 pt-6 page-enter relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-48 -left-28 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="admin-hero glass-card rounded-3xl border border-white/10 p-6 md:p-8 mb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                Boshqaruv markazi
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold mt-3">
                Admin Panel
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                Tizimni kuzatish, foydalanuvchilarni boshqarish va broadcast
                jarayonlarini tez va qulay yuritish uchun optimallashtirilgan.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs text-muted-foreground">Admin</div>
                <div className="font-semibold">
                  {user?.firstName || user?.username || user?.login || "Admin"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs text-muted-foreground">Role</div>
                <div className="font-semibold">
                  {isSuperAdmin ? "Super Admin" : "Admin"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs text-muted-foreground">Active Tab</div>
                <div className="font-semibold capitalize">{tab}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-2 mb-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key as AdminTab)}
                  className={`admin-tab flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {tab === "tasks" && (
          <TaskPanel
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            tasksLoading={tasksLoading}
            taskData={taskData}
            taskPage={taskPage}
            taskLimit={taskLimit}
            setTaskPage={setTaskPage}
            onShowPendingTab={() => setTab("registrations")}
            isSuperAdmin={isSuperAdmin}
            canSearchUsers={canSearchUsers}
          />
        )}

        {tab === "registrations" && <RegistrationsPanel />}

        {tab === "users" && <UsersPanel />}

        {tab === "broadcast" && <BroadcastPanel />}

        {tab === "audit" && <AuditPanel />}

        {tab === "templates" && isSuperAdmin && <TemplatesPanel />}

        {tab === "billing" && isSuperAdmin && <BillingPanel />}
      </div>
    </div>
  );
}
