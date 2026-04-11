import { useAdminTasks } from "@/hooks/use-admin";
import { useUser } from "@/hooks/use-auth";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/use-page-title";

// Layout & Navigation
import { AdminSidebar } from "@/components/admin/AdminSidebar";

// Modern Antigravity Overview
import { SystemOverview } from "@/components/admin/overview/SystemOverview";

// Modular admin panels
import { AuditPanel } from "./admin/AuditPanel";
import { BillingPanel } from "./admin/BillingPanel";
import { BroadcastPanel } from "./admin/BroadcastPanel";
import { RegistrationsPanel } from "./admin/RegistrationsPanel";
import { TaskPanel } from "./admin/TaskPanel";
import { TemplatesPanel } from "./admin/TemplatesPanel";
import { UsersPanel } from "./admin/UsersPanel";

// Bot Automation integration components
import { BotDashboardContent } from "@/components/bot-dashboard/BotDashboardContent";

type AdminTab =
  | "overview"
  | "tasks"
  | "registrations"
  | "users"
  | "broadcast"
  | "automation"
  | "audit"
  | "templates"
  | "billing";

export default function Admin() {
  usePageTitle("Antigravity Command Center");
  const { data: user } = useUser();
  const isSuperAdmin = user?.role === "super_admin";
  const canSearchUsers = Boolean(isSuperAdmin);
  
  const [tab, setTab] = useState<AdminTab>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Existing Task Filters (needed for TaskPanel)
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

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-zinc-100 selection:bg-violet-500/30">
      {/* Premium Sidebar */}
      <AdminSidebar 
        currentTab={tab} 
        onTabChange={(t) => setTab(t)} 
        isSuperAdmin={isSuperAdmin}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-72 transition-all duration-300">
        <div className="relative min-h-screen">
          {/* Ambient Background Elements */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
            <div className="absolute top-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-violet-600/5 blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/5 blur-[120px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-full bg-[radial-gradient(#1e1e2d_1px,transparent_1px)] [background-size:40px_40px] opacity-[0.03]" />
          </div>

          <div className="relative z-10 px-4 pt-20 pb-12 lg:px-8 lg:pt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full max-w-7xl mx-auto"
              >
                {/* Content Routers */}
                {tab === "overview" && <SystemOverview />}

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

                {tab === "automation" && <BotDashboardContent />}

                {tab === "audit" && <AuditPanel />}

                {tab === "templates" && isSuperAdmin && <TemplatesPanel />}

                {tab === "billing" && isSuperAdmin && <BillingPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
