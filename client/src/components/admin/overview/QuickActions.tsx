import { RotateCw, Trash2, PlusCircle, Settings2 } from "lucide-react";

export function QuickActions() {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg font-semibold text-white/95">Tezkor Boshqaruv</h2>
        <button className="text-xs font-medium text-violet-400 hover:text-violet-300">Barchasi</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all hover:-translate-y-1 group">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
            <RotateCw className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium text-zinc-300 group-hover:text-white">Restart</span>
        </button>

        <button className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all hover:-translate-y-1 group">
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform">
            <Trash2 className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium text-zinc-300 group-hover:text-white">Kesh tozalash</span>
        </button>

        <button className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all hover:-translate-y-1 group">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
            <PlusCircle className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium text-zinc-300 group-hover:text-white">Bot Qo'shish</span>
        </button>

        <button className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all hover:-translate-y-1 group">
          <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-500 group-hover:scale-110 transition-transform">
            <Settings2 className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium text-zinc-300 group-hover:text-white">Sozlamalar</span>
        </button>
      </div>
    </div>
  );
}
