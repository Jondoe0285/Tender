import type { ReactNode } from 'react';

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
      <div className="max-w-2xl">
        {kicker ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-steel-blue">{kicker}</p> : null}
        {title ? <h2 className={`text-lg font-semibold tracking-tight text-foundation-navy ${kicker ? 'mt-1' : ''}`}>{title}</h2> : null}
        {description ? <p className="mt-1 text-sm leading-6 text-foundation-navy">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-steel-blue">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foundation-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-foundation-navy">{hint}</p> : null}
    </div>
  );
}
