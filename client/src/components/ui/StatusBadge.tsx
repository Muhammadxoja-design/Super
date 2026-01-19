import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "pending" | "approved" | "rejected";
  className?: string;
}

const config = {
  pending: {
    label: "Kutilmoqda",
    styles: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  approved: {
    label: "Tasdiqlangan",
    styles: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  rejected: {
    label: "Rad etilgan",
    styles: "bg-red-500/10 text-red-500 border-red-500/20",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, styles } = config[status] || config.pending;

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      styles,
      className
    )}>
      {label}
    </span>
  );
}
