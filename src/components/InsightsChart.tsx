import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { chartData } from '../data/mockData';
import { TrendingUp, Sparkles } from 'lucide-react';

export const InsightsChart: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Cost Efficiency Bar Chart */}
      <div className="lg:col-span-7 bg-surface-low rounded-3xl p-8 border border-white/5">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h3 className="text-xl font-bold font-headline">Cost Efficiency</h3>
            <p className="text-sm text-white/40">Kinetic AI vs. Traditional Logistics ($)</p>
          </div>
          <select className="bg-surface-high border-none text-[10px] font-bold uppercase tracking-widest rounded-xl focus:ring-1 focus:ring-cyan-accent py-1.5 px-3">
            <option>Last 6 Months</option>
            <option>Year to Date</option>
          </select>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#ffffff40', fontSize: 10 }} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1C1B1B', border: '1px solid #ffffff10', borderRadius: '12px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Bar dataKey="traditional" fill="#ffffff10" radius={[4, 4, 0, 0]} />
              <Bar dataKey="kinetic" fill="#00E5FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-8 flex gap-6 border-t border-white/5 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-white/10"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Traditional Logistics</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-cyan-accent"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Kinetic Efficiency</span>
          </div>
        </div>
      </div>

      {/* CO2 Trajectory Area Chart */}
      <div className="lg:col-span-5 bg-surface-low rounded-3xl p-8 border border-white/5 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl font-bold font-headline mb-2">CO₂ Trajectory</h3>
          <p className="text-sm text-white/40 mb-8">Carbon footprint reduction path</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorKinetic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1C1B1B', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="kinetic" 
                  stroke="#7C3AED" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorKinetic)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="bg-surface-high p-4 rounded-2xl border border-white/5">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1 font-bold">Total Offset</div>
              <div className="text-lg font-bold">4.8k kg</div>
            </div>
            <div className="bg-surface-high p-4 rounded-2xl border border-white/5">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1 font-bold">Eco-Score</div>
              <div className="text-lg font-bold">94/100</div>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-purple-accent/5 rounded-full blur-[60px]"></div>
      </div>
    </div>
  );
};
