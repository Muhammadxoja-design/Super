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
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function TemplatesPanel() {
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingBodies, setEditingBodies] = useState<Record<number, string>>(
    {},
  );

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
    <div className="admin-panel space-y-4">
      <div className="admin-card glass-card p-5 rounded-2xl border border-white/10">
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
            <div
              key={template.id}
              className="admin-card glass-card p-4 rounded-2xl border border-white/10"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">
                  {template.title || `Template #${template.id}`}
                </div>
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
