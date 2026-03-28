import { useTranslation } from 'react-i18next';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useSustainability } from '../hooks/useSustainability';
import { toast } from 'sonner';
import { LucideTrendingUp, LucidePackage, LucideZap, LucideMapPin, LucideLeaf, LucideScale, LucideClock, LucideArrowRight, LucideDownload, LucideShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { Skeleton, CardSkeleton } from '../components/Skeleton';
import { Topbar } from '../components/Topbar';

export default function Insights() {
  const { t } = useTranslation(['analytics', 'common']);
  const { stats, loading: statsLoading } = useDashboardStats();
  const { stats: sustStats, loading: sustLoading } = useSustainability();

  const loading = statsLoading || sustLoading;

  if (loading || !sustStats) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Topbar title={t('analytics:title', 'Logistics Intelligence')} />
        <div className="flex-1 p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <CardSkeleton count={4} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2 glass-panel p-8 h-[500px]">
                <Skeleton className="h-full w-full rounded-2xl" />
             </div>
             <div className="glass-panel p-8 h-[500px]">
                <Skeleton className="h-full w-full rounded-2xl" />
             </div>
          </div>
        </div>
      </div>
    );
  }

  const coreCards = [
    { label: t('analytics:cards.total_shipments'), value: stats.activeShipments + stats.deliveredShipments, icon: LucidePackage, color: 'text-[var(--accent)]' },
    { label: t('analytics:cards.active_loads'), value: stats.activeShipments, icon: LucideZap, color: 'text-amber-400' },
    { label: t('analytics:cards.reliability_rate'), value: '98.4%', icon: LucideTrendingUp, color: 'text-emerald-400' },
    { label: t('analytics:cards.avg_cost'), value: `₹${Math.round(stats.totalRevenue / ((stats.deliveredShipments || 1))).toLocaleString()}`, icon: LucideScale, color: 'text-purple-400' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title={t('analytics:title', 'Logistics Intelligence')} />

      <div className="space-y-10 pb-20 overflow-visible p-8 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <h1 className="text-4xl font-black text-white tracking-tighter font-display uppercase">Intelligence Pulse</h1>
             <div className="live-dot" title="REAL-TIME FEED ACTIVE" />
          </div>
          <p className="text-[var(--muted)] font-bold tracking-tight uppercase text-xs">AI-DRIVEN LOGISTICS TELEMETRY & STRATEGIC INSIGHTS</p>
        </div>
        
        <div className="flex items-center gap-4 bg-[var(--surface-soft)] p-2 rounded-2xl border border-[var(--border)] backdrop-blur-md">
          <button 
            onClick={() => toast.success('SYNCHRONIZING RECENT TELEMETRY...')}
            className="px-6 py-3 rounded-xl bg-[var(--bg-deep)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-all flex items-center gap-3 group"
          >
            <LucideZap size={16} className="text-[var(--accent)] group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">LIVE SYNC</span>
          </button>
          <button 
            onClick={() => toast.success(t('analytics:toast.compiling'))}
            className="primary-button h-12 px-6 flex items-center gap-2 group"
          >
            <LucideDownload size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">EXPORT DATA</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {coreCards.map((card, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            key={i} 
            className="glass-card rounded-[2.5rem] p-8 group relative overflow-hidden active:scale-[0.98] transition-all cursor-default"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
               <card.icon size={80} />
            </div>
            <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${card.color.replace('text-', 'bg-')}`} />
               {card.label}
            </div>
            <div className="flex items-end justify-between relative z-10">
               <div className="text-4xl font-black text-white tracking-tighter leading-none">{card.value}</div>
               <div className="text-[10px] font-black text-emerald-400 flex items-center">
                  <LucideTrendingUp size={12} className="mr-1" />
                  +12.4%
               </div>
            </div>
            <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="glass-card rounded-[3rem] p-10 relative overflow-hidden">
            <div className="flex items-center justify-between mb-12">
              <div>
                <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-1">Strategic Trends</div>
                <h4 className="text-2xl font-black text-white font-display uppercase tracking-tight">OPERATIONAL THROUGHPUT</h4>
              </div>
              <div className="flex gap-8">
                {[
                  { label: 'REVENUE', color: 'bg-[var(--accent)]' },
                  { label: 'EFFICIENCY', color: 'bg-emerald-500' }
                ].map((l, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[9px] font-black text-[var(--muted)] uppercase tracking-widest">
                    <div className={cn("w-2.5 h-2.5 rounded-full", l.color)} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="h-72 flex items-end justify-between gap-6 px-4">
              {[55, 75, 45, 90, 65, 85, 95].map((h, i) => (
                <div key={i} className="flex-1 group relative flex flex-col items-center justify-end h-full">
                  <div className="absolute -top-14 bg-[var(--surface-strong)] border border-[var(--border)] text-white text-[9px] font-black py-2.5 px-4 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20 whitespace-nowrap shadow-2xl scale-90 group-hover:scale-100 backdrop-blur-md">
                     WEEK {i+1} • ₹{((h * 1500 + 45000) / 1000).toFixed(1)}K
                  </div>
                  <div 
                    className="w-full bg-[var(--surface-soft)] rounded-2xl group-hover:bg-gradient-to-t group-hover:from-[var(--accent)] group-hover:to-[var(--accent-bright)] transition-all cursor-pointer relative overflow-hidden border border-transparent hover:border-[var(--accent-soft)] hover:shadow-[0_0_30px_rgba(var(--brand-primary-rgb),0.2)]" 
                    style={{ height: `${h}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:from-transparent"></div>
                  </div>
                  <span className="text-[9px] font-black text-[var(--muted)] mt-6 uppercase tracking-[0.2em] opacity-60">MAR {24+i}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="glass-card rounded-[3rem] p-10 space-y-8">
               <div className="flex items-center gap-3">
                  <LucideMapPin className="text-rose-400" size={20} />
                  <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Top Lanes</h4>
               </div>
               <div className="space-y-5">
                  {[
                    { r: 'Chennai → Bengaluru', c: 12, p: 98 },
                    { r: 'Mumbai → Pune', c: 8, p: 92 },
                    { r: 'Hyderabad → Amaravati', c: 5, p: 85 }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] hover:bg-[var(--surface-strong)] transition-all cursor-default group">
                      <div className="flex items-center justify-between">
                         <span className="text-sm font-black text-white group-hover:text-[var(--accent)] transition-colors">{item.r}</span>
                         <span className="text-[10px] font-black text-[var(--muted)] uppercase">{item.c} LOADS</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--bg-deep)] rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${item.p}%` }}
                           className="h-full bg-[var(--accent)] opacity-60" 
                         />
                      </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="glass-card rounded-[3rem] p-10 border-emerald-500/10 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-5">
                  <LucideLeaf size={60} className="text-emerald-400" />
               </div>
               <div className="flex items-center gap-3 mb-10">
                  <LucideLeaf className="text-emerald-400" size={20} />
                  <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Sustainability</h4>
               </div>
               <div className="space-y-8">
                  <div className="flex flex-col">
                     <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest mb-2">CARBON OFFSET TOTAL</span>
                     <div className="text-5xl font-black text-white tracking-tighter leading-none font-display">
                        {Math.round(sustStats.co2_reduction_kg)}
                        <span className="text-lg text-emerald-400 ml-2">KG</span>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-[var(--surface-soft)] p-5 rounded-2xl border border-[var(--border)] hover:bg-[var(--surface-strong)] transition-all">
                        <div className="text-[9px] text-[var(--muted)] font-black uppercase tracking-widest mb-1.5 line-clamp-1">FUEL SAVED</div>
                        <div className="text-xl font-black text-white">{Math.round(sustStats.fuel_saved_liters)} L</div>
                     </div>
                     <div className="bg-[var(--surface-soft)] p-5 rounded-2xl border border-[var(--border)] hover:bg-[var(--surface-strong)] transition-all">
                        <div className="text-[9px] text-[var(--muted)] font-black uppercase tracking-widest mb-1.5 line-clamp-1">MILEAGE SAVED</div>
                        <div className="text-xl font-black text-white">{Math.round(sustStats.distance_saved_km)} KM</div>
                     </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 italic text-[11px] font-bold text-emerald-300 leading-relaxed">
                    "AI matching reduced empty miles by 24.5% this quarter."
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="glass-card rounded-[3rem] p-10 space-y-10">
             <div className="flex items-center gap-3">
                <LucideZap className="text-[var(--accent)]" size={20} />
                <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Network Pulse</h4>
             </div>
             
             <div className="space-y-8">
                <div>
                  <div className="flex mb-4 items-center justify-between">
                     <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">SLA Compliance</span>
                     <span className="text-xs font-black text-[var(--accent-bright)]">98.4%</span>
                  </div>
                  <div className="h-2.5 w-full bg-[var(--bg-deep)] rounded-full overflow-hidden border border-[var(--border)]">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '98.4%' }}
                        className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-bright)] shadow-[0_0_20px_var(--accent-soft)]" 
                     />
                  </div>
                </div>

                <div className="space-y-4">
                   {[
                     { i: LucideClock, t: 'SWIFT SETTLEMENT', v: 'AVG 2.4 HOURS', c: 'text-blue-400' },
                     { i: LucideTrendingUp, t: 'SCALABILITY INDEX', v: 'STABLE • HIGH', c: 'text-emerald-400' },
                     { i: LucideShieldCheck, t: 'DATA INTEGRITY', v: 'ULIP SYNCED', c: 'text-[var(--accent-bright)]' }
                   ].map((metric, i) => (
                     <div key={i} className="flex gap-4 p-5 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] hover:border-[var(--accent-soft)] transition-all cursor-default">
                        <div className={cn("w-12 h-12 rounded-xl bg-[var(--bg-deep)] flex items-center justify-center border border-[var(--border)]", metric.c)}>
                           <metric.i size={22} />
                        </div>
                        <div className="flex flex-col justify-center">
                           <div className="text-[10px] font-black text-white uppercase tracking-widest mb-1">{metric.t}</div>
                           <div className="text-[10px] text-[var(--muted)] font-black italic">{metric.v}</div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="glass-card rounded-[3rem] p-10 space-y-8 relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--accent)] blur-[80px] opacity-20" />
             <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Decision Support</h4>
             <div className="space-y-4">
                {[
                  { t: t('analytics:insights.bengaluru_tip'), color: 'border-l-[var(--accent)]' },
                  { t: t('analytics:insights.tree_equivalent'), color: 'border-l-emerald-500' }
                ].map((tip, i) => (
                  <div key={i} className={cn("bg-[var(--surface-soft)] p-6 rounded-2xl border border-[var(--border)] border-l-4 shadow-sm group hover:bg-[var(--surface-strong)] transition-all", tip.color)}>
                     <p className="text-[11px] text-white leading-relaxed font-black italic opacity-80 group-hover:opacity-100">
                       "{tip.t}"
                     </p>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
   </div>
  );
}
