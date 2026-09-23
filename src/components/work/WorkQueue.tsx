import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LinkButton } from '@/components/ui/Button';
import { DataCell, DataRow, DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';

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
  emptyHref?: string;
  emptyAction?: string;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-foundation-navy">{title}</h2>
      {items.length === 0 ? (
        <EmptyState
          title="Nothing in this queue"
          body={emptyLabel}
          action={emptyHref && emptyAction ? <LinkButton href={emptyHref}>{emptyAction}</LinkButton> : undefined}
        />
      ) : (
        <DataTable headers={['Reference', 'Work', 'Due', 'Next action']}>
          {items.map((item) => (
            <DataRow key={item.href}>
              <DataCell strong>
                <Link href={item.href} className="hover:text-trade-blue">{item.reference}</Link>
              </DataCell>
              <DataCell>{item.title}</DataCell>
              <DataCell numeric>{item.due ?? '—'}</DataCell>
              <DataCell>
                <Link href={item.href} className="inline-flex min-h-11 items-center">
                  <StatusBadge status={item.status ?? 'pending'}>{item.action}</StatusBadge>
                </Link>
              </DataCell>
            </DataRow>
          ))}
        </DataTable>
      )}
    </section>
  );
}
