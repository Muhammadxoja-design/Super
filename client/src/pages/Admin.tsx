import { useEffect, useMemo, useState } from "react";
import {
  useAdminUsersFiltered,
  useAdminUserSearch,
  useAdminTasks,
  useCreateTask,
  useAssignTask,
  usePreviewTaskTarget,
  useUpdateUserStatus,
  useAuditLogs,
  useBroadcasts,
  useBroadcastPreview,
  useBroadcastConfirm,
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useSetPro,
  useBillingTransactions,
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
import { TASK_STATUS_LABELS, DIRECTIONS } from "@shared/schema";
import { useUser } from "@/hooks/use-auth";
import { getRegions, getDistricts, getCities, getMahallas } from "@/lib/locations";

export default function Admin() {
  const { data: user } = useUser();
  const isSuperAdmin = user?.role === "super_admin";
  const [tab, setTab] = useState<
    "tasks" | "registrations" | "users" | "broadcast" | "audit" | "templates" | "billing"
  >("tasks");
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
            ...(isSuperAdmin
              ? [
                  { key: "templates", label: "Templates" },
                  { key: "billing", label: "Billing" },
                ]
              : []),
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
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {tab === "registrations" && <RegistrationsPanel />}

      {tab === "users" && <UsersPanel />}

      {tab === "broadcast" && <BroadcastPanel />}

      {tab === "audit" && <AuditPanel />}

      {tab === "templates" && isSuperAdmin && <TemplatesPanel />}

      {tab === "billing" && isSuperAdmin && <BillingPanel />}
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
  isSuperAdmin,
}: any) {
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
  const [targetType, setTargetType] = useState<string>("USER");
  const [targetValue, setTargetValue] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [forwardMessageId, setForwardMessageId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<{ count: number; sample: any[] } | null>(null);
  const { data: allUsersData, isLoading: usersLoading } = useAdminUsersFiltered({
    status: "approved",
    q: debouncedUserSearch || undefined,
    page: 1,
    pageSize: 50,
  });
  const allUsers = allUsersData?.items ?? [];

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedUserSearch(userSearchTerm.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [userSearchTerm]);

  useEffect(() => {
    if (targetType !== "USER") {
      setSelectedUserId(null);
      setUserSearchTerm("");
    }
    if (targetType === "ALL") {
      setTargetValue("");
    }
  }, [targetType]);

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
    if (targetType !== "USER" && targetType !== "ALL" && !payload.targetValue) {
      toast({ variant: "destructive", title: "Target qiymatini kiriting" });
      return;
    }
    try {
      const preview = await previewTarget.mutateAsync(payload);
      setPreviewInfo({ count: preview.count, sample: preview.sample });
      setPreviewOpen(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: error.message || "Preview ishlamadi",
      });
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
      setTitle("");
      setDescription("");
      setSelectedUserId(null);
      setTargetValue("");
      setTargetType("USER");
      setTemplateId(null);
      setForwardMessageId("");
      setPreviewOpen(false);
      setPreviewInfo(null);
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
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
            >
              <option value="USER">Bitta foydalanuvchi</option>
              <option value="DIRECTION">Yo'nalish bo'yicha</option>
              <option value="VILOYAT">Viloyat bo'yicha</option>
              <option value="TUMAN">Tuman bo'yicha</option>
              <option value="SHAHAR">Shahar bo'yicha</option>
              <option value="MAHALLA">Mahalla bo'yicha</option>
              {isSuperAdmin && <option value="ALL">Barchasi (Super Admin)</option>}
            </select>

            {targetType === "USER" && (
              <>
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
                    {usersLoading ? "Yuklanmoqda..." : "Foydalanuvchi tanlang"}
                  </option>
                  {allUsers.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName || user.username || "User"} #{user.id}
                    </option>
                  ))}
                </select>
                {!usersLoading && allUsers.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    Hali tasdiqlangan user yo?q.{' '}
                    <button
                      type="button"
                      className="text-primary underline underline-offset-4"
                      onClick={onShowPendingTab}
                    >
                      Pending tabga o?tish
                    </button>
                  </div>
                )}
              </>
            )}

            {targetType === "DIRECTION" && (
              <select
                className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              >
                <option value="">Yo'nalishni tanlang</option>
                {DIRECTIONS.map((direction) => (
                  <option key={direction} value={direction}>
                    {direction}
                  </option>
                ))}
              </select>
            )}

            {targetType !== "USER" && targetType !== "DIRECTION" && targetType !== "ALL" && (
              <Input
                placeholder="Target qiymati"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            )}

            <select
              className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
              value={templateId ?? ""}
              onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Template (ixtiyoriy)</option>
              {templates?.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title || `Template #${template.id}`}
                </option>
              ))}
            </select>

            <Input
              placeholder="Channel message ID (forward mode uchun)"
              value={forwardMessageId}
              onChange={(e) => setForwardMessageId(e.target.value)}
            />
            <Button
              onClick={handlePreview}
              disabled={previewTarget.isPending || !title.trim()}
            >
              {previewTarget.isPending ? "Tekshirilmoqda..." : "Preview"}
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Jami" value={stats.total} />
            <StatCard label="Bajarildi" value={stats.done} />
            <StatCard label="Faol" value={stats.active} />
            <StatCard label="Endi qilaman" value={stats.willDo} />
            <StatCard label="Kutilmoqda" value={stats.pending} />
            <StatCard label="Qila olmadim" value={stats.cannotDo} />
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
        {["all", "ACTIVE", "WILL_DO", "PENDING", "DONE", "CANNOT_DO"].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              statusFilter === tab
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "all" ? "Barchasi" : TASK_STATUS_LABELS[tab as keyof typeof TASK_STATUS_LABELS]}
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
                        <div>
                          <span>
                            {assignment.user.firstName || assignment.user.username || "User"} #{assignment.user.id}
                          </span>
                          {assignment.assignment.proofText && (
                            <div className="text-xs text-muted-foreground">
                              Dalil: {assignment.assignment.proofText}
                            </div>
                          )}
                          {assignment.assignment.proofFileId && (
                            <div className="text-xs text-muted-foreground">
                              Dalil fayl: {assignment.assignment.proofFileId}
                            </div>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {TASK_STATUS_LABELS[
                            assignment.assignment.status as keyof typeof TASK_STATUS_LABELS
                          ] || assignment.assignment.status}
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

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>
              Bu buyruq {previewInfo?.count ?? 0} ta foydalanuvchiga yuboriladi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="font-semibold">Namuna:</div>
            {previewInfo?.sample?.length ? (
              previewInfo.sample.map((user) => (
                <div key={user.id} className="text-muted-foreground">
                  {user.firstName || user.username || "User"} #{user.id} — {user.direction || "-"}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">Namuna topilmadi</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleCreate} disabled={createTask.isPending}>
              {createTask.isPending ? "Yuborilmoqda..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RegistrationsPanel() {
  const { data: usersData, isLoading } = useAdminUsersFiltered({
    status: "pending",
    page: 1,
    pageSize: 50,
  });
  const users = usersData?.items ?? [];
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
              <div>📍 {user.viloyat || user.region || ""}{user.tuman || user.district ? `, ${user.tuman || user.district}` : ""}</div>
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
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [viloyat, setViloyat] = useState("");
  const [tuman, setTuman] = useState("");
  const [shahar, setShahar] = useState("");
  const [mahalla, setMahalla] = useState("");
  const [direction, setDirection] = useState("");
  const [sort, setSort] = useState<string>("last_active");
  const [lastActiveAfter, setLastActiveAfter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [debouncedFilters, setDebouncedFilters] = useState({
    q: "",
    status: "",
    viloyat: "",
    tuman: "",
    shahar: "",
    mahalla: "",
    direction: "",
    sort: "last_active",
    lastActiveAfter: "",
  });

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setDebouncedFilters({
        q: searchInput.trim(),
        status,
        viloyat,
        tuman,
        shahar,
        mahalla,
        direction,
        sort,
        lastActiveAfter,
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [status, viloyat, tuman, shahar, mahalla, direction, searchInput, sort, lastActiveAfter]);

  useEffect(() => {
    setTuman("");
    setShahar("");
    setMahalla("");
  }, [viloyat]);

  useEffect(() => {
    setShahar("");
    setMahalla("");
  }, [tuman]);

  useEffect(() => {
    setMahalla("");
  }, [shahar]);

  const regionOptions = useMemo(() => getRegions(), []);
  const districtOptions = useMemo(() => getDistricts(viloyat), [viloyat]);
  const cityOptions = useMemo(() => getCities(viloyat, tuman), [viloyat, tuman]);
  const mahallaOptions = useMemo(
    () => getMahallas(viloyat, tuman, shahar),
    [viloyat, tuman, shahar],
  );

  const { data, isLoading, isFetching } = useAdminUserSearch({
    q: debouncedFilters.q || undefined,
    status: debouncedFilters.status || undefined,
    viloyat: debouncedFilters.viloyat || undefined,
    tuman: debouncedFilters.tuman || undefined,
    shahar: debouncedFilters.shahar || undefined,
    mahalla: debouncedFilters.mahalla || undefined,
    direction: debouncedFilters.direction || undefined,
    lastActiveAfter: debouncedFilters.lastActiveAfter || undefined,
    sort: debouncedFilters.sort,
    page,
    pageSize,
  });

  useEffect(() => {
    if (data?.totalPages && page > data.totalPages) {
      setPage(data.totalPages);
    }
  }, [data?.totalPages, page]);

  const users = data?.items || [];
  const totalPages = data?.totalPages ?? 1;

  const handleReset = () => {
    setSearchInput("");
    setStatus("");
    setViloyat("");
    setTuman("");
    setShahar("");
    setMahalla("");
    setDirection("");
    setSort("last_active");
    setLastActiveAfter("");
    setPage(1);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Ism/familiya/telefon/telegram username/id bo'yicha qidirish..."
            className="pl-9 h-11 bg-card/50 border-border/50"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Barchasi (status)</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm"
            value={viloyat}
            onChange={(e) => setViloyat(e.target.value)}
          >
            <option value="">Barcha viloyatlar</option>
            {regionOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm"
            value={tuman}
            onChange={(e) => setTuman(e.target.value)}
            disabled={!viloyat}
          >
            <option value="">Barcha tumanlar</option>
            {districtOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm"
            value={shahar}
            onChange={(e) => setShahar(e.target.value)}
            disabled={!viloyat || !tuman || cityOptions.length === 0}
          >
            <option value="">Barcha shaharlar</option>
            {cityOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm"
            value={mahalla}
            onChange={(e) => setMahalla(e.target.value)}
            disabled={!viloyat || !tuman}
          >
            <option value="">Barcha mahallalar</option>
            {mahallaOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="">Barcha yo'nalishlar</option>
            {DIRECTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="last_active">Faollik bo'yicha</option>
            <option value="created_at">Yaratilgan sana</option>
            <option value="tasks_completed">Bajarilgan buyruqlar</option>
          </select>

          <Input
            placeholder="Last active after (YYYY-MM-DD)"
            value={lastActiveAfter}
            onChange={(e) => setLastActiveAfter(e.target.value)}
          />

          <Button variant="outline" onClick={handleReset}>
            Reset filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {isFetching ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Qidiruv yangilanmoqda...
            </div>
          ) : null}
          {!users.length ? (
            <div className="text-center text-muted-foreground py-10 space-y-2">
              <div>Foydalanuvchilar topilmadi</div>
              <div className="text-xs">Filtrlarni tozalang yoki qidiruvni qisqartiring</div>
            </div>
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
                  <div>
                    ???? {user.viloyat || user.region || "???"}
                    {user.tuman || user.district ? `, ${user.tuman || user.district}` : ""}
                  </div>
                  <div>???? {user.phone || "???"}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
        <Button
          variant="outline"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Oldingi
        </Button>
        <span className="text-xs text-muted-foreground">
          Sahifa {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
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
  const [sourceMessageId, setSourceMessageId] = useState("");
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
        sourceMessageId: sourceMessageId ? Number(sourceMessageId) : undefined,
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
      setSourceMessageId("");
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
          <Input
            placeholder="Channel message ID (forward mode uchun)"
            value={sourceMessageId}
            onChange={(e) => setSourceMessageId(e.target.value)}
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

function TemplatesPanel() {
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingBodies, setEditingBodies] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!templates) return;
    setEditingBodies((prev) => {
      const next = { ...prev };
      for (const template of templates) {
        if (next[template.id] === undefined) {
          next[template.id] = template.body || "";
        }
      }
      return next;
    });
  }, [templates]);

  const handleCreate = async () => {
    if (!body.trim()) return;
    try {
      await createTemplate.mutateAsync({
        title: title.trim() || undefined,
        body: body.trim(),
      });
      setTitle("");
      setBody("");
      toast({ title: "Template yaratildi" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: error.message || "Template yaratilmadi",
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
      <div className="glass-card p-4 rounded-2xl border border-white/10">
        <h2 className="font-semibold mb-2">Yangi template</h2>
        <div className="space-y-2">
          <Input
            placeholder="Sarlavha"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Matn"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button onClick={handleCreate} disabled={createTemplate.isPending}>
            {createTemplate.isPending ? "Saqlanmoqda..." : "Yaratish"}
          </Button>
        </div>
      </div>

      {templates?.length ? (
        templates.map((template) => {
          const currentBody = editingBodies[template.id] ?? template.body ?? "";
          const isDirty = currentBody !== (template.body ?? "");
          return (
            <div key={template.id} className="glass-card p-4 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{template.title || `Template #${template.id}`}</div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      updateTemplate.mutate({
                        id: template.id,
                        body: currentBody,
                      })
                    }
                    disabled={!isDirty || updateTemplate.isPending}
                  >
                    Saqlash
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteTemplate.mutate(template.id)}
                    disabled={deleteTemplate.isPending}
                  >
                    O'chirish
                  </Button>
                </div>
              </div>
              <Textarea
                value={currentBody}
                onChange={(e) =>
                  setEditingBodies((prev) => ({
                    ...prev,
                    [template.id]: e.target.value,
                  }))
                }
              />
              <div className="text-xs text-muted-foreground mt-2">
                {template.isActive ? "Active" : "Inactive"}
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-center text-muted-foreground py-10">Template yo'q</p>
      )}
    </div>
  );
}

function BillingPanel() {
  const { toast } = useToast();
  const setPro = useSetPro();
  const [userId, setUserId] = useState("");
  const [days, setDays] = useState("30");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const numericUserId = userId ? Number(userId) : undefined;
  const { data: transactions } = useBillingTransactions(numericUserId);

  const handleSetPro = async () => {
    if (!numericUserId || !days) return;
    try {
      await setPro.mutateAsync({
        userId: numericUserId,
        days: Number(days),
        note: note.trim() || undefined,
        amount: amount ? Number(amount) : undefined,
        currency,
      });
      toast({ title: "PRO yangilandi" });
      setAmount("");
      setNote("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: error.message || "PRO yangilanmadi",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 rounded-2xl border border-white/10">
        <h2 className="font-semibold mb-2">PRO belgilash</h2>
        <div className="space-y-2">
          <Input
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <Input
            placeholder="Kunlar"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          <Input
            placeholder="Miqdor (ixtiyoriy)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            placeholder="Valyuta"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
          <Textarea
            placeholder="Izoh"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button onClick={handleSetPro} disabled={setPro.isPending}>
            {setPro.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </div>

      <div className="glass-card p-4 rounded-2xl border border-white/10">
        <h2 className="font-semibold mb-2">Billing history</h2>
        {transactions?.length ? (
          transactions.map((item) => (
            <div key={item.id} className="text-sm text-muted-foreground">
              #{item.id} — {item.amount} {item.currency} ({item.method})
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Transaction yo'q</p>
        )}
      </div>
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
