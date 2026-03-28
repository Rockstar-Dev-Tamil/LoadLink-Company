import { cn } from '@/lib/utils';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'p-1 rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[0_18px_44px_rgba(0,0,0,0.18)]',
        'backdrop-blur-[18px] saturate-[180%]',
        className,
      )}
      role="tablist"
      aria-label="View switcher"
    >
      <div className="grid grid-cols-2 gap-1">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                'h-11 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all',
                'border border-transparent',
                active
                  ? 'bg-[var(--accent-soft)] text-[var(--text)] border-[var(--accent)]/20 shadow-[0_10px_24px_rgba(70,127,227,0.14)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]/60',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

