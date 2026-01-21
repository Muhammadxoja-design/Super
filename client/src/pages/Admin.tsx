import { useEffect, useState } from "react";
import {
  useAdminUsersFiltered,
  useAdminTasks,
  useCreateTask,
  useAssignTask,
  useUpdateUserStatus,
  useAuditLogs,
  useBroadcasts,
  useBroadcastPreview,
  useBroadcastConfirm,
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
  const [tab, setTab] = useState<
    "tasks" | "registrations" | "users" | "broadcast" | "audit"
  >("tasks");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
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
    taskPage * taskLimit
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
            { key: "broadcast", label: "Broadcast" },
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
          taskPage={taskPage}
          taskLimit={taskLimit}
          setTaskPage={setTaskPage}
          onShowPendingTab={() => setTab("registrations")}
        />
      )}

      {tab === "registrations" && <RegistrationsPanel />}

      {tab === "users" && <UsersPanel />}

      {tab === "broadcast" && <BroadcastPanel />}

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
  taskPage,
  taskLimit,
  setTaskPage,
  onShowPendingTab,
}: any) {
  const createTask = useCreateTask();
  const assignTask = useAssignTask();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [debouncedUserSearch, setDebouncedUserSearch] = useState("");
  const [assignRegion, setAssignRegion] = useState("");
  const [assignDirection, setAssignDirection] = useState("");
  const { data: allUsers, isLoading: usersLoading } = useAdminUsersFiltered({
    status: "approved",
    search: debouncedUserSearch || undefined,
  });

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedUserSearch(userSearchTerm.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [userSearchTerm]);

  const stats = taskData?.stats;

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      const task = await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
      });
      await assignTask.mutateAsync({
        taskId: task.id,
        userId: selectedUserId || undefined,
        region: assignRegion || undefined,
        direction: assignDirection || undefined,
      });
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Foydalanuvchini qidirish..."
                className="pl-9 h-11 bg-card/50 border-border/50"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
              value={selectedUserId ?? ""}
              onChange={(e) =>
                setSelectedUserId(e.target.value ? Number(e.target.value) : null)
              }
              disabled={usersLoading}
            >
              <option value="">
                {usersLoading
                  ? "Yuklanmoqda..."
                  : "Foydalanuvchi tanlang (ixtiyoriy)"}
              </option>
              {allUsers?.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.firstName || user.username || "User"} #{user.id}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Foydalanuvchi tanlanmasa, buyruq barcha tasdiqlangan
              foydalanuvchilarga yuboriladi.
            </p>
            {!usersLoading && (!allUsers || allUsers.length === 0) && (
              <div className="text-sm text-muted-foreground">
                Hali tasdiqlangan user yo‘q.{" "}
                <button
                  type="button"
                  className="text-primary underline underline-offset-4"
                  onClick={onShowPendingTab}
                >
                  Pending tabga o‘tish
                </button>
              </div>
            )}
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

      <div className="flex justify-between items-center mt-6">
        <Button
          variant="outline"
          onClick={() => setTaskPage(Math.max(0, taskPage - 1))}
          disabled={taskPage === 0}
        >
          Oldingi
        </Button>
        <span className="text-xs text-muted-foreground">
          Sahifa {taskPage + 1}
        </span>
        <Button
          variant="outline"
          onClick={() => setTaskPage(taskPage + 1)}
          disabled={!taskData?.tasks || taskData.tasks.length < taskLimit}
        >
          Keyingi
        </Button>
      </div>
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
  const [page, setPage] = useState(0);
  const limit = 30;
  useEffect(() => {
    setPage(0);
  }, [status, region, direction, searchTerm]);
  const { data: users, isLoading } = useAdminUsersFiltered({
    status: status || undefined,
    region: region || undefined,
    direction: direction || undefined,
    search: searchTerm || undefined,
    limit,
    offset: page * limit,
  });

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
          {!users?.length ? (
            <p className="text-center text-muted-foreground py-10">Foydalanuvchilar topilmadi</p>
          ) : (
            users.map((user) => (
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

      <div className="flex justify-between items-center mt-6">
        <Button
          variant="outline"
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
        >
          Oldingi
        </Button>
        <span className="text-xs text-muted-foreground">
          Sahifa {page + 1}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage(page + 1)}
          disabled={!users || users.length < limit}
        >
          Keyingi
        </Button>
      </div>
    </div>
  );
}

function BroadcastPanel() {
  const [messageText, setMessageText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;
  const { toast } = useToast();
  const preview = useBroadcastPreview();
  const confirm = useBroadcastConfirm();
  const { data: broadcasts, isLoading } = useBroadcasts({
    status: statusFilter || undefined,
    limit,
    offset: page * limit,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<{ id: number; totalCount: number } | null>(
    null
  );

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const handlePreview = async () => {
    if (!messageText.trim()) return;
    try {
      const data = await preview.mutateAsync({
        messageText: messageText.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
      });
      setPreviewInfo({ id: data.id, totalCount: data.totalCount });
      setPreviewOpen(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: error.message || "Preview ishlamadi",
      });
    }
  };

  const handleConfirm = async () => {
    if (!previewInfo) return;
    try {
      await confirm.mutateAsync(previewInfo.id);
      setPreviewOpen(false);
      setPreviewInfo(null);
      setMessageText("");
      setMediaUrl("");
      toast({ title: "Broadcast jo'natish boshlandi" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: error.message || "Broadcast tasdiqlanmadi",
      });
    }
  };

  return (
    <div>
      <div className="glass-card p-4 rounded-2xl border border-white/10 mb-6">
        <h2 className="font-semibold mb-2">Broadcast yuborish</h2>
        <div className="space-y-2">
          <Textarea
            placeholder="Xabar matni"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
          <Input
            placeholder="Rasm URL (ixtiyoriy)"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
          />
          <Button onClick={handlePreview} disabled={preview.isPending || !messageText.trim()}>
            {preview.isPending ? "Tekshirilmoqda..." : "Preview"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Barcha statuslar</option>
          <option value="draft">Draft</option>
          <option value="queued">Queued</option>
          <option value="sending">Sending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts?.length ? (
            broadcasts.map((item: any) => {
              const total = item.totalCount || 0;
              const sent = item.sentCount || 0;
              const failed = item.failedCount || 0;
              const progress = Math.round((item.progress || 0) * 100);
              return (
                <div key={item.id} className="glass-card p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Broadcast #{item.id}</div>
                    <span className="text-xs text-muted-foreground">{item.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Sent {sent} / Failed {failed} / Total {total}
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-muted-foreground py-10">Broadcast topilmadi</p>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
        <Button
          variant="outline"
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
        >
          Oldingi
        </Button>
        <span className="text-xs text-muted-foreground">Sahifa {page + 1}</span>
        <Button
          variant="outline"
          onClick={() => setPage(page + 1)}
          disabled={!broadcasts || broadcasts.length < limit}
        >
          Keyingi
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Broadcast preview</DialogTitle>
            <DialogDescription>
              Bu xabar {previewInfo?.totalCount ?? 0} ta userga yuboriladi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="font-semibold">Xabar:</div>
            <div className="whitespace-pre-wrap text-muted-foreground">
              {messageText}
            </div>
            {mediaUrl.trim() && (
              <div className="text-xs text-muted-foreground">Rasm URL: {mediaUrl}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleConfirm} disabled={confirm.isPending}>
              {confirm.isPending ? "Yuborilmoqda..." : "Confirm send to ALL"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
