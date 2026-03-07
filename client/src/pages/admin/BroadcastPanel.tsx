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
import { Loader2, Radio } from "lucide-react";
import { useEffect, useState } from "react";

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
    parsed?: any;
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
    const parsedSourceMessageId = parseOptionalInt(sourceMessageId);
    if (sourceMessageId.trim() && parsedSourceMessageId === undefined) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Channel message ID raqam bo'lishi kerak",
      });
      return;
    }
    try {
      const data = await preview.mutateAsync({
        messageText: messageText.trim(),
        imageUrl: mediaUrl.trim() || undefined,
        sourceMessageId: parsedSourceMessageId,
      });
      setPreviewInfo(data);
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
    const parsedSourceMessageId = parseOptionalInt(sourceMessageId);
    if (sourceMessageId.trim() && parsedSourceMessageId === undefined) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Channel message ID raqam bo'lishi kerak",
      });
      return;
    }
    try {
      await confirm.mutateAsync({
        messageText: messageText.trim(),
        imageUrl: mediaUrl.trim() || undefined,
        sourceMessageId: parsedSourceMessageId,
      });
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
    <div className="admin-panel">
      <div className="admin-card glass-card p-5 rounded-2xl border border-white/10 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Broadcast yuborish</h2>
            <p className="text-xs text-muted-foreground">
              Xabar tayyorlang va preview orqali yuborishni tasdiqlang.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-2">
              Xabar matni
            </div>
            <Textarea
              placeholder="Xabar matni"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
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
          </div>
          <Button
            onClick={handlePreview}
            disabled={preview.isPending || !messageText.trim()}
          >
            {preview.isPending ? "Tekshirilmoqda..." : "Preview"}
          </Button>
        </div>
      </div>

      <div className="admin-card flex items-center gap-2 mb-4 glass-card rounded-2xl border border-white/10 p-4">
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
                <div
                  key={item.id}
                  className="admin-card glass-card p-4 rounded-2xl border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Broadcast #{item.id}</div>
                    <span className="text-xs text-muted-foreground">
                      {item.status}
                    </span>
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
            <p className="text-center text-muted-foreground py-10">
              Broadcast topilmadi
            </p>
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
              Bu xabar {previewInfo?.recipientsCount ?? 0} ta userga yuboriladi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="font-semibold">Xabar:</div>
            <div className="whitespace-pre-wrap text-muted-foreground">
              {previewInfo?.text || messageText}
            </div>
            {previewInfo?.imageUrl && (
              <div className="text-xs text-muted-foreground">
                Rasm URL: {previewInfo.imageUrl}
              </div>
            )}
            {previewInfo?.telegramPayload?.method && (
              <div className="text-xs text-muted-foreground">
                Telegram method: {previewInfo.telegramPayload.method}
              </div>
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
