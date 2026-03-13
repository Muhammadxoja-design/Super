import { useState, useRef, useEffect } from "react";
import { useAIExplain } from "@/hooks/use-ai";
import {
  Bot,
  User,
  Send,
  Sparkles,
  Loader2,
  X,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
  isSteps?: boolean;
}

interface TaskAIChatProps {
  task: {
    title: string;
    description?: string | null;
  };
  onClose: () => void;
}

export function TaskAIChat({ task, onClose }: TaskAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Salom! Men sizning AI yordamchingizman. "${task.title}" topshirig'ini tushunishga yoki bajarish rejasini tuzishga yordam beraman. Nima haqida so'ramoqchisiz?`,
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const explain = useAIExplain();

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, directMessage?: string) => {
    e?.preventDefault();
    const userMessage = (directMessage || input).trim();
    if (!userMessage || explain.isPending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const response = await explain.mutateAsync({
        taskTitle: task.title,
        taskDescription: task.description,
        question: userMessage,
      });

      setMessages((prev) => {
        const next: Message[] = [
          ...prev,
          { role: "assistant", content: response.answer },
        ];
        if (response.steps && response.steps.length) {
          next.push({
            role: "assistant",
            content: response.steps
              .map((step, idx) => `${idx + 1}. ${step}`)
              .join("\n"),
            isSteps: true,
          });
        }
        return next;
      });
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Kechirasiz, xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
        },
      ]);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSend(undefined, prompt);
  };

  return (
    <div className="flex flex-col h-[80vh] bg-background border-t rounded-t-3xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm">AI Yordamchi</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                Online
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Chat Body */}
      <div
        ref={scrollRef}
        className="flex-1 p-6 space-y-4 overflow-y-auto"
      >
        <div className="flex flex-col gap-4 min-h-full">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex items-end gap-2 max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                  msg.role === "user"
                    ? "bg-primary border-primary/20"
                    : "bg-card border-white/5",
                )}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Bot className="w-4 h-4 text-primary" />
                )}
              </div>
              <div
                className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-secondary/50 backdrop-blur-sm border border-white/5 text-foreground rounded-bl-none shadow-sm",
                )}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
          {explain.isPending && (
            <div className="flex items-end gap-2 max-w-[85%] mr-auto text-muted-foreground">
              <div className="w-8 h-8 rounded-full bg-card border border-white/5 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
              <div className="p-3 bg-secondary/30 rounded-2xl rounded-bl-none italic text-xs">
                AI o'ylamoqda...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Input */}
      <div className="p-6 border-t bg-card/30">
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              "Tushuntirib ber",
              "Reja tuzib ber",
              "Qanday boshlayman?",
              "Maslahat ber",
            ].map((p) => (
              <button
                key={p}
                onClick={() => handleQuickPrompt(p)}
                className="text-[11px] px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-primary/10 hover:border-primary/20 transition-all text-muted-foreground hover:text-primary"
              >
                {p}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={handleSend}
          className="relative flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Xabar yozing..."
            className="rounded-2xl pr-12 bg-background/50 border-white/10 h-12 focus-visible:ring-primary/30"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || explain.isPending}
            className="absolute right-1.5 rounded-xl h-9 w-9"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
