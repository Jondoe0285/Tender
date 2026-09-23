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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
      <div className="max-w-2xl">
        {kicker ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-steel-blue">{kicker}</p> : null}
        {title ? <h2 className={`text-lg font-semibold tracking-tight text-foundation-navy ${kicker ? 'mt-1' : ''}`}>{title}</h2> : null}
        {description ? <p className="mt-1.5 text-sm leading-6 text-concrete-grey">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-concrete-grey">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foundation-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-concrete-grey">{hint}</p> : null}
    </div>
  );
}
