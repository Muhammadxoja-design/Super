import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface DirectionCardProps {
  title: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

export function DirectionCard({ title, selected, onClick }: DirectionCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden",
        "flex items-center justify-between gap-4",
        selected 
          ? "bg-primary/10 border-primary shadow-[0_0_20px_-10px_hsl(var(--primary))]" 
          : "bg-card border-border hover:border-primary/50"
      )}
    >
      <div className="flex flex-col gap-1 z-10">
        <h3 className={cn("font-display font-semibold", selected ? "text-primary" : "text-card-foreground")}>
          {title}
        </h3>
        {/* Abstract pattern decoration could go here */}
      </div>

      <div className={cn(
        "w-6 h-6 rounded-full border flex items-center justify-center transition-colors duration-200",
        selected ? "bg-primary border-primary" : "border-muted-foreground/30"
      )}>
        {selected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
      </div>

      {selected && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
      )}
    </motion.div>
  );
}
