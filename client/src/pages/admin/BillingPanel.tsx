import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBillingTransactions, useSetPro } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { CreditCard } from "lucide-react";
import { useState } from "react";

export function BillingPanel() {
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
    <div className="admin-panel space-y-4">
      <div className="admin-card glass-card p-5 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">PRO belgilash</h2>
            <p className="text-xs text-muted-foreground">
              To'lov va xizmat muddatini kiriting.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Input
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <div className="grid gap-2 md:grid-cols-2">
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
          </div>
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

      <div className="admin-card glass-card p-4 rounded-2xl border border-white/10">
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
