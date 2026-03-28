import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePayments } from '../hooks/usePayments';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { LucideShieldCheck, LucideFilter, LucideCalendar, LucideTrendingUp, LucideWallet, LucideClock, LucideAlertCircle, LucideDownload, LucideCreditCard, LucideArrowRight } from 'lucide-react';
import { Skeleton, CardSkeleton } from '../components/Skeleton';
import { Topbar } from '../components/Topbar';

export default function Payments() {
  const { t } = useTranslation(['payments', 'common']);
  const { payments, loading, stats, filter, setFilter, refetch } = usePayments();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handlePayment = async (paymentId: string) => {
    setProcessingId(paymentId);
    try {
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'paid' })
        .eq('id', paymentId);

      if (error) throw error;
      toast.success(t('payments:toast.success'));
      refetch();
    } catch (err: any) {
      toast.error(err.message || t('payments:toast.failed'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title={t('payments:title')} />

      <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <p className="text-[var(--muted)] text-sm font-medium">{t('payments:subtitle')}</p>
          <div className="flex gap-4">
            <button
              onClick={() => toast.success(t('payments:toast.statement_downloading'))}
              className="secondary-button group flex items-center gap-3"
            >
              <LucideDownload className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              {t('payments:actions.statement')}
            </button>
            <button className="primary-button flex items-center gap-3">
              <LucideCreditCard className="w-4 h-4" />
              {t('common:actions.add_funds', 'Add Funds')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {loading ? (
            <CardSkeleton count={4} />
          ) : (
            <>
              <div className="stat-card group">
                <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-black uppercase tracking-widest mb-4 text-left">
                  <LucideTrendingUp className="w-3.5 h-3.5 text-[var(--accent)]" />
                  {t('payments:stats.totalRevenue')}
                </div>
                <div className="text-3xl font-black text-[var(--text)] mb-2 tracking-tight flex items-baseline gap-1 text-left">
                  <span className="text-sm font-medium text-[var(--muted)]">₹</span>
                  {stats.totalRevenue.toLocaleString()}
                </div>
                <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider text-left">{t('payments:stats.totalRevenue_description')}</p>
              </div>

              <div className="stat-card group">
                <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-black uppercase tracking-widest mb-4 text-left">
                  <LucideClock className="w-3.5 h-3.5 text-amber-400" />
                  {t('payments:stats.pending')}
                </div>
                <div className="text-3xl font-black text-[var(--text)] mb-2 tracking-tight flex items-baseline gap-1 text-left">
                  <span className="text-sm font-medium text-[var(--muted)]">₹</span>
                  {stats.pendingPayments.toLocaleString()}
                </div>
                <p className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider text-left">{t('payments:stats.pending_description')}</p>
              </div>

              <div className="stat-card group">
                <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-black uppercase tracking-widest mb-4 text-left">
                  <LucideWallet className="w-3.5 h-3.5 text-emerald-400" />
                  {t('payments:stats.completed')}
                </div>
                <div className="text-3xl font-black text-[var(--text)] mb-2 tracking-tight flex items-baseline gap-1 text-left">
                  {stats.completedPayments} <span className="text-sm font-medium text-[var(--muted)] uppercase ml-1">{t('common:status.paid')}</span>
                </div>
                <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider text-left">{t('payments:stats.completed_description')}</p>
              </div>

              <div className="stat-card group">
                <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-black uppercase tracking-widest mb-4 text-left">
                  <LucideAlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  {t('payments:stats.failed')}
                </div>
                <div className="text-3xl font-black text-[var(--text)] mb-2 tracking-tight text-left">
                  {stats.failedCount}
                </div>
                <p className="text-[10px] text-rose-400/80 font-bold uppercase tracking-wider text-left">{t('payments:stats.failed_description')}</p>
              </div>
            </>
          )}
        </div>

        <div className="card !p-0 overflow-hidden">
          <div className="p-8 border-b border-[var(--border)] flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[var(--surface-soft)]">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-black text-[var(--text)] uppercase tracking-wider text-left">{t('payments:history')}</h3>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-2 focus-within:border-[var(--accent-soft)] transition-all">
                <LucideFilter className="w-4 h-4 text-[var(--muted)]" />
                <select
                  value={filter.status}
                  onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                  className="bg-transparent text-xs font-black text-[var(--text)] border-none focus:ring-0 cursor-pointer uppercase tracking-widest"
                >
                  <option value="all">{t('payments:filters.all_status')}</option>
                  <option value="paid">{t('common:status.paid')}</option>
                  <option value="pending">{t('common:status.pending')}</option>
                  <option value="failed">{t('common:status.failed')}</option>
                </select>
              </div>

              <div className="flex items-center gap-3 bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-2 focus-within:border-[var(--accent-soft)] transition-all">
                <LucideCalendar className="w-4 h-4 text-[var(--muted)]" />
                <select
                  value={filter.dateRange}
                  onChange={(e) => setFilter({ ...filter, dateRange: e.target.value })}
                  className="bg-transparent text-xs font-black text-[var(--text)] border-none focus:ring-0 cursor-pointer uppercase tracking-widest"
                >
                  <option value="all">{t('payments:filters.all_time')}</option>
                  <option value="7d">{t('payments:filters.last_7_days')}</option>
                  <option value="30d">{t('payments:filters.last_30_days')}</option>
                  <option value="90d">{t('payments:filters.last_90_days')}</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 space-y-6">
              <Skeleton className="h-16 w-full rounded-2xl border border-[var(--border)]" count={5} />
            </div>
          ) : payments.length === 0 ? (
            <div className="p-24 text-center">
              <div className="w-20 h-20 bg-[var(--surface-soft)] rounded-3xl flex items-center justify-center mx-auto mb-6 text-[var(--muted)] border border-[var(--border)]">
                <LucideWallet size={32} />
              </div>
              <h4 className="text-[var(--text)] text-xl font-black mb-2 uppercase tracking-tight">{t('payments:table.no_transactions')}</h4>
              <p className="text-[var(--muted)] text-sm max-w-sm mx-auto leading-relaxed">{t('payments:table.no_transactions_desc')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                    <th className="px-8 py-5 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em]">{t('payments:table.transaction_id')}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em]">{t('payments:table.route')}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em]">{t('payments:table.amount')}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em]">{t('payments:table.security_status')}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] text-right">{t('payments:table.settlement')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--surface-soft)] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="font-mono text-[11px] font-black text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors uppercase tracking-widest text-left">
                          {p.id.split('-')[0]}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-2 text-sm font-black text-[var(--text)]">
                            <span>{p.booking.shipment.pickup_address.split(',')[0]}</span>
                            <LucideArrowRight size={14} className="text-[var(--muted)]" />
                            <span>{p.booking.shipment.drop_address.split(',')[0]}</span>
                          </div>
                          <div className="text-[10px] text-[var(--muted)] font-bold tracking-widest">TS: {new Date(p.created_at).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-[var(--text)] px-3 py-1 bg-[var(--surface-soft)] rounded-lg inline-block border border-[var(--border)]">
                          ₹{p.amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-left">
                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border tracking-[0.1em] ${p.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            p.payment_status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {p.payment_status === 'pending' ? (
                          <button
                            onClick={() => handlePayment(p.id)}
                            disabled={processingId === p.id}
                            className="primary-button !py-2 !px-6 text-[10px] font-black uppercase tracking-widest"
                          >
                            {processingId === p.id ? t('payments:table.processing') : t('payments:table.settle_now')}
                          </button>
                        ) : (
                          <div className="flex items-center justify-end">
                            <LucideShieldCheck className="w-5 h-5 text-emerald-500" />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
