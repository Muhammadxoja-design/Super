import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { motion } from "framer-motion";

const data = [
  { name: "Du", load: 32, api: 45 },
  { name: "Se", load: 48, api: 52 },
  { name: "Ch", load: 28, api: 38 },
  { name: "Pa", load: 82, api: 75 },
  { name: "Ju", load: 65, api: 60 },
  { name: "Sh", load: 95, api: 85 },
  { name: "Ya", load: 52, api: 48 },
];

export function SystemChart() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="w-full mb-8"
    >
      <div className="relative overflow-hidden rounded-[2.5rem] p-8 bg-white/[0.02] border border-white/[0.08] shadow-2xl">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 h-32 w-32 bg-violet-600/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">System Performance</h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-1">Real-time Telemetry Analytics</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Server Load</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">API Activity</span>
            </div>
            <div className="ml-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest">
              Live
            </div>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#3f3f46" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                dy={10}
                className="font-bold uppercase tracking-widest"
              />
              <YAxis 
                stroke="#3f3f46" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `${val}%`}
                className="font-bold"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#090a0f', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '1.5rem',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(20px)'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ color: '#71717a', marginBottom: '8px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
              />
              <Area 
                type="monotone" 
                dataKey="load" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorLoad)"
                animationDuration={2000}
              />
              <Area 
                type="monotone" 
                dataKey="api" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorApi)"
                animationDuration={2000}
                animationDelay={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
