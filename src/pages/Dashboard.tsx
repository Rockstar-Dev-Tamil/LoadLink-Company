import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LucideArrowRight, LucidePackage, LucideTrendingUp, LucideZap, LucideShip, LucideShieldCheck } from 'lucide-react';
import { useShipments } from '../hooks/useShipments';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { usePayments } from '../hooks/usePayments';
import { StatusBadge } from '../components/StatusBadge';
import { CardSkeleton, Skeleton } from '../components/Skeleton';
import { useAuthStore } from '../stores/authStore';
import { Topbar } from '../components/Topbar';
import {
  RevenueChart,
  LaneMixChart,
  ServiceChart,
  type LaneMixDatum,
  type RevenueDatum,
  type ServiceDatum,
} from '../components/charts/DashboardCharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation(['dashboard', 'common']);
  const { profile } = useAuthStore();
  const { stats, loading: statsLoading } = useDashboardStats();
  const { shipments, loading: shipmentsLoading } = useShipments();
  const { payments, stats: paymentStats, loading: paymentsLoading } = usePayments();

  const loading = statsLoading || shipmentsLoading || paymentsLoading;

  const recentShipments = useMemo(() => shipments.slice(0, 4), [shipments]);

  const revenueTrend = useMemo<RevenueDatum[]>(() => {
    const recentPayments = [...payments]
      .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
      .slice(-7);

    if (recentPayments.length > 0) {
      return recentPayments.map((payment, index) => ({
        label: `P${index + 1}`,
        value: Number(payment.amount) || 0,
      }));
    }

    return shipments
      .slice(0, 7)
      .reverse()
      .map((shipment, index) => ({
        label: `S${index + 1}`,
        value: Number(shipment.price) || 0,
      }));
  }, [payments, shipments]);

  const laneMix = useMemo<LaneMixDatum[]>(() => {
    if (!shipments.length) {
      return [
        { label: 'Long Haul', value: 0, color: 'var(--accent)' },
        { label: 'Short Haul', value: 0, color: 'var(--success)' },
        { label: 'In-City', value: 0, color: 'var(--warning)' },
      ];
    }

    const bucketCounts = { long: 0, short: 0, city: 0 };

    shipments.forEach((shipment) => {
      const pickupParts = shipment.pickup_address.split(',').map((part) => part.trim()).filter(Boolean);
      const dropParts = shipment.drop_address.split(',').map((part) => part.trim()).filter(Boolean);
      const pickupCity = pickupParts[0]?.toLowerCase();
      const dropCity = dropParts[0]?.toLowerCase();
      const pickupState = pickupParts[pickupParts.length - 1]?.toLowerCase();
      const dropState = dropParts[dropParts.length - 1]?.toLowerCase();

      if (pickupCity && dropCity && pickupCity === dropCity) {
        bucketCounts.city += 1;
      } else if (pickupState && dropState && pickupState === dropState) {
        bucketCounts.short += 1;
      } else {
        bucketCounts.long += 1;
      }
    });

    const total = shipments.length;

    return [
      { label: 'Long Haul', value: Math.round((bucketCounts.long / total) * 100), color: 'var(--accent)' },
      { label: 'Short Haul', value: Math.round((bucketCounts.short / total) * 100), color: 'var(--success)' },
      { label: 'In-City', value: Math.round((bucketCounts.city / total) * 100), color: 'var(--warning)' },
    ];
  }, [shipments]);

  const serviceMetrics = useMemo<ServiceDatum[]>(() => {
    const totalShipments = shipments.length;
    const completionRate = totalShipments ? Math.round((stats.deliveredShipments / totalShipments) * 100) : 0;
    const activeRate = totalShipments ? Math.round((stats.activeShipments / totalShipments) * 100) : 0;
    const paymentEvents = paymentStats.completedPayments + paymentStats.failedCount + (paymentStats.pendingPayments > 0 ? 1 : 0);
    const settlementRate = paymentEvents ? Math.round((paymentStats.completedPayments / paymentEvents) * 100) : 0;

    return [
      { label: 'Completion', value: completionRate, tone: 'success' },
      { label: 'Active Flow', value: activeRate, tone: 'info' },
      { label: 'Settlement', value: settlementRate, tone: paymentStats.failedCount > 0 ? 'warning' : 'success' },
    ];
  }, [paymentStats.completedPayments, paymentStats.failedCount, paymentStats.pendingPayments, shipments.length, stats.activeShipments, stats.deliveredShipments]);

  const isExpiringSoon = useMemo(() => {
    if (!profile?.subscription_expires_at) return false;
    const expires = new Date(profile.subscription_expires_at).getTime();
    const now = new Date().getTime();
    const diffDays = (expires - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays < 7;
  }, [profile?.subscription_expires_at]);

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Topbar title={t('dashboard:sections.overview', 'Overview')} />
        <div className="page-scroll space-y-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="glass-panel space-y-4 p-8">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-16 w-full" count={4} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <Topbar title={
        <div className="flex items-center gap-3">
          <span>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {profile?.name}</span>
          <span className="px-2 py-0.5 rounded-md bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-black uppercase tracking-widest leading-none">
            {profile?.subscription_tier} Plan
          </span>
        </div>
      } />

      <div className="page-scroll space-y-8 no-scrollbar pb-24">
        {isExpiringSoon && (
          <div className="mx-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3 text-amber-200">
              <LucideZap size={18} className="animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wide">
                Your {profile?.subscription_tier} plan expires in {Math.ceil((new Date(profile!.subscription_expires_at!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
            <button onClick={() => navigate('/settings')} className="text-xs font-black uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors">
              Renew Plan →
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 px-6">
          <div className="mini-card group">
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label !mb-0">Active Shipments</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition-transform group-hover:scale-110">
                <LucidePackage className="h-4 w-4" />
              </div>
            </div>
            <div className="metric-value font-mono">{stats.activeShipments}</div>
            <div className="mt-1 text-[10px] font-extrabold uppercase tracking-tighter text-[var(--muted)]">
              {stats.deliveredShipments} routes completed
            </div>
          </div>

          <div className="mini-card group">
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label !mb-0">Pending Matches</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 transition-transform group-hover:scale-110">
                <LucideZap className="h-4 w-4" />
              </div>
            </div>
            <div className="metric-value font-mono">{stats.pendingMatches}</div>
            <div className="mt-1 text-[10px] font-extrabold uppercase tracking-tighter text-[var(--muted)]">
              Suggested live routes
            </div>
          </div>

          <div className="mini-card group">
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label !mb-0">Total Spent</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 transition-transform group-hover:scale-110">
                <LucideTrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="metric-value font-mono">₹{stats.totalSpent?.toLocaleString()}</div>
            <div className="mt-1 text-[10px] font-extrabold uppercase tracking-tighter text-[var(--muted)]">
              Settled payments
            </div>
          </div>

          <div className="mini-card group">
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label !mb-0">CO₂ Saved</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 transition-transform group-hover:scale-110">
                <LucideShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="metric-value font-mono text-sky-400">{Math.round(stats.co2Saved)} kg</div>
            <div className="mt-1 text-[10px] font-extrabold uppercase tracking-tighter text-[var(--muted)]">
              Offset contribution
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.4fr] px-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="section-label">LIVE LANE PULSE</div>
                <h3 className="text-xl font-black">Shipment Flow</h3>
                <p className="muted">Recent activity and pricing across your active routes.</p>
              </div>
              <button onClick={() => navigate('/shipments')} className="primary-button group ring-offset-[var(--bg)] focus:ring-2 ring-[var(--accent)] ring-offset-2">
                <span className="text-xs">Explore Fleet</span>
                <LucideArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            <RevenueChart data={revenueTrend} />
          </div>

          <div className="card">
            <div className="section-label">LANE MIX</div>
            <h3 className="text-xl font-black">Route Diversity</h3>
            <p className="muted">Segment distribution of currently tracked shipments.</p>
          </div>
        </div>

        <div className="px-6 space-y-6">
          <div className="card bg-[var(--surface-strong)] overflow-hidden">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <div className="section-label">ACTIVE SHIFTS</div>
                <h3 className="text-2xl font-black tracking-tight">Recent Shipments</h3>
              </div>
            </div>

            {recentShipments.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-white/[0.02] p-12 text-center">
                <LucideShip className="mx-auto mb-4 h-12 w-12 text-[var(--muted)] opacity-20" />
                <p className="mb-1 text-lg font-bold text-[var(--text)]">No active movements</p>
                <p className="mb-8 text-sm font-medium text-[var(--muted)]">Begin your first route to see live tracking data.</p>
                <button onClick={() => navigate('/shipments')} className="primary-button">
                  Begin First Route
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-white/[0.02]">
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Route</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] text-right">Weight</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Status</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Driver</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Milestone</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] text-right">Price</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {recentShipments.map((shipment) => {
                      const booking = shipment.bookings?.[0];
                      return (
                        <tr 
                          key={shipment.id}
                          className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                          onClick={() => navigate('/tracking')}
                        >
                          <td className="py-5 px-6">
                            <div className="text-[13px] font-bold text-[var(--text)] mb-0.5">
                              {shipment.pickup_address.split(',')[0]} → {shipment.drop_address.split(',')[0]}
                            </div>
                            <div className="text-[9px] font-mono text-[var(--muted)] opacity-60 uppercase">{shipment.id.split('-')[0]}</div>
                          </td>
                          <td className="py-5 px-6 text-right font-mono text-[12px] text-[var(--text)]">
                            {Math.round(shipment.weight_kg)} kg
                          </td>
                          <td className="py-5 px-6">
                            <StatusBadge status={shipment.status} />
                          </td>
                          <td className="py-5 px-6">
                            <div className="text-[12px] font-black uppercase text-[var(--text)]">
                              {booking?.driver?.name || '---'}
                            </div>
                          </td>
                          <td className="py-5 px-6 text-[11px] font-bold text-[var(--accent)] uppercase tracking-wide">
                            {booking?.current_milestone || '---'}
                          </td>
                          <td className="py-5 px-6 text-right font-mono text-[12px] text-[var(--text)]">
                            ₹{Math.round(shipment.price).toLocaleString()}
                          </td>
                          <td className="py-5 px-6 text-right text-[11px] font-bold text-[var(--muted)] uppercase whitespace-nowrap">
                            {new Date(shipment.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 px-6 pb-12">
            <div className="card">
              <div className="section-label">SERVICE QUALITY</div>
              <h3 className="text-xl font-black tracking-tight">Health Metrics</h3>
              <p className="muted">Infrastructure and operational service benchmarks.</p>
              <ServiceChart metrics={serviceMetrics} />
            </div>

            <div className="card bg-[var(--accent)] text-white shadow-[0_20px_40px_rgba(70,127,227,0.3)]">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                  <LucideZap className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black">{Math.round(stats.co2Saved)} kg</div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-80">CO2 OFFSET TARGET</div>
                </div>
              </div>
              <p className="mt-6 text-[11px] font-bold leading-relaxed opacity-90">
                {t('dashboard:sections.green_impact', "Your logistic network has significantly reduced its carbon footprint this month through smarter route consolidation.")}
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}
