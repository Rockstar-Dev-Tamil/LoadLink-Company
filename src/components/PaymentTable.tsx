import React from 'react';
import { useTranslation } from 'react-i18next';
import { payments } from '../data/mockData';
import { Download } from 'lucide-react';
import { cn } from '../lib/utils';

export const PaymentTable: React.FC = () => {
  const { t } = useTranslation(['common']);
  return (
    <div className="bg-surface-low rounded-3xl overflow-hidden border border-white/5">
      <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
        <h3 className="text-xl font-bold font-headline">Recent Billing</h3>
        <button className="text-sm font-medium text-cyan-accent hover:underline">View All Statements</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-high/50 text-[10px] uppercase tracking-widest text-white/40 font-bold">
            <tr>
              <th className="px-8 py-4">Shipment ID</th>
              <th className="px-8 py-4">Service Type</th>
              <th className="px-8 py-4">Date</th>
              <th className="px-8 py-4">Amount</th>
              <th className="px-8 py-4">{t('common:nav.payments')}</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-surface-high/30 transition-colors group">
                <td className="px-8 py-5 font-medium">{payment.id}</td>
                <td className="px-8 py-5">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-accent"></div>
                    {payment.service}
                  </span>
                </td>
                <td className="px-8 py-5 text-white/40">{payment.date}</td>
                <td className="px-8 py-5 font-bold">{payment.amount}</td>
                <td className="px-8 py-5">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold border",
                    payment.status === 'Paid' 
                      ? "bg-green-500/10 text-green-400 border-green-500/20" 
                      : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                  )}>
                    {t(`common:status.${payment.status.toLowerCase()}`)}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  {payment.status === 'Pending' ? (
                    <button className="bg-cyan-accent text-background px-4 py-1.5 rounded-xl text-[10px] font-bold hover:opacity-90 transition-opacity uppercase tracking-wider">
                      Pay Now
                    </button>
                  ) : (
                    <button className="text-white/40 hover:text-white transition-colors">
                      <Download size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
