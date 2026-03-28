import React from 'react';
import { useTranslation } from 'react-i18next';

export const BADGE: Record<string, string> = {
  pending:    'bg-amber-500/10 text-amber-300 border border-amber-500/20',
  matched:    'bg-brand-primary/10 text-brand-primary border border-brand-primary/20',
  in_transit: 'bg-sky-500/10   text-sky-300    border border-sky-500/20',
  in_progress:'bg-sky-500/20   text-sky-300    border border-sky-500/30',
  delivered:  'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
  cancelled:  'bg-rose-500/10   text-rose-300   border border-rose-500/20',
  requested:  'bg-amber-500/10 text-amber-300 border border-amber-500/20',
  confirmed:  'bg-brand-primary/10 text-brand-primary border border-brand-primary/20',
  completed:  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  paid:       'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  failed:     'bg-rose-500/20   text-rose-300   border border-rose-500/30',
  active:     'bg-sky-500/20   text-sky-300    border border-sky-500/30',
};

export const DEFAULT_BADGE = 'bg-white/10 text-gray-400 border border-white/10';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation(['common']);
  const styles = BADGE[status] || 'bg-gray-500/15 text-gray-400 border border-gray-500/20';
  
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles}`}>
      {typeof t === 'function' ? t(`common:status.${status}`) : status}
    </span>
  );
}
