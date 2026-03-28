import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useShipments } from '../hooks/useShipments';
import { Skeleton } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { ChatWindow } from '../components/ChatWindow';
import { Topbar } from '../components/Topbar';
import { MessageSquare, Package, Truck, LucideZap, LucideShip, LucideInfo, LucideHistory, LucideFilter, LucideMapPin } from 'lucide-react';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'active' | 'requested' | 'matched' | 'in_progress' | 'completed' | 'cancelled';

export default function ActiveShipments() {
  const navigate = useNavigate();
  const { t } = useTranslation(['tracking', 'common']);
  const { shipments, loading, error } = useShipments();
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [mobileView, setMobileView] = useState<'selected' | 'fleet'>('selected');

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const visibleShipments = useMemo(() => {
    if (statusFilter === 'all') return shipments;
    if (statusFilter === 'active') {
      return shipments.filter(s => ['requested', 'matched', 'in_progress'].includes(s.bookings?.[0]?.status ?? s.status));
    }
    return shipments.filter(s => (s.bookings?.[0]?.status ?? s.status) === statusFilter);
  }, [shipments, statusFilter]);

  const activeShipment = useMemo(() => {
    if (selectedShipmentId) {
      return visibleShipments.find(s => s.id === selectedShipmentId) || visibleShipments[0];
    }
    return visibleShipments[0];
  }, [visibleShipments, selectedShipmentId]);

  const activeBooking = activeShipment?.bookings?.[0];

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Topbar title={t('tracking:header.title', 'Live Track')} />
        <div className="page-scroll">
          <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-8 h-[calc(100vh-180px)]">
             <Skeleton className="h-full w-full rounded-[32px]" />
             <div className="space-y-6">
               <Skeleton className="h-48 w-full rounded-[32px]" />
               <Skeleton className="h-64 w-full rounded-[32px]" />
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title={t('tracking:header.title', 'Shipments')} subtitle="Status filters, shipment detail, and messaging." />

      <div className="page-scroll pb-24">
        <div className="flex flex-col h-full min-h-0 gap-6 overflow-hidden">
            <div className="card !p-0 overflow-hidden bg-[var(--surface-strong)]">
              <div className="p-6 pb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="section-label">SHIPMENTS</div>
                  <div className="text-2xl font-black tracking-tighter text-[var(--text)]">
                    {visibleShipments.length}{' '}Active View
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] shrink-0">
                  <LucideFilter size={12} />
                  Filters
                </div>
              </div>
              <div className="px-6 pb-6">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'active', label: 'Active' },
                    { id: 'all', label: 'All' },
                    { id: 'requested', label: 'Requested' },
                    { id: 'matched', label: 'Matched' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'cancelled', label: 'Cancelled' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStatusFilter(item.id as StatusFilter)}
                      className={`pill ${statusFilter === item.id ? 'pill--active' : 'pill--muted'} uppercase`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile switcher (same UI, different layout) */}
            {!!activeShipment && (
              <div className="xl:hidden -mt-2">
                <div className="p-1 rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setMobileView('selected')}
                      className={`h-11 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${
                        mobileView === 'selected'
                          ? 'bg-[var(--accent-soft)] text-[var(--text)] border border-[var(--accent)]/20'
                          : 'text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      Selected
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileView('fleet')}
                      className={`h-11 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${
                        mobileView === 'fleet'
                          ? 'bg-[var(--accent-soft)] text-[var(--text)] border border-[var(--accent)]/20'
                          : 'text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      Fleet
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!activeShipment ? (
              <div className="card flex-1 flex flex-col items-center justify-center text-center p-12 glass-panel">
                <div className="w-20 h-20 bg-[var(--surface-soft)] rounded-full flex items-center justify-center mb-6 text-[var(--muted)]">
                  <LucideShip size={40} className="opacity-20" />
                </div>
                <h3 className="text-xl font-black text-[var(--text)] mb-2 uppercase tracking-tight">No shipments yet</h3>
                <p className="text-[11px] text-[var(--muted)] mb-8 font-bold leading-relaxed">Start your first booking to see realtime routes and carrier matches.</p>
                <button onClick={() => navigate('/book')} className="primary-button group">
                  <span className="text-xs uppercase font-black tracking-widest">Book shipment</span>
                  <LucideZap size={14} className="group-hover:text-amber-400 transition-colors" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 min-h-0">
                <div className={`min-w-0 ${mobileView === 'selected' ? '' : 'hidden xl:block'}`}>
                  {/* Active Focus Card */}
                  <div className="card !p-0 overflow-hidden bg-[var(--surface-strong)]">
                    <div className="p-6 pb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="section-label">SELECTED TERMINAL</div>
                        <div className="text-2xl font-black tracking-tighter text-[var(--text)]">
                          {activeShipment.id.split('-')[0].toUpperCase()}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={activeBooking?.status ?? activeShipment.status} />
                      </div>
                    </div>

                    <div className="px-6 space-y-7 pb-6">
                      <div className="relative pl-6 space-y-8 border-l-2 border-dashed border-[var(--border)] ml-2 py-2">
                        <div className="relative">
                          <span className="absolute -left-[19px] top-1 w-4 h-4 rounded-full bg-[var(--accent)] border-4 border-[var(--surface-strong)] z-10 shadow-[0_0_12px_var(--accent-soft)]"></span>
                          <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-1.5">{t('tracking:details.pickup', 'Origin Node')}</div>
                          <div className="text-xs text-[var(--text)] font-black leading-tight break-words">{activeShipment.pickup_address}</div>
                        </div>
                        <div className="relative">
                          <span className="absolute -left-[19px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-[var(--surface-strong)] z-10 shadow-[0_0_12px_rgba(16,185,129,0.3)]"></span>
                          <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-1.5">{t('tracking:details.drop', 'Destination Target')}</div>
                          <div className="text-xs text-[var(--text)] font-black leading-tight break-words">{activeShipment.drop_address}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="min-w-0 bg-[var(--surface-soft)] p-3 rounded-2xl border border-[var(--border)] group hover:border-[var(--border-strong)] transition-all">
                          <div className="text-[8px] font-black text-[var(--muted)] uppercase tracking-widest mb-1 items-center flex gap-1">
                            <Package size={10} /> Payload
                          </div>
                          <div className="text-sm font-black text-[var(--text)]">
                            {activeShipment.weight_kg}{' '}
                            <span className="text-[8px] opacity-40">KG</span>
                          </div>
                        </div>
                        <div className="min-w-0 bg-[var(--surface-soft)] p-3 rounded-2xl border border-[var(--border)] group hover:border-[var(--border-strong)] transition-all">
                          <div className="text-[8px] font-black text-[var(--muted)] uppercase tracking-widest mb-1 items-center flex gap-1">
                            <LucideZap size={10} /> Value
                          </div>
                          <div className="text-sm font-black text-rose-500 font-mono text-right">
                            {'\u20B9'}{Math.round(activeBooking?.agreed_price ?? activeShipment.price).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {activeBooking && (
                        <div className="space-y-3">
                          <div className="p-4 rounded-[22px] bg-[var(--accent)]/[0.03] border border-[var(--accent-soft)]/20 flex items-center justify-between group cursor-pointer hover:bg-[var(--accent-soft)]/5 transition-all">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white shrink-0">
                                <Truck size={18} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[9px] font-black text-[var(--accent)] opacity-60 uppercase tracking-widest">Driver Identity</div>
                                <div className="text-xs font-black text-[var(--text)] truncate">#{activeBooking.driver_id.split('-')[0].toUpperCase()}</div>
                              </div>
                            </div>
                            <LucideInfo size={14} className="text-[var(--accent)] opacity-40 shrink-0" />
                          </div>

                          <button
                            onClick={() => setIsChatOpen(true)}
                            className="w-full py-4.5 bg-[var(--accent)] hover:filter hover:brightness-110 text-white rounded-[22px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-[0_15px_30px_rgba(70,127,227,0.3)]"
                          >
                            <MessageSquare size={18} />
                            <span className="text-[11px] font-black uppercase tracking-widest">Establish Comms</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/tracking?shipment=${activeShipment.id}`)}
                            className="w-full ghost-button !rounded-[22px] !min-h-[52px] flex items-center justify-center gap-3"
                          >
                            <LucideMapPin size={18} />
                            <span className="text-[11px] font-black uppercase tracking-widest">Open Tracking</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fleet List / Terminal Switcher */}
                <div className={`min-w-0 ${mobileView === 'fleet' ? '' : 'hidden xl:block'}`}>
                  {visibleShipments.length > 0 && (
                    <div className="space-y-3 mt-0">
                      <div className="flex items-center justify-between px-2 mb-2">
                        <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">{t('tracking:flow.switch_terminal', 'Fleet Terminal')}</div>
                        <div className="text-[9px] font-black text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-full uppercase tracking-widest">{visibleShipments.length} Nodes</div>
                      </div>
                      <div className="space-y-3">
                        {visibleShipments.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedShipmentId(s.id);
                              setMobileView('selected');
                            }}
                            className={`p-4 rounded-[22px] border cursor-pointer group transition-all duration-340 relative overflow-hidden ${
                              selectedShipmentId === s.id
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)]/[0.08] shadow-[0_10px_20px_rgba(70,127,227,0.1)]'
                                : 'border-[var(--border)] bg-[var(--surface-soft)] hover:border-[var(--border-strong)]'
                            }`}
                          >
                            {selectedShipmentId === s.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)]" />}
                            <div className="flex items-center justify-between mb-2 gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={selectedShipmentId === s.id ? 'live-dot' : 'w-2 h-2 rounded-full bg-[var(--muted)] opacity-30'} />
                                <span className="text-[10px] font-black text-[var(--text)] uppercase truncate">Terminal {s.id.split('-')[0].toUpperCase()}</span>
                              </div>
                              <StatusBadge status={s.status} />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[var(--muted)] font-black uppercase tracking-wider gap-2">
                              <span className="truncate min-w-0">{s.pickup_address.split(',')[0]} <LucideHistory size={10} className="inline rotate-180" /> {s.drop_address.split(',')[0]}</span>
                              <span className="font-mono text-[var(--text)] text-right shrink-0">
                                {'\u20B9'}{Math.round(s.bookings?.[0]?.agreed_price ?? s.price).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>

      {activeBooking && (
        <ChatWindow 
          shipmentId={activeShipment.id}
          driverId={activeBooking.driver_id}
          driverName={`Driver ${activeBooking.driver_id.split('-')[0].toUpperCase()}`}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
}
