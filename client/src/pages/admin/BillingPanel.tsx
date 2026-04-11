import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBillingTransactions, useSetPro } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, History, Zap, Coins, Calendar, Loader2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function BillingPanel() {
  const { toast } = useToast();
  const setPro = useSetPro();
  const [userId, setUserId] = useState("");
  const [days, setDays] = useState("30");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const numericUserId = userId ? Number(userId) : undefined;
  const { data: transactions, isLoading } = useBillingTransactions(numericUserId);

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
      toast({ title: "PRO statusi yangilandi" });
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
    <div className="space-y-8">
      {/* Set PRO Form */}
      <div className="rounded-[2.5rem] p-8 bg-white/[0.02] border border-white/[0.08] shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3.5 rounded-2xl bg-cyan-600/10 text-cyan-400 ring-1 ring-cyan-500/20">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">PRO Account Management</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Billing & Service Activation</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Foydalanuvchi ID</label>
            <Input
              placeholder="User ID..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-11 bg-black/40 border-white/5 rounded-xl text-sm"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Amal qilish muddati (kun)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <Input
                  placeholder="Kunlar (30)..."
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="pl-10 h-11 bg-black/40 border-white/5 rounded-xl text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">To'lov miqdori</label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <Input
                  placeholder="Summa (UZS)..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 h-11 bg-black/40 border-white/5 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Izoh</label>
            <Textarea
              placeholder="To'lov haqida qo'shimcha ma'lumot..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[100px] bg-black/40 border-white/5 rounded-2xl text-sm"
            />
          </div>

          <Button 
            onClick={handleSetPro} 
            disabled={setPro.isPending || !userId}
            className="w-full h-12 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-cyan-900/20 mt-4 transition-all active:scale-[0.98]"
          >
            {setPro.isPending ? <Loader2 className="animate-spin" /> : "PRO Statusni Faollashtirish"}
          </Button>
        </div>
      </div>

      {/* Billing History */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-2 mb-2">
          <History className="h-4 w-4 text-zinc-500" />
          <h3 className="text-lg font-display font-bold text-white">Billing History</h3>
        </div>

        <div className="space-y-3">
          {numericUserId && isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-zinc-700" /></div>
          ) : (
            <AnimatePresence mode="popLayout">
              {transactions?.length ? (
                transactions.map((item, i) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-9 w-9 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white/90">{item.amount.toLocaleString()} {item.currency}</p>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{item.method || 'Manual Adjustment'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter">#{item.id}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center text-zinc-600 text-sm font-medium">
                  {numericUserId ? "Tranzaksiyalar topilmadi" : "User ID kiriting..."}
                </div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
