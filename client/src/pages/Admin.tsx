import { useMemo, useState } from "react";
import {
  useAdminUsers,
  useAdminTasks,
  useCreateTask,
  useAssignTask,
} from "@/hooks/use-admin";
import { Loader2, Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const [tab, setTab] = useState<"users" | "tasks">("tasks");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const { data: taskData, isLoading: tasksLoading } = useAdminTasks(
    statusFilter === "all" ? undefined : statusFilter,
    searchTerm
  );

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 page-enter">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Admin Panel</h1>
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          variant={tab === "tasks" ? "default" : "outline"}
          onClick={() => setTab("tasks")}
        >
          Buyruqlar
        </Button>
        <Button
          variant={tab === "users" ? "default" : "outline"}
          onClick={() => setTab("users")}
        >
          Foydalanuvchilar
        </Button>
      </div>

      {tab === "tasks" ? (
        <TaskPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          tasksLoading={tasksLoading}
          taskData={taskData}
          users={users || []}
        />
      ) : (
        <UserPanel users={users || []} isLoading={usersLoading} />
      )}
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
  users,
}: any) {
  const createTask = useCreateTask();
  const assignTask = useAssignTask();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const stats = taskData?.stats;

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      const task = await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
      });
      if (selectedUserId) {
        await assignTask.mutateAsync({ taskId: task.id, userId: selectedUserId });
      }
      setTitle("");
      setDescription("");
      setSelectedUserId(null);
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
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.firstName || user.username || "User"} #{user.id}
                </option>
              ))}
            </select>
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-card p-4 rounded-xl border border-white/10">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function UserPanel({ users, isLoading }: { users: any[]; isLoading: boolean }) {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      `${user.firstName || ""} ${user.lastName || ""} ${user.username || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9 h-11 bg-card/50 border-border/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
            filteredUsers.map((user) => <UserCard key={user.id} user={user} />)
          )}
        </div>
      )}
    </div>
  );
}

function UserCard({ user }: { user: any }) {
  return (
    <div className="glass-card p-5 rounded-2xl border border-white/5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">{user.firstName || user.username}</h3>
          <p className="text-sm text-muted-foreground">{user.direction || "-"}</p>
        </div>
        <StatusBadge status={user.isAdmin ? "admin" : "user"} />
      </div>

      <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground/80">
        <div>📍 {user.region || "—"}</div>
        <div>📞 {user.phone || "—"}</div>
      </div>

      {user.isAdmin && (
        <div className="flex gap-3 mt-4 pt-4 border-t border-border/50">
          <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" size="sm" disabled>
            <Check className="w-4 h-4 mr-2" />
            Admin
          </Button>
        </div>
      )}
    </div>
  );
}
