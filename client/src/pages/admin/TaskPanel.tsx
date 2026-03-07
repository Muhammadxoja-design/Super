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
import { Activity, ClipboardList, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { StatCard } from "./StatCard";

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
  const [targetType, setTargetType] = useState<string>(
    canSearchUsers ? "USER" : "DIRECTION",
  );
  const [targetValue, setTargetValue] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [forwardMessageId, setForwardMessageId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<{
    count: number;
    sample: any[];
  } | null>(null);
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

  useEffect(() => {
    if (!canSearchUsers && targetType === "USER") {
      setTargetType("DIRECTION");
    }
  }, [canSearchUsers, targetType]);

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
        targetValue:
          targetType === "USER" ? undefined : targetValue.trim() || undefined,
        userId: targetType === "USER" ? selectedUserId || undefined : undefined,
        templateId: templateId || undefined,
        forwardMessageId: forwardMessageId
          ? Number(forwardMessageId)
          : undefined,
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
    <div className="admin-panel">
      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr] mb-6">
        <div className="glass-card admin-card p-5 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Yangi buyruq</h2>
              <p className="text-xs text-muted-foreground">
                Target tanlang, preview qiling va jo'nating.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-2">Sarlavha</div>
              <Input
                placeholder="Buyruq sarlavhasi"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-2">Tavsif</div>
              <Textarea
                placeholder="Tavsif (ixtiyoriy)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-2">
                Target turi
              </div>
              <select
                className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
              >
                {canSearchUsers && (
                  <option value="USER">Bitta foydalanuvchi</option>
                )}
                <option value="DIRECTION">Yo'nalish bo'yicha</option>
                <option value="VILOYAT">Viloyat bo'yicha</option>
                <option value="TUMAN">Tuman bo'yicha</option>
                <option value="SHAHAR">Shahar bo'yicha</option>
                <option value="MAHALLA">Mahalla bo'yicha</option>
                {isSuperAdmin && (
                  <option value="ALL">Barchasi (Super Admin)</option>
                )}
              </select>
            </div>

            {canSearchUsers && targetType === "USER" && (
              <>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Foydalanuvchini qidirish
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Ism, username yoki telefon"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Foydalanuvchi tanlang
                  </div>
                  <select
                    className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
                    value={selectedUserId ?? ""}
                    onChange={(e) =>
                      setSelectedUserId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    disabled={usersLoading}
                  >
                    <option value="">
                      {usersLoading
                        ? "Yuklanmoqda..."
                        : `Foydalanuvchi tanlang (${totalUsers})`}
                    </option>
                    {allUsers.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName || user.username || "User"} #{user.id}
                        {user.username ? ` (@${user.username})` : ""}
                        {user.phone ? ` — ${user.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {!usersLoading && allUsers.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    Hali tasdiqlangan user yo'q.{" "}
                    <button
                      type="button"
                      className="text-primary underline underline-offset-4"
                      onClick={onShowPendingTab}
                    >
                      Pending tabga o'tish
                    </button>
                  </div>
                )}
              </>
            )}

            {targetType === "DIRECTION" && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">
                  Yo'nalish
                </div>
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
              </div>
            )}

            {targetType !== "USER" &&
              targetType !== "DIRECTION" &&
              targetType !== "ALL" && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Target qiymati
                  </div>
                  <Input
                    placeholder="Target qiymati"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  />
                </div>
              )}

            <div>
              <div className="text-xs text-muted-foreground mb-2">Template</div>
              <select
                className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
                value={templateId ?? ""}
                onChange={(e) =>
                  setTemplateId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Template (ixtiyoriy)</option>
                {templates?.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title || `Template #${template.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-2">
                Forward message ID
              </div>
              <Input
                placeholder="Channel message ID (forward mode uchun)"
                value={forwardMessageId}
                onChange={(e) => setForwardMessageId(e.target.value)}
              />
            </div>
            <Button
              onClick={handlePreview}
              disabled={previewTarget.isPending || !title.trim()}
            >
              {previewTarget.isPending ? "Tekshirilmoqda..." : "Preview"}
            </Button>
          </div>
        </div>

        {stats && (
          <div className="admin-card glass-card p-5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Umumiy statistikalar</h3>
                <p className="text-xs text-muted-foreground">
                  Hozirgi statuslar bo'yicha tezkor ko'rinish.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Jami" value={stats.total} />
              <StatCard label="Bajarildi" value={stats.done} />
              <StatCard label="Faol" value={stats.active} />
              <StatCard label="Endi qilaman" value={stats.willDo} />
              <StatCard label="Kutilmoqda" value={stats.pending} />
              <StatCard label="Qila olmadim" value={stats.cannotDo} />
              <StatCard
                label="Bajarilgan foiz"
                value={`${stats.completionRate}%`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="admin-card flex gap-2 mb-4 glass-card rounded-2xl border border-white/10 p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buyruqlarni qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-card flex p-1 bg-card/50 rounded-xl mb-6 overflow-x-auto no-scrollbar">
        {["all", "ACTIVE", "WILL_DO", "PENDING", "DONE", "CANNOT_DO"].map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                statusFilter === tab
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "all"
                ? "Barchasi"
                : TASK_STATUS_LABELS[tab as keyof typeof TASK_STATUS_LABELS]}
            </button>
          ),
        )}
      </div>

      {tasksLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {taskData?.tasks?.length ? (
            taskData.tasks.map((item: any) => (
              <div
                key={item.task.id}
                className="admin-card glass-card p-5 rounded-2xl border border-white/5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-semibold text-lg">
                      {item.task.title}
                    </div>
                    {item.task.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.task.description}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.assignments.length} ta biriktirish
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {item.assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Biriktirilmagan
                    </p>
                  ) : (
                    item.assignments.map((assignment: any) => (
                      <div
                        key={assignment.assignment.id}
                        className="flex flex-col gap-2 rounded-xl border border-white/5 bg-white/5 p-3 text-sm md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <span>
                            {assignment.user.firstName ||
                              assignment.user.username ||
                              "User"}{" "}
                            #{assignment.user.id}
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
                            assignment.assignment
                              .status as keyof typeof TASK_STATUS_LABELS
                          ] || assignment.assignment.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-10">
              Buyruqlar topilmadi
            </p>
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
                  {user.firstName || user.username || "User"} #{user.id} —{" "}
                  {user.direction || "-"}
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
