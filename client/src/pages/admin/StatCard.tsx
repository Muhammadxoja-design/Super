export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="glass-card p-4 rounded-xl border border-white/10">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
