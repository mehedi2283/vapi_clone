import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_METRICS } from '../constants';
import { ArrowUpRight, Clock, Phone, DollarSign } from 'lucide-react';

export const Overview: React.FC = () => {
  const totalCalls = MOCK_METRICS.reduce((acc, curr) => acc + curr.calls, 0);
  const totalMinutes = MOCK_METRICS.reduce((acc, curr) => acc + curr.minutes, 0);
  const totalCost = MOCK_METRICS.reduce((acc, curr) => acc + curr.cost, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <div className="flex items-center gap-2">
           <select className="bg-vapi-card border border-vapi-border text-sm text-zinc-300 rounded-md px-3 py-1.5 focus:outline-none focus:border-vapi-accent">
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

      <div className="bg-vapi-card border border-vapi-border rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-6">Call Volume & Cost</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_METRICS}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#71717a" 
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#71717a" 
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#2dd4bf' }}
              />
              <Area 
                type="monotone" 
                dataKey="calls" 
                stroke="#2dd4bf" 
                fillOpacity={1} 
                fill="url(#colorCalls)" 
                strokeWidth={2}
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
    <div className="bg-vapi-card border border-vapi-border rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-zinc-400 text-sm font-medium mb-1">{title}</p>
          <h2 className="text-3xl font-bold text-white">{value}</h2>
        </div>
        <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
          <ArrowUpRight size={14} />
          <span>{trend} vs last period</span>
        </div>
        {/* Tiny sparkline chart mockup */}
        <div className="flex items-end gap-1 h-8">
          {data.map((d, i) => (
            <div 
              key={i} 
              style={{ height: `${(d.value / Math.max(...data.map((x:any) => x.value))) * 100}%`, backgroundColor: color }} 
              className="w-1.5 rounded-t-sm opacity-50"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};