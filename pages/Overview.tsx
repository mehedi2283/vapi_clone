import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_METRICS } from '../constants';
import { ArrowUpRight, Clock, Phone, DollarSign } from 'lucide-react';

export const Overview: React.FC = () => {
  const totalCalls = MOCK_METRICS.reduce((acc, curr) => acc + curr.calls, 0);
  const totalMinutes = MOCK_METRICS.reduce((acc, curr) => acc + curr.minutes, 0);
  const totalCost = MOCK_METRICS.reduce((acc, curr) => acc + curr.cost, 0);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-zinc-500 text-sm mt-1">Real-time overview of your assistant's performance.</p>
        </div>
        <div className="flex items-center gap-2">
           <select className="bg-white/5 border border-white/10 text-sm text-zinc-300 rounded-lg px-4 py-2 focus:outline-none focus:border-vapi-accent focus:ring-1 focus:ring-vapi-accent/50 transition-all">
             <option>Last 7 days</option>
             <option>Last 30 days</option>
             <option>Last 3 months</option>
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Total Calls" 
          value={totalCalls.toString()} 
          icon={<Phone className="text-blue-400" size={20} />}
          trend="+12%" 
          data={MOCK_METRICS.map(m => ({ value: m.calls }))}
          color="#60a5fa"
        />
        <MetricCard 
          title="Total Minutes" 
          value={`${totalMinutes}m`} 
          icon={<Clock className="text-purple-400" size={20} />}
          trend="+5.4%" 
          data={MOCK_METRICS.map(m => ({ value: m.minutes }))}
          color="#c084fc"
        />
        <MetricCard 
          title="Total Cost" 
          value={`$${totalCost.toFixed(2)}`} 
          icon={<DollarSign className="text-emerald-400" size={20} />}
          trend="+2.1%" 
          data={MOCK_METRICS.map(m => ({ value: m.cost }))}
          color="#34d399"
        />
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-medium text-white">Usage Analytics</h3>
            <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-vapi-accent"></span>
                    <span className="text-zinc-400">Calls</span>
                </div>
            </div>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_METRICS} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#52525b" 
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#71717a' }}
                dy={10}
              />
              <YAxis 
                stroke="#52525b" 
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#71717a' }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: '#2dd4bf', fontSize: '12px', fontWeight: 500 }}
                cursor={{ stroke: '#ffffff10', strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="calls" 
                stroke="#2dd4bf" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorCalls)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#2dd4bf' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: string; icon: React.ReactNode; trend: string; data: any[]; color: string }> = ({ title, value, icon, trend, data, color }) => {
  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:bg-zinc-900/50 hover:border-white/10 transition-all duration-300 backdrop-blur-sm group">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">{title}</p>
          <h2 className="text-4xl font-bold text-white tracking-tight">{value}</h2>
        </div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/10">
          <ArrowUpRight size={14} />
          <span>{trend}</span>
        </div>
        {/* Tiny sparkline chart mockup */}
        <div className="flex items-end gap-[2px] h-8 opacity-50 group-hover:opacity-100 transition-opacity">
          {data.map((d, i) => (
            <div 
              key={i} 
              style={{ height: `${(d.value / Math.max(...data.map((x:any) => x.value))) * 100}%`, backgroundColor: color }} 
              className="w-1.5 rounded-sm"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};