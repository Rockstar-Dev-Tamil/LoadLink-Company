import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  LucideAlertCircle,
  LucideArrowRight,
  LucideCalendar,
  LucideCircleDollarSign,
  LucideClock,
  LucideCreditCard,
  LucideDownload,
  LucideFilter,
  LucideShieldCheck,
  LucideSparkles,
  LucideTrendingUp,
  LucideWallet,
  LucideX,
} from 'lucide-react';

import { Topbar } from '../components/Topbar';
import { Skeleton, CardSkeleton } from '../components/Skeleton';
import { usePayments } from '../hooks/usePayments';
import { supabase } from '../lib/supabase';

const MOCK_FUNDS_STORAGE_KEY = 'loadlink:mock-wallet-balance';

export default function Payments() {
  const { t } = useTranslation(['payments', 'common']);
  const { payments, loading, stats, filter, setFilter, refetch } = usePayments();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState('25000');
  const [fundMethod, setFundMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isFunding, setIsFunding] = useState(false);

  useEffect(() => {
    const rawBalance = window.localStorage.getItem(MOCK_FUNDS_STORAGE_KEY);
    const parsed = rawBalance ? Number(rawBalance) : 0;
    setWalletBalance(Number.isFinite(parsed) ? parsed : 0);
  }, []);

  const settledToday = useMemo(() => {
    const today = new Date();
    return payments
      .filter((payment) => {
        const createdAt = new Date(payment.created_at);
        return payment.payment_status === 'paid'
          && createdAt.getDate() === today.getDate()
          && createdAt.getMonth() === today.getMonth()
          && createdAt.getFullYear() === today.getFullYear();
      })
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }, [payments]);

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

  const handleDownloadStatement = () => {
    const headers = ['transaction_id', 'route', 'amount', 'status', 'payment_method', 'created_at'];
    const rows = payments.map((payment) => ({
      transaction_id: payment.id,
      route: `${payment.booking.shipment.pickup_address.split(',')[0]} -> ${payment.booking.shipment.drop_address.split(',')[0]}`,
      amount: payment.amount,
      status: payment.payment_status,
      payment_method: payment.payment_method ?? '',
      created_at: payment.created_at,
    }));

    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => `"${String(row[header as keyof typeof row] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loadlink-statement-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success('Statement downloaded as CSV.');
  };

  const handleAddFunds = () => {
    const amount = Number(fundAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount first.');
      return;
    }

    setIsFunding(true);
    window.setTimeout(() => {
      const nextBalance = walletBalance + amount;
      window.localStorage.setItem(MOCK_FUNDS_STORAGE_KEY, String(nextBalance));
      setWalletBalance(nextBalance);
      setIsFunding(false);
      setIsGatewayOpen(false);
      toast.success(`Mock gateway approved ₹${amount.toLocaleString()} via ${fundMethod.toUpperCase()}.`);
    }, 1400);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title={t('payments:title')} />

      <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <p className="text-[var(--muted)] text-sm font-medium">{t('payments:subtitle')}</p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleDownloadStatement}
              className="secondary-button group flex items-center gap-3"
            >
              <LucideDownload className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              {t('payments:actions.statement')}
            </button>
            <button
              onClick={() => setIsGatewayOpen(true)}
              className="primary-button flex items-center gap-3"
            >
              <LucideCreditCard className="w-4 h-4" />
              {t('common:actions.add_funds', 'Add Funds')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {loading ? (
            <CardSkeleton count={5} />
          ) : (
            <>
              <div className="stat-card group">
                <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-black uppercase tracking-widest mb-4 text-left">
                  <LucideCircleDollarSign className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Available Funds
                </div>
                <div className="text-3xl font-black text-[var(--text)] mb-2 tracking-tight flex items-baseline gap-1 text-left font-mono">
                  <span className="text-sm font-medium text-[var(--muted)]">₹</span>
                  {walletBalance.toLocaleString()}
                </div>
                <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider text-left">
                  Mock wallet balance for gateway simulation
                </p>
              </div>

              <div className="stat-card group">
                <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-black uppercase tracking-widest mb-4 text-left">
                  <LucideTrendingUp className="w-3.5 h-3.5 text-[var(--accent)]" />
                  {t('payments:stats.totalRevenue')}
                </div>
                <div className="text-3xl font-black text-[var(--text)] mb-2 tracking-tight flex items-baseline gap-1 text-left">
                  <span className="text-sm font-medium text-[var(--muted)]">₹</span>
                  {stats.totalRevenue.toLocaleString()}
                </div>
                <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider text-left">
                  {t('payments:stats.totalRevenue_description')}
                </p>
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
                <p className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider text-left">
                  {t('payments:stats.pending_description')}
                </p>
              </div>

              <div className="stat-card group">
                <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-black uppercase tracking-widest mb-4 text-left">
                  <LucideWallet className="w-3.5 h-3.5 text-emerald-400" />
                  {t('payments:stats.completed')}
                </div>
                <div className="text-3xl font-black text-[var(--text)] mb-2 tracking-tight flex items-baseline gap-1 text-left">
                  {stats.completedPayments} <span className="text-sm font-medium text-[var(--muted)] uppercase ml-1">{t('common:status.paid')}</span>
                </div>
                <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider text-left">
                  {t('payments:stats.completed_description')}
                </p>
              </div>

              <div className="stat-card group">
                <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-black uppercase tracking-widest mb-4 text-left">
                  <LucideSparkles className="w-3.5 h-3.5 text-sky-400" />
                  Settled Today
                </div>
                <div className="text-3xl font-black text-[var(--text)] mb-2 tracking-tight flex items-baseline gap-1 text-left font-mono">
                  <span className="text-sm font-medium text-[var(--muted)]">₹</span>
                  {settledToday.toLocaleString()}
                </div>
                <p className="text-[10px] text-sky-400/80 font-bold uppercase tracking-wider text-left">
                  Paid transactions confirmed today
                </p>
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
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-[var(--surface-soft)] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="font-mono text-[11px] font-black text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors uppercase tracking-widest text-left">
                          {payment.id.split('-')[0]}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-2 text-sm font-black text-[var(--text)]">
                            <span>{payment.booking.shipment.pickup_address.split(',')[0]}</span>
                            <LucideArrowRight size={14} className="text-[var(--muted)]" />
                            <span>{payment.booking.shipment.drop_address.split(',')[0]}</span>
                          </div>
                          <div className="text-[10px] text-[var(--muted)] font-bold tracking-widest">
                            TS: {new Date(payment.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-[var(--text)] px-3 py-1 bg-[var(--surface-soft)] rounded-lg inline-block border border-[var(--border)] font-mono">
                          ₹{payment.amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-left">
                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border tracking-[0.1em] ${
                          payment.payment_status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : payment.payment_status === 'pending'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {payment.payment_status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {payment.payment_status === 'pending' ? (
                          <button
                            onClick={() => handlePayment(payment.id)}
                            disabled={processingId === payment.id}
                            className="primary-button !py-2 !px-6 text-[10px] font-black uppercase tracking-widest"
                          >
                            {processingId === payment.id ? t('payments:table.processing') : t('payments:table.settle_now')}
                          </button>
                        ) : (
                          <div className="flex items-center justify-end">
                            {payment.payment_status === 'paid' ? (
                              <LucideShieldCheck className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <LucideAlertCircle className="w-5 h-5 text-rose-400" />
                            )}
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

      {isGatewayOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-md">
          <div className="w-full max-w-[520px] rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-7 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="section-label">MOCK GATEWAY</div>
                <h3 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[var(--text)]">Add Funds</h3>
                <p className="mt-2 text-[14px] text-[var(--muted)]">
                  This simulates a gateway approval flow and tops up the wallet balance used in demos.
                </p>
              </div>
              <button type="button" onClick={() => setIsGatewayOpen(false)} className="ghost-button !min-h-[44px] !w-[44px] !px-0">
                <LucideX size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Available funds</div>
                <div className="mt-2 font-mono text-[32px] font-semibold tracking-[-0.04em] text-[var(--text)]">₹{walletBalance.toLocaleString()}</div>
              </div>

              <label className="block">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Amount</div>
                <input
                  value={fundAmount}
                  onChange={(event) => setFundAmount(event.target.value.replace(/[^\d]/g, ''))}
                  className="w-full rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-[18px] font-semibold text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                  placeholder="25000"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Method</div>
                <select
                  value={fundMethod}
                  onChange={(event) => setFundMethod(event.target.value as 'upi' | 'card' | 'netbanking')}
                  className="w-full rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-[15px] font-semibold text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="netbanking">Net Banking</option>
                </select>
              </label>

              <div className="rounded-[22px] border border-dashed border-[var(--border)] bg-white/[0.02] p-4 text-[12px] text-[var(--muted)]">
                Demo mode only. No real payment processor is called and no actual charge is made.
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => setIsGatewayOpen(false)} className="ghost-button">
                Cancel
              </button>
              <button type="button" onClick={handleAddFunds} disabled={isFunding} className="primary-button">
                {isFunding ? 'Authorizing...' : 'Approve mock payment'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
