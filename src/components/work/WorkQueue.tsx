import Link from 'next/link';
import { Card } from '@/components/ui/Card';
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
    <section className="mb-10">
      <h2 className="mb-4 font-heading text-xl font-bold text-foundation-navy">{title}</h2>
      {items.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-concrete-grey">{emptyLabel}</p>
          <LinkButton href={emptyHref} className="mx-auto mt-5">{emptyAction}</LinkButton>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-card border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-steel-blue">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Work</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Next action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.href} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-foundation-navy">
                    <Link href={item.href} className="hover:text-trade-blue">{item.reference}</Link>
                  </td>
                  <td className="px-4 py-3 text-concrete-grey">{item.title}</td>
                  <td className="px-4 py-3 text-concrete-grey">{item.due ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status ?? 'pending'}>{item.action}</StatusBadge>
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
