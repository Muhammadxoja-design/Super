import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  ClipboardList, 
  UserCheck, 
  Users, 
  Radio, 
  ScrollText, 
  LayoutGrid, 
  CreditCard, 
  Zap,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  currentTab: string;
  onTabChange: (tab: any) => void;
  isSuperAdmin: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function AdminSidebar({ 
  currentTab, 
  onTabChange, 
  isSuperAdmin, 
  isOpen, 
  setIsOpen 
}: AdminSidebarProps) {
  const menuItems = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard, color: "text-violet-400" },
    { id: "tasks", label: "Buyruqlar", icon: ClipboardList, color: "text-blue-400" },
    { id: "registrations", label: "Ro'yxatlar", icon: UserCheck, color: "text-emerald-400" },
    { id: "users", label: "Foydalanuvchilar", icon: Users, color: "text-amber-400" },
    { id: "broadcast", label: "Xabar tarqatish", icon: Radio, color: "text-rose-400" },
    { id: "automation", label: "Automation", icon: Zap, color: "text-fuchsia-400" },
    { id: "audit", label: "System Logs", icon: ScrollText, color: "text-zinc-400" },
  ];

  const adminItems = isSuperAdmin ? [
    { id: "templates", label: "Templates", icon: LayoutGrid, color: "text-indigo-400" },
    { id: "billing", label: "Billing", icon: CreditCard, color: "text-cyan-400" },
  ] : [];

  const SidebarContent = () => (
    <div className="flex h-full flex-col p-6">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-900/40">
          <span className="font-display font-black text-white text-lg tracking-tighter">BH</span>
          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-[#090a0f] bg-green-500 animate-pulse"></div>
        </div>
        <div className="flex flex-col">
          <h2 className="font-display font-bold text-lg tracking-tight text-white/95">Bolalar harakati</h2>
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-violet-400/80">Boshqaruv Paneli</span>
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="flex-1 space-y-1">
        <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-4 px-2">Main Menu</div>
        {menuItems.map((item) => (
          <NavItem 
            key={item.id} 
            item={item} 
            isActive={currentTab === item.id} 
            onClick={() => {
              onTabChange(item.id);
              if (window.innerWidth < 1024) setIsOpen(false);
            }} 
          />
        ))}

        {adminItems.length > 0 && (
          <>
            <div className="pt-8 pb-4">
              <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 px-2">System Admin</div>
            </div>
            {adminItems.map((item) => (
              <NavItem 
                key={item.id} 
                item={item} 
                isActive={currentTab === item.id} 
                onClick={() => {
                  onTabChange(item.id);
                  if (window.innerWidth < 1024) setIsOpen(false);
                }} 
              />
            ))}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-auto pt-8 border-t border-white/5 px-2">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-white/10 transition-colors">
            <span className="text-xs font-bold font-display">V2</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-zinc-300">Build 7.3.0</span>
            <span className="text-[10px] text-zinc-500 font-medium">Platform Stable</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-72 transform border-r border-white/5 bg-[#090a0f]/80 backdrop-blur-3xl transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
        
        {/* Toggle Button for Desktop (Visible on hover or fixed) */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -right-3 top-24 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg lg:hidden"
        >
          {isOpen ? <X className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </aside>

      {/* Mobile Header Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button 
          onClick={() => setIsOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl text-white shadow-xl"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}

function NavItem({ item, isActive, onClick }: { item: any, isActive: boolean, onClick: () => void }) {
  const Icon = item.icon;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300",
        isActive 
          ? "bg-gradient-to-r from-violet-600/20 to-transparent text-white border-l-2 border-violet-500" 
          : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
      )}
    >
      <div className={cn(
        "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300",
        isActive ? "text-violet-400 bg-violet-400/10 shadow-[0_0_15px_rgba(167,139,250,0.2)]" : "text-zinc-500 group-hover:text-zinc-300"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      
      <span className="flex-1 text-left">{item.label}</span>
      
      {isActive && (
        <motion.div 
          layoutId="sidebar-active"
          className="absolute right-4 h-1 w-1 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(167,139,250,1)]"
        />
      )}
    </button>
  );
}
