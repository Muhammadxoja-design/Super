import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

const data = [
  { name: "Du", load: 30, limit: 100 },
  { name: "Se", load: 45, limit: 100 },
  { name: "Ch", load: 25, limit: 100 },
  { name: "Pa", load: 80, limit: 100 },
  { name: "Ju", load: 60, limit: 100 },
  { name: "Sh", load: 95, limit: 100 },
  { name: "Ya", load: 50, limit: 100 },
];

export function SystemChart() {
  return (
    <div className="w-full mb-8">
      <div className="rounded-3xl p-6 bg-[#111218]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_20px_rgba(139,92,246,0.05)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white/95">Tizim va Botlar Faolligi</h2>
            <p className="text-xs text-zinc-400 mt-1">Haftalik o'rtacha server yuklamasi (Load %)</p>
          </div>
          <div className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
            Live
          </div>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#71717a" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#09090b', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
                itemStyle={{ color: '#c084fc' }}
              />
              <Line 
                type="monotone" 
                dataKey="load" 
                stroke="#a855f7" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#18181b', stroke: '#a855f7', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
