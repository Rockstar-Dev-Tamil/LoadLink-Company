import { useMemo, useState } from 'react';
import { useDrivers } from '../hooks/useDrivers';
import { Topbar } from '../components/Topbar';
import { Skeleton } from '../components/Skeleton';
import { ChatWindow } from '../components/ChatWindow';
import { 
  LucideUserRound, 
  LucideTruck, 
  LucideShieldCheck, 
  LucideMapPin, 
  LucideClock, 
  LucideSignal, 
  LucideSignalLow,
  LucideMessageCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function Drivers() {
  const { drivers, loading } = useDrivers();
  const [chatContext, setChatContext] = useState<{
    shipmentId: string;
    driverId: string;
    driverName: string;
  } | null>(null);

  const driverStats = useMemo(() => {
    const online = drivers.filter(d => d.user_locations && (Date.now() - Date.parse(d.user_locations.updated_at)) < 300000).length;
    return {
      total: drivers.length,
      online,
      verified: drivers.filter(d => d.trucks?.[0]?.ulip_verified).length
    };
  }, [drivers]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Drivers" subtitle="Live partner network monitoring" />
      
      <div className="page-scroll pb-24">
        <section className="hero-card mb-8">
          <div className="hero-copy">
            <div className="section-label uppercase tracking-widest font-black text-indigo-400">Network Intelligence</div>
            <h1 className="hero-title">Manage your growing fleet with real-time signal monitoring.</h1>
            <p className="hero-description text-indigo-100/60">
              Every driver card below is connected to their live mobile GPS broadcast and ULIP verification status.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="glass-panel p-6 bg-white/5 border-white/10 rounded-3xl">
              <div className="text-[10px] font-black uppercase text-indigo-400 mb-1 tracking-widest">Active Partners</div>
              <div className="text-4xl font-black">{driverStats.total}</div>
            </div>
            <div className="glass-panel p-6 bg-white/5 border-white/10 rounded-3xl">
              <div className="text-[10px] font-black uppercase text-emerald-400 mb-1 tracking-widest">Live Now</div>
              <div className="text-4xl font-black">{driverStats.online}</div>
            </div>
            <div className="glass-panel p-6 bg-white/5 border-white/10 rounded-3xl">
              <div className="text-[10px] font-black uppercase text-amber-400 mb-1 tracking-widest">ULIP Verified</div>
              <div className="text-4xl font-black">{driverStats.verified}</div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Skeleton className="h-[280px] rounded-[32px]" count={6} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {drivers.map(driver => {
              const isOnline = driver.user_locations && (Date.now() - Date.parse(driver.user_locations.updated_at)) < 300000;
              const lastSeen = driver.user_locations ? formatDistanceToNow(new Date(driver.user_locations.updated_at), { addSuffix: true }) : 'Never';
              const truck = driver.trucks?.[0];

              return (
                <div key={driver.id} className="card group hover:border-[var(--accent)] transition-all cursor-default">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--surface-strong)] to-[var(--bg-base)] border border-white/5 flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform">
                        <LucideUserRound size={28} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black leading-tight tracking-tight">{driver.name}</h3>
                        <div className="text-xs text-[var(--muted)] font-black uppercase tracking-widest">{driver.home_city || 'Regional Hub'}</div>
                      </div>
                    </div>
                    <div className={`p-2 rounded-xl border ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                      {isOnline ? <LucideSignal size={18} /> : <LucideSignalLow size={18} />}
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm py-2 px-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 text-[var(--muted)]">
                        <LucideTruck size={14} />
                        <span className="font-black uppercase text-[10px] tracking-widest">Vehicle</span>
                      </div>
                      <span className="font-bold">{truck?.vehicle_number || '--'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm py-2 px-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 text-[var(--muted)]">
                        <LucideShieldCheck size={14} />
                        <span className="font-black uppercase text-[10px] tracking-widest">ULIP Trust</span>
                      </div>
                      <span className={truck?.ulip_verified ? 'text-emerald-400 font-bold' : 'text-[var(--muted)] font-bold'}>
                        {truck?.ulip_verified ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[var(--muted)]">
                      <LucideClock size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Last: {lastSeen}</span>
                    </div>
                    <button 
                      onClick={() => {
                        const activeBooking = driver.bookings?.find(b => b.status === 'in_progress' || b.status === 'requested');
                        if (activeBooking?.shipment_id) {
                          setChatContext({
                            shipmentId: activeBooking.shipment_id,
                            driverId: driver.id,
                            driverName: driver.name,
                          });
                        } else {
                          toast.info(`No active shipment found for ${driver.name}.`);
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-white/5 text-[var(--accent)] transition-colors"
                    >
                      <LucideMessageCircle size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {chatContext ? (
        <ChatWindow
          shipmentId={chatContext.shipmentId}
          driverId={chatContext.driverId}
          driverName={chatContext.driverName}
          isOpen={!!chatContext}
          onClose={() => setChatContext(null)}
        />
      ) : null}
    </div>
  );
}
