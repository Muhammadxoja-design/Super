import { useMemo, useState } from "react";
import {
  useAdminUsersFiltered,
  useAdminTasks,
  useCreateTask,
  useAssignTask,
  useUpdateUserStatus,
  useAuditLogs,
} from "@/hooks/use-admin";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function Admin() {
  const [tab, setTab] = useState<"tasks" | "registrations" | "users" | "audit">(
    "tasks"
  );
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: taskData, isLoading: tasksLoading } = useAdminTasks(
    statusFilter === "all" ? undefined : statusFilter,
    searchTerm
  );

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 page-enter">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Admin Panel</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            { key: "tasks", label: "Buyruqlar" },
            { key: "registrations", label: "Ro'yxatlar" },
            { key: "users", label: "Foydalanuvchilar" },
            { key: "audit", label: "Audit" },
          ] as const
        ).map((item) => (
          <Button
            key={item.key}
            variant={tab === item.key ? "default" : "outline"}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {tab === "tasks" && (
        <TaskPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          tasksLoading={tasksLoading}
          taskData={taskData}
        />
      )}

      {tab === "registrations" && <RegistrationsPanel />}

      {tab === "users" && <UsersPanel />}

      {tab === "audit" && <AuditPanel />}
    </div>
  );
}

function TaskPanel({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  tasksLoading,
  taskData,
}: any) {
  const createTask = useCreateTask();
  const assignTask = useAssignTask();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [assignRegion, setAssignRegion] = useState("");
  const [assignDirection, setAssignDirection] = useState("");
  const { data: allUsers } = useAdminUsersFiltered();

  const stats = taskData?.stats;

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      const task = await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
      });
      if (selectedUserId || assignRegion || assignDirection) {
        await assignTask.mutateAsync({
          taskId: task.id,
          userId: selectedUserId || undefined,
          region: assignRegion || undefined,
          direction: assignDirection || undefined,
        });
      }
      setTitle("");
      setDescription("");
      setSelectedUserId(null);
      setAssignRegion("");
      setAssignDirection("");
      toast({ title: "Buyruq yaratildi" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: error.message || "Buyruq yaratilmadi",
      });
    }
  };

  return (
    <div>
      <div className="grid gap-4 mb-6">
        <div className="glass-card p-4 rounded-2xl border border-white/10">
          <h2 className="font-semibold mb-2">Yangi buyruq</h2>
          <div className="space-y-2">
            <Input
              placeholder="Buyruq sarlavhasi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Tavsif (ixtiyoriy)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <select
              className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
              value={selectedUserId ?? ""}
              onChange={(e) =>
                setSelectedUserId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Foydalanuvchi tanlang (ixtiyoriy)</option>
              {allUsers?.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.firstName || user.username || "User"} #{user.id}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="Region bo'yicha (ixtiyoriy)"
                value={assignRegion}
                onChange={(e) => setAssignRegion(e.target.value)}
              />
              <Input
                placeholder="Yo'nalish bo'yicha (ixtiyoriy)"
                value={assignDirection}
                onChange={(e) => setAssignDirection(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={createTask.isPending || !title.trim()}
            >
              {createTask.isPending ? "Yaratilmoqda..." : "Buyruq yaratish"}
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Jami" value={stats.total} />
            <StatCard label="Bajarildi" value={stats.done} />
            <StatCard label="Jarayonda" value={stats.inProgress} />
            <StatCard label="Qabul qilingan" value={stats.accepted} />
            <StatCard label="Rad etilgan" value={stats.rejected} />
            <StatCard label="Bajarilgan foiz" value={`${stats.completionRate}%`} />
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buyruqlarni qidirish..."
            className="pl-9 h-11 bg-card/50 border-border/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex p-1 bg-card/50 rounded-xl mb-6 overflow-x-auto no-scrollbar">
        {["all", "pending", "accepted", "in_progress", "done", "rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              statusFilter === tab
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {tasksLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {taskData?.tasks?.length ? (
            taskData.tasks.map((item: any) => (
              <div key={item.task.id} className="glass-card p-4 rounded-2xl">
                <div className="font-semibold text-lg">{item.task.title}</div>
                {item.task.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.task.description}
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  {item.assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Biriktirilmagan</p>
                  ) : (
                    item.assignments.map((assignment: any) => (
                      <div
                        key={assignment.assignment.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          {assignment.user.firstName || assignment.user.username || "User"} #{assignment.user.id}
                        </span>
                        <span className="text-muted-foreground">
                          {assignment.assignment.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-10">Buyruqlar topilmadi</p>
          )}
        </div>
      )}
    </div>
  );
}

function RegistrationsPanel() {
  const { data: users, isLoading } = useAdminUsersFiltered({ status: "pending" });
  const updateStatus = useUpdateUserStatus();
  const { toast } = useToast();
  const [rejectingUserId, setRejectingUserId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const handleApprove = async (userId: number) => {
    try {
      await updateStatus.mutateAsync({ userId, status: "approved" });
      toast({ title: "Tasdiqlandi" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: error.message || "Tasdiqlanmadi",
      });
    }
  };

  const handleReject = async () => {
    if (!rejectingUserId) return;
    try {
      await updateStatus.mutateAsync({
        userId: rejectingUserId,
        status: "rejected",
        rejectionReason: reason,
      });
      toast({ title: "Rad etildi" });
      setRejectingUserId(null);
      setReason("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: error.message || "Rad etilmadi",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {users?.length ? (
        users.map((user) => (
          <div key={user.id} className="glass-card p-5 rounded-2xl border border-white/5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg">{user.firstName} {user.lastName}</h3>
                <p className="text-sm text-muted-foreground">{user.direction}</p>
              </div>
              <StatusBadge status={user.status} />
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground/80 mb-4">
              <div>📍 {user.region}</div>
              <div>📞 {user.phone}</div>
            </div>
            <div className="flex gap-3 mt-4 pt-4 border-t border-border/50">
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                size="sm"
                onClick={() => handleApprove(user.id)}
                disabled={updateStatus.isPending}
              >
                Tasdiqlash
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                size="sm"
                onClick={() => setRejectingUserId(user.id)}
                disabled={updateStatus.isPending}
              >
                Rad etish
              </Button>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-muted-foreground py-10">Kutilayotgan arizalar yo'q</p>
      )}

      <Dialog open={Boolean(rejectingUserId)} onOpenChange={() => setRejectingUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rad etish sababi</DialogTitle>
            <DialogDescription>Foydalanuvchiga rad etish sababini yozing.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sabab..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingUserId(null)}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!reason.trim() || updateStatus.isPending}
            >
              Rad etish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UsersPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<string>("");
  const [region, setRegion] = useState("");
  const [direction, setDirection] = useState("");
  const { data: users, isLoading } = useAdminUsersFiltered({
    status: status || undefined,
    region: region || undefined,
    direction: direction || undefined,
  });

  const filteredUsers = useMemo(() => {
    return (users || []).filter((user) =>
      `${user.firstName || ""} ${user.lastName || ""} ${user.username || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6">
        <Input
          placeholder="Search users..."
          className="h-11 bg-card/50 border-border/50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            placeholder="Status (pending/approved/rejected)"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <Input
            placeholder="Region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
          <Input
            placeholder="Yo'nalish"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Foydalanuvchilar topilmadi</p>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="glass-card p-5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{user.firstName || user.username}</h3>
                    <p className="text-sm text-muted-foreground">{user.direction || "-"}</p>
                  </div>
                  <StatusBadge status={user.status} />
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground/80">
                  <div>📍 {user.region || "—"}</div>
                  <div>📞 {user.phone || "—"}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AuditPanel() {
  const { data: logs, isLoading } = useAuditLogs();

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs?.length ? (
        logs.map((log) => (
          <div key={log.id} className="glass-card p-4 rounded-2xl border border-white/10">
            <div className="text-sm font-semibold">{log.action}</div>
            <div className="text-xs text-muted-foreground">{log.targetType} #{log.targetId}</div>
          </div>
        ))
      ) : (
        <p className="text-center text-muted-foreground py-10">Audit loglari yo'q</p>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-card p-4 rounded-xl border border-white/10">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
