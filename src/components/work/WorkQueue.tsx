import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LinkButton } from '@/components/ui/Button';

export type WorkQueueItem = {
  href: string;
  reference: string;
  title: string;
  due?: string;
  action: string;
  status?: 'pending' | 'approved' | 'attention' | 'neutral';
};

export function WorkQueue({
  title,
  items,
  emptyLabel,
  emptyHref,
  emptyAction,
}: {
  title: string;
  items: WorkQueueItem[];
  emptyLabel: string;
  emptyHref: string;
  emptyAction: string;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-foundation-navy">{title}</h2>
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="text-sm text-concrete-grey">{emptyLabel}</p>
          <LinkButton href={emptyHref} className="mx-auto mt-4">{emptyAction}</LinkButton>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-concrete-grey">
              <tr>
                <th className="px-4 py-2.5">Reference</th>
                <th className="px-4 py-2.5">Work</th>
                <th className="px-4 py-2.5">Due</th>
                <th className="px-4 py-2.5">Next action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.href} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80">
                  <td className="px-4 py-2.5 font-semibold tabular-nums text-foundation-navy">
                    <Link href={item.href} className="hover:text-trade-blue">{item.reference}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-concrete-grey">{item.title}</td>
                  <td className="px-4 py-2.5 tabular-nums text-concrete-grey">{item.due ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <Link href={item.href} className="inline-flex min-h-11 items-center">
                      <StatusBadge status={item.status ?? 'pending'}>{item.action}</StatusBadge>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
