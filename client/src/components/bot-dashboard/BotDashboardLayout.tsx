// ────────────────────────────────────────────────────────────
//  BotDashboardLayout.tsx  —  Full-screen layout with sidebar
// ────────────────────────────────────────────────────────────
import { useState } from "react";
import { BotSidebar } from "./BotSidebar";
import { BotHeader } from "./BotHeader";

interface BotDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function BotDashboardLayout({
  children,
  title,
  subtitle,
  onRefresh,
  isRefreshing,
}: BotDashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.06) 0%, transparent 60%), #060b18",
      }}
    >
      {/* Sidebar */}
      <BotSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <BotHeader
          title={title}
          subtitle={subtitle}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          isOnline={true}
        />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
