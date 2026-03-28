import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LucideArrowRight, LucidePackage, LucideShieldCheck, LucideShip, LucideTrendingUp, LucideZap } from 'lucide-react';
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

const formatCurrency = (value: number) => `\u20B9${Math.round(value).toLocaleString('en-IN')}`;

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { stats, loading: statsLoading } = useDashboardStats();
  const { shipments, loading: shipmentsLoading } = useShipments();
  const { payments, stats: paymentStats, loading: paymentsLoading } = usePayments();

  const loading = statsLoading || shipmentsLoading || paymentsLoading;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

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
        { label: 'Long haul', value: 0, color: 'var(--accent-deep)' },
        { label: 'Regional', value: 0, color: 'var(--success)' },
        { label: 'City', value: 0, color: 'var(--warning)' },
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
      { label: 'Long haul', value: Math.round((bucketCounts.long / total) * 100), color: 'var(--accent-deep)' },
      { label: 'Regional', value: Math.round((bucketCounts.short / total) * 100), color: 'var(--success)' },
      { label: 'City', value: Math.round((bucketCounts.city / total) * 100), color: 'var(--warning)' },
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
      { label: 'Active flow', value: activeRate, tone: 'info' },
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
        <Topbar title="Overview" subtitle="Operations overview, lane performance, and live shipment health." />
        <div className="page-scroll space-y-8">
          <div className="hero-card card premium-hero premium-grid">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-20 w-full" count={2} />
          </div>
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
      <Topbar
        title={
          <div className="flex items-center gap-3 min-w-0">
            <span className="truncate">{greeting}, {profile?.name}</span>
            <span className="px-2.5 py-1 rounded-full bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--muted-strong)] text-[11px] font-medium leading-none shrink-0">
              {profile?.subscription_tier}
            </span>
          </div>
        }
        subtitle="Operations overview, lane performance, and live shipment health."
      />

      <div className="page-scroll space-y-6 sm:space-y-8 no-scrollbar pb-24">
        {isExpiringSoon && (
          <div className="p-4 rounded-[18px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-amber-200">
              <LucideZap size={16} className="opacity-80" />
              <span className="text-[12px] sm:text-[13px] font-medium tracking-[-0.01em]">
                Expires in {Math.ceil((new Date(profile!.subscription_expires_at!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
            <button onClick={() => navigate('/settings')} className="text-[12px] font-medium text-amber-500 hover:text-amber-400 transition-colors shrink-0">
              Renew plan
            </button>
          </div>
        )}

        <section className="hero-card premium-hero premium-grid">
          <div className="relative z-10 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.18fr)_360px]">
            <div className="hero-copy">
              <div className="section-label">Overview</div>
              <h1 className="hero-title max-w-[12ch]">Freight operations, refined for clarity.</h1>
              <p className="hero-description">
                Monitor live shipments, route performance, and settlement health from one calm command surface.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="pill pill--active">{stats.activeShipments} active shipments</span>
                <span className="pill pill--muted">{stats.pendingMatches} matches pending</span>
                <span className="pill pill--muted">{paymentStats.completedPayments} payments settled</span>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={() => navigate('/shipments')} className="primary-button group">
                  <span>Review shipments</span>
                  <LucideArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </button>
                <button onClick={() => navigate('/tracking')} className="ghost-button">
                  Open tracking
                </button>
              </div>
            </div>

            <div className="card dashboard-chart-card !p-5 premium-grid">
              <div className="relative z-10">
                <div className="section-label">Control tower</div>
                <div className="space-y-4">
                  <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <div className="text-[12px] font-medium text-[var(--muted)]">Live network health</div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className="text-3xl font-semibold tracking-[-0.04em]">{Math.max(92, Math.min(99, 90 + stats.deliveredShipments))}%</div>
                      <div className="text-[12px] text-[var(--muted)]">Signals stable</div>
                    </div>
                  </div>
                  <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <div className="text-[12px] font-medium text-[var(--muted)]">Today&apos;s focus</div>
                    <div className="mt-2 text-[15px] font-medium tracking-[-0.02em] text-[var(--text)]">
                      {stats.pendingMatches > 0
                        ? 'Review newly matched capacity and confirm assignments.'
                        : 'Live lanes are stable. Use today to optimize margins and ETAs.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="dashboard-stat p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label !mb-0">Active shipments</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--surface-strong)] border border-[var(--border)] text-[var(--muted-strong)]">
                <LucidePackage className="h-4 w-4" />
              </div>
            </div>
            <div className="metric-value font-mono">{stats.activeShipments}</div>
            <div className="mt-1 text-[12px] text-[var(--muted)]">{stats.deliveredShipments} routes completed</div>
          </div>

          <div className="dashboard-stat p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label !mb-0">Pending matches</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--surface-strong)] border border-[var(--border)] text-[var(--muted-strong)]">
                <LucideZap className="h-4 w-4" />
              </div>
            </div>
            <div className="metric-value font-mono">{stats.pendingMatches}</div>
            <div className="mt-1 text-[12px] text-[var(--muted)]">Suggested live routes</div>
          </div>

          <div className="dashboard-stat p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label !mb-0">Total spent</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--surface-strong)] border border-[var(--border)] text-[var(--muted-strong)]">
                <LucideTrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="metric-value font-mono">{formatCurrency(stats.totalSpent)}</div>
            <div className="mt-1 text-[12px] text-[var(--muted)]">Settled payments</div>
          </div>

          <div className="dashboard-stat p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label !mb-0">CO2 saved</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--surface-strong)] border border-[var(--border)] text-[var(--muted-strong)]">
                <LucideShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="metric-value font-mono">{Math.round(stats.co2Saved)} kg</div>
            <div className="mt-1 text-[12px] text-[var(--muted)]">Offset contribution</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="card dashboard-chart-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="section-label">Revenue pulse</div>
                <h3 className="text-xl font-semibold tracking-[-0.03em]">Shipment flow</h3>
                <p className="muted">Recent activity and pricing across your active routes.</p>
              </div>
              <button onClick={() => navigate('/shipments')} className="ghost-button group">
                <span>Explore fleet</span>
                <LucideArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            <RevenueChart data={revenueTrend} />
          </div>

          <div className="card dashboard-chart-card">
            <div className="section-label">Lane mix</div>
            <h3 className="text-xl font-semibold tracking-[-0.03em]">Route diversity</h3>
            <p className="muted">Segment distribution of currently tracked shipments.</p>
            <LaneMixChart segments={laneMix} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card bg-[var(--surface-strong)] overflow-hidden !p-0 sm:!p-6">
            <div className="p-5 sm:p-0 mb-4 sm:mb-8 flex items-center justify-between">
              <div>
                <div className="section-label">Recent shipments</div>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-[-0.04em]">Latest movement</h3>
              </div>
            </div>

            {recentShipments.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-white/[0.02] p-8 sm:p-12 text-center">
                <LucideShip className="mx-auto mb-4 h-10 sm:h-12 w-10 sm:w-12 text-[var(--muted)] opacity-20" />
                <p className="mb-1 text-base sm:text-lg font-semibold text-[var(--text)]">No active movements</p>
                <p className="mb-6 sm:mb-8 text-[11px] sm:text-sm font-medium text-[var(--muted)]">Begin your first route to see live tracking data.</p>
                <button onClick={() => navigate('/shipments')} className="primary-button">
                  Begin first route
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="dashboard-table w-full text-left min-w-[600px] sm:min-w-0">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-4 px-6 text-[11px] font-medium tracking-[-0.01em] text-[var(--muted)]">Route</th>
                      <th className="py-4 px-6 text-[11px] font-medium tracking-[-0.01em] text-[var(--muted)] text-right">Weight</th>
                      <th className="py-4 px-6 text-[11px] font-medium tracking-[-0.01em] text-[var(--muted)]">Status</th>
                      <th className="py-4 px-6 text-[11px] font-medium tracking-[-0.01em] text-[var(--muted)]">Driver</th>
                      <th className="py-4 px-6 text-[11px] font-medium tracking-[-0.01em] text-[var(--muted)]">Milestone</th>
                      <th className="py-4 px-6 text-[11px] font-medium tracking-[-0.01em] text-[var(--muted)] text-right">Price</th>
                      <th className="py-4 px-6 text-[11px] font-medium tracking-[-0.01em] text-[var(--muted)] text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {recentShipments.map((shipment) => {
                      const booking = shipment.bookings?.[0];
                      return (
                        <tr
                          key={shipment.id}
                          className="group transition-colors cursor-pointer"
                          onClick={() => navigate('/tracking')}
                        >
                          <td className="py-5 px-6">
                            <div className="text-[13px] font-semibold text-[var(--text)] mb-0.5">
                              {shipment.pickup_address.split(',')[0]} {'\u2192'} {shipment.drop_address.split(',')[0]}
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
                            <div className="text-[12px] font-semibold text-[var(--text)]">{booking?.driver?.name || '---'}</div>
                          </td>
                          <td className="py-5 px-6 text-[11px] font-medium text-[var(--muted-strong)] tracking-[-0.01em] capitalize">
                            {booking?.current_milestone || '---'}
                          </td>
                          <td className="py-5 px-6 text-right font-mono text-[12px] text-[var(--text)]">
                            {formatCurrency(shipment.price)}
                          </td>
                          <td className="py-5 px-6 text-right text-[11px] font-medium text-[var(--muted)] whitespace-nowrap">
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 pb-12">
          <div className="card dashboard-chart-card">
            <div className="section-label">Service quality</div>
            <h3 className="text-xl font-semibold tracking-[-0.03em]">Health metrics</h3>
            <p className="muted">Infrastructure and operational service benchmarks.</p>
            <ServiceChart metrics={serviceMetrics} />
          </div>

          <div className="card dashboard-chart-card premium-grid">
            <div className="relative z-10">
              <div className="section-label">Sustainability</div>
              <h3 className="text-xl font-semibold tracking-[-0.03em]">Quiet efficiency gains</h3>
              <p className="muted">Distance trimmed, carbon saved, and fewer empty kilometers across the network.</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="text-[12px] font-medium text-[var(--muted)]">CO2 reduced</div>
                  <div className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                    {Math.round(stats.co2Saved)}
                    <span className="ml-1 text-base font-medium text-[var(--muted)]">kg</span>
                  </div>
                </div>
                <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="text-[12px] font-medium text-[var(--muted)]">Completion rate</div>
                  <div className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                    {shipments.length ? Math.round((stats.deliveredShipments / shipments.length) * 100) : 0}
                    <span className="ml-1 text-base font-medium text-[var(--muted)]">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
