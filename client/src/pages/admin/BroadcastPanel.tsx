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
  useBroadcastConfirm,
  useBroadcastPreview,
  useBroadcasts,
} from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Radio, Send, Image as ImageIcon, MessageSquare, History, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function BroadcastPanel() {
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
  const [previewInfo, setPreviewInfo] = useState<{
    text: string;
    imageUrl?: string | null;
    recipientsCount: number;
    telegramPayload: any;
  } | null>(null);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const parseOptionalInt = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const handlePreview = async () => {
    if (!messageText.trim()) return;
    try {
      const data = await preview.mutateAsync({
        messageText: messageText.trim(),
        imageUrl: mediaUrl.trim() || undefined,
        sourceMessageId: parseOptionalInt(sourceMessageId),
      });
      setPreviewInfo(data);
      setPreviewOpen(true);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Xatolik", description: error.message });
    }
  };

  const handleConfirm = async () => {
    if (!previewInfo) return;
    try {
      await confirm.mutateAsync({
        messageText: messageText.trim(),
        imageUrl: mediaUrl.trim() || undefined,
        sourceMessageId: parseOptionalInt(sourceMessageId),
      });
      setPreviewOpen(false); setPreviewInfo(null);
      setMessageText(""); setMediaUrl(""); setSourceMessageId("");
      toast({ title: "Broadcast jarayoni boshlandi" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Xatolik", description: error.message });
    }
  };

  return (
    <div className="space-y-8">
      {/* Broadcast Composer */}
      <div className="group relative overflow-hidden rounded-[2.5rem] p-8 bg-white/[0.02] border border-white/[0.08] shadow-2xl">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 h-40 w-40 bg-rose-600/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3.5 rounded-2xl bg-rose-600/10 text-rose-400 ring-1 ring-rose-500/20 shadow-lg shadow-rose-900/10">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">Mass Broadcast Composer</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Global Communications Hub</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Xabar Matni</label>
              <span className="text-[10px] text-zinc-500 font-bold">{messageText.length} ta belgi</span>
            </div>
            <Textarea
              placeholder="Xabar matnini kiriting..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="min-h-[160px] bg-black/40 border-white/5 focus:border-rose-500/50 rounded-2xl text-sm leading-relaxed custom-scrollbar"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Media URL (Ixtiyoriy)</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                <Input
                  placeholder="https://rasm-manzili..."
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="pl-10 h-11 bg-black/40 border-white/5 rounded-xl text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Forward ID (Ixtiyoriy)</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                <Input
                  placeholder="Channel message ID..."
                  value={sourceMessageId}
                  onChange={(e) => setSourceMessageId(e.target.value)}
                  className="pl-10 h-11 bg-black/40 border-white/5 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <Button
              onClick={handlePreview}
              disabled={preview.isPending || !messageText.trim()}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-900/20 transition-all active:scale-[0.98]"
            >
              {preview.isPending ? <Loader2 className="animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Preview & Dispatch</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Broadcast History */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <History className="h-4 w-4 text-zinc-500" />
            <h3 className="text-lg font-display font-bold text-white">Broadcast History</h3>
          </div>
          <select
            className="h-9 px-4 rounded-xl border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest outline-none text-zinc-400"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Status: All</option>
            <option value="queued">Queued</option>
            <option value="sending">Sending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-3">
            {broadcasts?.map((item: any, i: number) => {
              const progress = Math.round((item.progress || 0) * 100);
              const isSending = item.status === 'sending';
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="group relative overflow-hidden rounded-2xl p-5 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] transition-all"
                >
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2.5 rounded-xl ${isSending ? 'bg-rose-500 animate-pulse' : 'bg-white/5'} text-white`}>
                        <Radio size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate max-w-md">{item.messageText || "Forward Message"}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-tighter text-zinc-500 leading-none">
                          <span>#{item.id}</span>
                          <div className="h-1 w-1 rounded-full bg-zinc-700" />
                          <span>{item.sentCount || 0} sent</span>
                          <div className="h-1 w-1 rounded-full bg-zinc-700" />
                          <span className={item.status === 'completed' ? 'text-emerald-500' : 'text-rose-400'}>{item.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-48 hidden md:block">
                      <div className="flex justify-between items-end mb-1.5 px-0.5">
                        <span className="text-[10px] font-black text-zinc-600 uppercase">Progress</span>
                        <span className="text-[10px] font-black text-white">{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)] transition-all duration-1000`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md bg-[#090a0f] border-white/10 text-white rounded-[2.5rem] overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 to-orange-600" />
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-black tracking-tighter pt-2">Xabarni Tasdiqlash</DialogTitle>
            <DialogDescription className="text-zinc-500 font-medium">
              Siz <span className="text-white font-bold">{previewInfo?.recipientsCount || 0}</span> ta foydalanuvchiga xabar tarqatmoqchisiz.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Preview</label>
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{previewInfo?.text || messageText}</div>
            </div>
            {mediaUrl && (
              <div className="space-y-1 pt-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Attached Media</label>
                <div className="aspect-video rounded-xl border border-white/5 bg-black/40 flex items-center justify-center text-[10px] font-bold text-zinc-600 uppercase">
                  Image Preview Linked
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)} className="rounded-xl border-white/5 bg-white/5 font-bold uppercase text-[10px] tracking-widest">Bekor Qilish</Button>
            <Button onClick={handleConfirm} disabled={confirm.isPending} className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-900/20">
              Confirm & Start broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
