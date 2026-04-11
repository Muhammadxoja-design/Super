import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminUsersAll,
  useAssignTask,
  useCreateTask,
  usePreviewTaskTarget,
  useTemplates,
} from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { DIRECTIONS, TASK_STATUS_LABELS } from "@shared/schema";
import { Activity, ClipboardList, Loader2, Search, Target, Users, LayoutGrid, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { StatCard } from "./StatCard";
import { motion, AnimatePresence } from "framer-motion";

interface TaskPanelProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  tasksLoading: boolean;
  taskData: any;
  taskPage: number;
  taskLimit: number;
  setTaskPage: (v: number) => void;
  onShowPendingTab: () => void;
  isSuperAdmin: boolean;
  canSearchUsers: boolean;
}

export function TaskPanel({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  tasksLoading,
  taskData,
  taskPage,
  taskLimit,
  setTaskPage,
  onShowPendingTab,
  isSuperAdmin,
  canSearchUsers,
}: TaskPanelProps) {
  const createTask = useCreateTask();
  const assignTask = useAssignTask();
  const previewTarget = usePreviewTaskTarget();
  const { data: templates } = useTemplates();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [debouncedUserSearch, setDebouncedUserSearch] = useState("");
  const [targetType, setTargetType] = useState<string>(canSearchUsers ? "USER" : "DIRECTION");
  const [targetValue, setTargetValue] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [forwardMessageId, setForwardMessageId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<{ count: number; sample: any[] } | null>(null);
  
  const { data: allUsersData, isLoading: usersLoading } = useAdminUsersAll({
    status: "approved",
    query: debouncedUserSearch || undefined,
    pageSize: 100,
    enabled: canSearchUsers && targetType === "USER",
  });
  
  const allUsers = allUsersData?.items ?? [];
  const totalUsers = allUsersData?.total ?? allUsers.length;

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedUserSearch(userSearchTerm.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [userSearchTerm]);

  const stats = taskData?.stats;

  const handlePreview = async () => {
    if (!title.trim()) return;
    const payload = {
      targetType,
      targetValue: targetType === "USER" ? undefined : targetValue.trim(),
      userId: targetType === "USER" ? selectedUserId || undefined : undefined,
    };
    if (targetType === "USER" && !selectedUserId) {
      toast({ variant: "destructive", title: "User tanlang" });
      return;
    }
    try {
      const preview = await previewTarget.mutateAsync(payload);
      setPreviewInfo({ count: preview.count, sample: preview.sample });
      setPreviewOpen(true);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Xatolik", description: error.message });
    }
  };

  const handleCreate = async () => {
    if (!previewInfo) return;
    try {
      const task = await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
      });
      await assignTask.mutateAsync({
        taskId: task.id,
        targetType,
        targetValue: targetType === "USER" ? undefined : targetValue.trim() || undefined,
        userId: targetType === "USER" ? selectedUserId || undefined : undefined,
        templateId: templateId || undefined,
        forwardMessageId: forwardMessageId ? Number(forwardMessageId) : undefined,
      });
      setTitle(""); setDescription(""); setSelectedUserId(null); setTargetValue("");
      setPreviewOpen(false); setPreviewInfo(null);
      toast({ title: "Buyruq muvaffaqiyatli yaratildi" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Xatolik", description: error.message });
    }
  };

  return (
    <div className="space-y-8">
      {/* Upper Grid: Composer & Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task Composer */}
        <div className="group relative overflow-hidden rounded-[2.5rem] p-8 bg-white/[0.02] border border-white/[0.08] shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3.5 rounded-2xl bg-violet-600/10 text-violet-400 ring-1 ring-violet-500/20">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white tracking-tight">Buyruq Generator</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">New Task Orchestrator</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Vazifa nomi</label>
              <Input
                placeholder="Buyruq sarlavhasi..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 bg-black/40 border-white/5 focus:border-violet-500/50 rounded-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Target Turi</label>
                <select
                  className="w-full h-11 rounded-xl border border-white/5 bg-black/40 px-3 text-sm text-zinc-300 outline-none focus:border-violet-500/50"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                >
                  {canSearchUsers && <option value="USER">Foydalanuvchi</option>}
                  <option value="DIRECTION">Yo'nalish</option>
                  <option value="VILOYAT">Viloyat</option>
                  <option value="TUMAN">Tuman</option>
                  {isSuperAdmin && <option value="ALL">Barcha Tasdiqlanganlar</option>}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Template</label>
                <select
                  className="w-full h-11 rounded-xl border border-white/5 bg-black/40 px-3 text-sm text-zinc-300 outline-none focus:border-violet-500/50"
                  value={templateId ?? ""}
                  onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Ixtiyoriy Template...</option>
                  {templates?.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
            </div>

            {targetType === "USER" && (
              <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                  <Input
                    placeholder="User qidirish..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-9 h-9 bg-black/20 border-white/5 text-xs rounded-lg"
                  />
                </div>
                <select
                  className="w-full h-10 rounded-lg border border-white/5 bg-black/40 px-3 text-xs text-zinc-400"
                  value={selectedUserId ?? ""}
                  onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                  disabled={usersLoading}
                >
                  <option value="">{usersLoading ? "Yuklanmoqda..." : `Tanlang (${totalUsers})`}</option>
                  {allUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>@{u.username || u.id} — {u.firstName}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <Button
                onClick={handlePreview}
                disabled={previewTarget.isPending || !title.trim()}
                className="flex-1 h-12 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-900/20 active:scale-95 transition-all"
              >
                {previewTarget.isPending ? <Loader2 className="animate-spin" /> : "Vazifani Preview Qilish"}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats HUD */}
        <div className="rounded-[2.5rem] p-8 bg-white/[0.02] border border-white/[0.08] shadow-2xl flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3.5 rounded-2xl bg-emerald-600/10 text-emerald-400 ring-1 ring-emerald-500/20">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white tracking-tight">Status Telemetry</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Real-time Execution Metrics</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            <ModernStat label="Jami" value={stats?.total || 0} color="text-zinc-300" />
            <ModernStat label="Bajarildi" value={stats?.done || 0} color="text-emerald-400" />
            <ModernStat label="Faol" value={stats?.active || 0} color="text-blue-400" />
            <ModernStat label="Kutilmoqda" value={stats?.pending || 0} color="text-amber-400" />
            <div className="col-span-2 mt-4 p-6 rounded-3xl bg-violet-600/5 border border-violet-500/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Muvaffaqiyat ko'rsatkichi</p>
                <h4 className="text-3xl font-display font-black text-white">{stats?.completionRate || 0}%</h4>
              </div>
              <div className="h-16 w-16 rounded-full border-[6px] border-violet-500/10 border-t-violet-500 flex items-center justify-center">
                <Target className="h-6 w-6 text-violet-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Explorer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-display font-bold text-white">Vazifalar Arxiv</h3>
          <div className="flex p-1 bg-white/5 rounded-2xl gap-1">
            {["all", "ACTIVE", "WILL_DO", "DONE"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === f ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f === 'all' ? 'Barchasi' : f}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {taskData?.tasks?.map((item: any, i: number) => (
            <motion.div
              key={item.task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative overflow-hidden rounded-[2rem] p-6 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all"
            >
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-bold text-white/90">{item.task.title}</h4>
                    <span className="text-[9px] font-black bg-violet-600/10 text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/20 uppercase tracking-tighter">ID: #{item.task.id}</span>
                  </div>
                  {item.task.description && <p className="text-xs text-zinc-500 line-clamp-2">{item.task.description}</p>}
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Executions</p>
                    <p className="text-lg font-display font-black text-zinc-300">{item.assignments.length}</p>
                  </div>
                  <div className="h-10 w-px bg-white/5" />
                  <div className="grid grid-cols-2 gap-1 min-w-[120px]">
                     {/* Simplified assignment status visualization */}
                     <span className="h-1.5 w-full bg-emerald-500/20 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500" style={{ width: `${(item.assignments.filter((a:any) => a.assignment.status === 'DONE').length / Math.max(item.assignments.length, 1)) * 100}%` }} />
                     </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination Container */}
      <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-3xl">
        <Button variant="ghost" onClick={() => setTaskPage(Math.max(0, taskPage - 1))} disabled={taskPage === 0} className="text-zinc-500 hover:text-white">Oldingi</Button>
        <div className="text-[10px] font-black text-zinc-600 tracking-[0.3em] uppercase">Page {taskPage + 1}</div>
        <Button variant="ghost" onClick={() => setTaskPage(taskPage + 1)} disabled={!taskData?.tasks || taskData.tasks.length < taskLimit} className="text-zinc-500 hover:text-white">Keyingi</Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md bg-[#090a0f] border-white/10 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-2xl tracking-tight">Push Confirmation</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Bu topshiriq <span className="text-violet-400 font-bold">{previewInfo?.count || 0}</span> foydalanuvchiga real-time yuboriladi.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Target Sample</p>
            {previewInfo?.sample?.map((u: any) => (
              <div key={u.id} className="flex justify-between items-center text-xs text-zinc-400">
                <span>{u.firstName || u.username}</span>
                <span className="text-[9px] font-bold text-zinc-600">ID: #{u.id}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPreviewOpen(false)} className="rounded-xl border-white/5 bg-white/5 hover:bg-white/10">Cancel</Button>
            <Button onClick={handleCreate} disabled={createTask.isPending} className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-8">Confirm & Dispatch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModernStat({ label, value, color }: { label: string, value: number | string, color: string }) {
  return (
    <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">{label}</p>
      <div className={`text-2xl font-display font-black ${color} tracking-tight`}>{value}</div>
    </div>
  );
}
