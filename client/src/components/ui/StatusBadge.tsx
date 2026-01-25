import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const config: Record<string, { label: string; styles: string }> = {
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
  admin: {
    label: "Admin",
    styles: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  limited_admin: {
    label: "Limited Admin",
    styles: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  super_admin: {
    label: "Super Admin",
    styles: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  },
  user: {
    label: "User",
    styles: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, styles } = config[status] || {
    label: status,
    styles: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        styles,
        className
      )}
    >
      {label}
    </span>
  );
}
