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
import { Loader2, UserCheck, MapPin, Phone, MessageSquareX, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
      toast({ variant: "destructive", title: "Xatolik", description: error.message });
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
      toast({ variant: "destructive", title: "Xatolik", description: error.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">Tasdiqlash Navbati</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Pending Registration Approval Queue</p>
        </div>
        <div className="px-4 py-1.5 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
          {users.length} kutilayotgan
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {users.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group relative overflow-hidden rounded-[2rem] p-6 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all shadow-xl"
            >
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white/90 leading-tight">{user.firstName} {user.lastName}</h3>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{user.direction || 'Yo\'nalishsiz'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-6 text-xs text-zinc-400 flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-zinc-600" />
                    <span>{user.viloyat}, {user.tuman}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-zinc-600" />
                    <span>{user.phone}</span>
                  </div>
                  <div className="mt-4 p-3 rounded-xl bg-black/20 border border-white/5 text-[10px] italic text-zinc-500">
                     Foydalanuvchi tasdiqlash uchun navbatda turibdi. Ma'lumotlarni tekshiring.
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(user.id)}
                    disabled={updateStatus.isPending}
                    className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-900/20"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1.5" /> Approve
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setRejectingUserId(user.id)}
                    disabled={updateStatus.isPending}
                    className="h-10 rounded-xl bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!users.length && (
          <div className="col-span-full py-32 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-zinc-700" />
            </div>
            <h4 className="text-xl font-display font-bold text-white tracking-tight">Hamma arizalar ko'rib chiqilgan</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">Ayni vaqtda kutilayotgan ro'yxatga olish so'rovlari mavjud emas.</p>
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(rejectingUserId)}
        onOpenChange={() => setRejectingUserId(null)}
      >
        <DialogContent className="bg-[#090a0f] border-white/10 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-black tracking-tighter">Ariza Rad Etish</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Foydalanuvchiga rad etish sababini yozing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Masalan: Ma'lumotlar to'liq emas..."
              className="min-h-[120px] bg-black/40 border-white/5 rounded-2xl p-4 text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectingUserId(null)} className="rounded-xl border-white/5 bg-white/5">Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!reason.trim() || updateStatus.isPending}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 font-bold px-8 uppercase text-[10px] tracking-widest shadow-lg shadow-rose-900/20"
            >
              <MessageSquareX className="h-3 w-3 mr-2" /> Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
