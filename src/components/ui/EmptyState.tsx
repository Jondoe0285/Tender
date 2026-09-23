import type { ReactNode } from 'react';

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div role="status" className="rounded-md border border-dashed border-slate-300 bg-white px-5 py-8">
      <p className="text-sm font-semibold text-foundation-navy">{title}</p>
      <p className="mt-1 max-w-xl text-sm leading-6 text-concrete-grey">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
