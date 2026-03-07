import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { useAdminUsersFiltered, useUpdateUserStatus } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export function RegistrationsPanel() {
  const {
    data: usersData,
    isLoading,
    isError,
    error,
  } = useAdminUsersFiltered({
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
  if (isError) {
    return (
      <div className="text-center text-destructive py-10">
        {error instanceof Error
          ? error.message
          : "Foydalanuvchilarni olishda xatolik"}
      </div>
    );
  }

  return (
    <div className="admin-panel space-y-4">
      {users?.length ? (
        users.map((user) => (
          <div
            key={user.id}
            className="admin-card glass-card p-5 rounded-2xl border border-white/5"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {user.direction}
                </p>
              </div>
              <StatusBadge status={user.status} />
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground/80 mb-4">
              <div>
                📍 {user.viloyat || user.region || ""}
                {user.tuman || user.district
                  ? `, ${user.tuman || user.district}`
                  : ""}
              </div>
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
        <p className="text-center text-muted-foreground py-10">
          Kutilayotgan arizalar yo'q
        </p>
      )}

      <Dialog
        open={Boolean(rejectingUserId)}
        onOpenChange={() => setRejectingUserId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rad etish sababi</DialogTitle>
            <DialogDescription>
              Foydalanuvchiga rad etish sababini yozing.
            </DialogDescription>
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
