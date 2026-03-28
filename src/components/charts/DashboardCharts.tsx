import React from 'react';

export type RevenueDatum = {
  label: string;
  value: number;
};

export type LaneMixDatum = {
  label: string;
  value: number;
  color: string;
};

export type ServiceDatum = {
  label: string;
  value: number;
  tone: 'success' | 'info' | 'warning';
};

export function RevenueChart({ data }: { data: RevenueDatum[] }) {
  const max = Math.max(...data.map(d => d.value), 100);
  
  return (
    <div className="flex items-end gap-2 h-36 mt-6">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
          <div 
            className="w-full rounded-[12px] transition-all duration-500 group-hover:filter group-hover:brightness-105 relative border border-white/5"
            style={{
              height: `${(d.value / max) * 100}%`,
              opacity: 0.28 + (i / data.length) * 0.48,
              background: 'linear-gradient(180deg, var(--accent-bright), var(--accent-deep))'
            }}
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--surface-strong)] border border-[var(--border-strong)] px-2 py-1 rounded-[10px] text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-[var(--shadow)]">
              Rs {(d.value / 1000).toFixed(1)}k
            </div>
          </div>
          <span className="text-[10px] font-medium tracking-[-0.01em] opacity-50 group-hover:opacity-100 transition-opacity">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function LaneMixChart({ segments }: { segments: LaneMixDatum[] }) {
  return (
    <div className="space-y-4 mt-6">
      <div className="flex h-3 rounded-full overflow-hidden bg-white/5 border border-white/5 shadow-inner">
        {segments.map(s => (
          <div 
            key={s.label} 
            style={{ width: `${s.value}%`, background: s.color }} 
            className="h-full first:rounded-l-full last:rounded-r-full hover:filter hover:brightness-110 transition-all cursor-pointer"
            title={`${s.label}: ${s.value}%`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {segments.map(s => (
          <div key={s.label} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              <span className="text-[10px] font-medium tracking-[-0.01em] opacity-55">{s.label}</span>
            </div>
            <div className="text-sm font-semibold tracking-[-0.02em]">{s.value}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ServiceChart({ metrics }: { metrics: ServiceDatum[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 mt-6">
      {metrics.map(m => (
        <div key={m.label} className="flex items-center justify-between p-3.5 rounded-[14px] bg-[var(--surface-soft)] border border-[var(--border)] group hover:border-[var(--border-strong)] transition-all">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center text-xs font-semibold ${
              m.tone === 'success'
                ? 'bg-emerald-500/10 text-emerald-400'
                : m.tone === 'warning'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-[var(--accent-soft)] text-[var(--accent)]'
            }`}>
              {m.value}%
            </div>
            <span className="text-[13px] font-medium text-[var(--muted)] group-hover:text-[var(--text)] transition-colors">{m.label}</span>
          </div>
          <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${
               m.tone === 'success'
                 ? 'bg-emerald-500'
                 : m.tone === 'warning'
                   ? 'bg-amber-500'
                   : 'bg-[var(--accent)]'
            }`} style={{ width: `${m.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
