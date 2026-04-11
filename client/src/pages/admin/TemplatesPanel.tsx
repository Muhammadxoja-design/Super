import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateTemplate,
  useDeleteTemplate,
  useTemplates,
  useUpdateTemplate,
} from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LayoutGrid, Plus, Save, Trash2, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function TemplatesPanel() {
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
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Create Template Form */}
      <div className="rounded-[2rem] p-8 bg-white/[0.02] border border-white/[0.08] shadow-xl">
        <div className="flex items-center gap-3 mb-6 font-display font-bold text-lg text-white">
          <Plus className="h-5 w-5 text-indigo-400" />
          Yangi Template yaratish
        </div>
        <div className="space-y-4">
          <Input
            placeholder="Template nomi (masalan: Tasdiqlash xabari)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 bg-black/40 border-white/5 rounded-xl text-sm"
          />
          <Textarea
            placeholder="Xabar matni..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[120px] bg-black/40 border-white/5 rounded-2xl text-sm"
          />
          <Button 
            onClick={handleCreate} 
            disabled={createTemplate.isPending || !body.trim()}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-900/20"
          >
            {createTemplate.isPending ? "Saqlanmoqda..." : "Yaratish"}
          </Button>
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-2 mb-2">
          <LayoutGrid className="h-4 w-4 text-zinc-500" />
          <h3 className="text-lg font-display font-bold text-white">Mavjud Templatelar</h3>
        </div>

        <AnimatePresence mode="popLayout">
          {templates?.map((template, i) => {
            const currentBody = editingBodies[template.id] ?? template.body ?? "";
            const isDirty = currentBody !== (template.body ?? "");
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-[1.5rem] p-6 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-sm text-white/90 truncate max-w-[200px]">
                      {template.title || `Unnamed Template #${template.id}`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        updateTemplate.mutate({ id: template.id, body: currentBody })
                      }
                      disabled={!isDirty || updateTemplate.isPending}
                      className="h-8 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-bold uppercase px-3"
                    >
                      <Save className="h-3 w-3 mr-1.5" /> Saqlash
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate.mutate(template.id)}
                      disabled={deleteTemplate.isPending}
                      className="h-8 w-8 p-0 rounded-lg bg-rose-600/10 text-rose-400 border border-rose-500/20 hover:bg-rose-600 hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
                  className="bg-black/20 border-white/5 rounded-xl text-xs text-zinc-400 focus:text-white/90 min-h-[100px] leading-relaxed"
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!templates?.length && (
          <div className="py-20 text-center text-zinc-600 text-sm font-medium">Hali templatelar yaratilmagan</div>
        )}
      </div>
    </div>
  );
}
